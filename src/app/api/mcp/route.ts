import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

import { authenticateRequest } from '@/lib/auth/api-auth';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { createOctokitClient } from '@/lib/github/client';
import { listUserRepos } from '@/lib/github/repos';
import {
  getRepoTree,
  getFileContent,
  updateFileContent,
  createFile,
  deleteFile,
} from '@/lib/github/contents';
import { listBranches } from '@/lib/github/branches';
import { listPullRequests, createPullRequest } from '@/lib/github/pulls';
import { getAdminDb } from '@/lib/firebase/admin';

// Max file size allowed for read_file (10 MB)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// MCP error response helper
// ---------------------------------------------------------------------------
function mcpError(message: string) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
    isError: true as const,
  };
}

// ---------------------------------------------------------------------------
// GitHub API rate-limit detection
// ---------------------------------------------------------------------------
function handleGitHubError(err: unknown) {
  if (
    err &&
    typeof err === 'object' &&
    'status' in err &&
    (err as { status: number }).status === 403 &&
    'response' in err
  ) {
    const response = (err as { response: { headers: Record<string, string> } }).response;
    if (response?.headers?.['x-ratelimit-remaining'] === '0') {
      const resetEpoch = response.headers['x-ratelimit-reset'];
      const resetAt = resetEpoch
        ? new Date(Number(resetEpoch) * 1000).toISOString()
        : 'unknown';
      return mcpError(
        `GitHub API rate limit exceeded. Resets at ${resetAt}. Please wait and retry.`,
      );
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Input validation helper
// ---------------------------------------------------------------------------
function validateRequired(fields: Record<string, unknown>): string | null {
  for (const [name, value] of Object.entries(fields)) {
    if (typeof value !== 'string' || value.trim() === '') {
      return `"${name}" must be a non-empty string`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helper: get Octokit from the authInfo.extra stashed by the request handler
// ---------------------------------------------------------------------------
function getOctokitFromExtra(extra: { authInfo?: { extra?: Record<string, unknown> } }) {
  const githubToken = extra.authInfo?.extra?.githubToken as string | undefined;
  if (!githubToken) {
    throw new Error('Unauthorized: no GitHub token');
  }
  return createOctokitClient(githubToken);
}

// ---------------------------------------------------------------------------
// Build a fresh MCP server with all tool registrations
// ---------------------------------------------------------------------------
function buildMcpServer(): McpServer {
  const mcp = new McpServer({
    name: 'gitmarkdown',
    version: '1.0.0',
  });

  // -- list_repos --------------------------------------------------------
  mcp.tool(
    'list_repos',
    'List GitHub repositories accessible to the authenticated user',
    {},
    async (_args, extra) => {
      try {
        const octokit = getOctokitFromExtra(extra);
        const repos = await listUserRepos(octokit);
        const result = repos.map((r) => ({
          owner: r.owner.login,
          repo: r.name,
          defaultBranch: r.default_branch,
        }));
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const rateErr = handleGitHubError(err);
        if (rateErr) return rateErr;
        return mcpError(err instanceof Error ? err.message : 'Failed to list repos');
      }
    },
  );

  // -- list_files --------------------------------------------------------
  mcp.tool(
    'list_files',
    'List files in a GitHub repository using the git tree',
    {
      owner: z.string(),
      repo: z.string(),
      branch: z.string().optional(),
    },
    async (args, extra) => {
      try {
        const invalid = validateRequired({ owner: args.owner, repo: args.repo });
        if (invalid) return mcpError(invalid);

        const octokit = getOctokitFromExtra(extra);
        const tree = await getRepoTree(octokit, args.owner, args.repo, args.branch ?? 'main');
        const result = tree.map((t) => ({
          path: t.path,
          type: t.type,
          sha: t.sha,
          size: t.size,
        }));
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const rateErr = handleGitHubError(err);
        if (rateErr) return rateErr;
        return mcpError(err instanceof Error ? err.message : 'Failed to list files');
      }
    },
  );

  // -- read_file ---------------------------------------------------------
  mcp.tool(
    'read_file',
    'Read a file\'s content from a GitHub repository',
    {
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      branch: z.string().optional(),
    },
    async (args, extra) => {
      try {
        const invalid = validateRequired({ owner: args.owner, repo: args.repo, path: args.path });
        if (invalid) return mcpError(invalid);

        const octokit = getOctokitFromExtra(extra);
        const file = await getFileContent(octokit, args.owner, args.repo, args.path, args.branch);

        // Guard against extremely large files that could cause OOM
        if (file.size > MAX_FILE_SIZE_BYTES) {
          return mcpError(
            `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 10 MB.`,
          );
        }

        const decoded =
          file.encoding === 'base64'
            ? Buffer.from(file.content, 'base64').toString('utf-8')
            : file.content;
        const result = { path: file.path, content: decoded, sha: file.sha, encoding: 'utf-8' };
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const rateErr = handleGitHubError(err);
        if (rateErr) return rateErr;
        return mcpError(err instanceof Error ? err.message : 'Failed to read file');
      }
    },
  );

  // -- write_file --------------------------------------------------------
  mcp.tool(
    'write_file',
    'Create or update a UTF-8 text file in a GitHub repository. Binary files are not supported. Provide sha for updates.',
    {
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      content: z.string(),
      message: z.string(),
      sha: z.string().optional(),
      branch: z.string().optional(),
    },
    async (args, extra) => {
      try {
        const invalid = validateRequired({ owner: args.owner, repo: args.repo, path: args.path });
        if (invalid) return mcpError(invalid);

        const octokit = getOctokitFromExtra(extra);
        let result;
        if (args.sha) {
          const r = await updateFileContent(
            octokit, args.owner, args.repo, args.path,
            args.content, args.message, args.sha, args.branch,
          );
          result = { path: args.path, sha: r.sha, commit_sha: r.commitSha };
        } else {
          const r = await createFile(
            octokit, args.owner, args.repo, args.path,
            args.content, args.message, args.branch,
          );
          result = { path: args.path, sha: r.sha, commit_sha: r.commitSha };
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const rateErr = handleGitHubError(err);
        if (rateErr) return rateErr;
        return mcpError(err instanceof Error ? err.message : 'Failed to write file');
      }
    },
  );

  // -- delete_file -------------------------------------------------------
  mcp.tool(
    'delete_file',
    'Delete a file from a GitHub repository',
    {
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      sha: z.string(),
      message: z.string(),
      branch: z.string().optional(),
    },
    async (args, extra) => {
      try {
        const invalid = validateRequired({
          owner: args.owner, repo: args.repo, path: args.path, sha: args.sha,
        });
        if (invalid) return mcpError(invalid);

        const octokit = getOctokitFromExtra(extra);
        await deleteFile(
          octokit, args.owner, args.repo, args.path,
          args.sha, args.message, args.branch,
        );
        return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true }) }] };
      } catch (err) {
        const rateErr = handleGitHubError(err);
        if (rateErr) return rateErr;
        return mcpError(err instanceof Error ? err.message : 'Failed to delete file');
      }
    },
  );

  // -- list_branches -----------------------------------------------------
  mcp.tool(
    'list_branches',
    'List branches in a GitHub repository',
    {
      owner: z.string(),
      repo: z.string(),
    },
    async (args, extra) => {
      try {
        const invalid = validateRequired({ owner: args.owner, repo: args.repo });
        if (invalid) return mcpError(invalid);

        const octokit = getOctokitFromExtra(extra);
        const branches = await listBranches(octokit, args.owner, args.repo);
        const result = branches.map((b) => ({
          name: b.name,
          commit_sha: b.commit.sha,
          protected: b.protected,
        }));
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const rateErr = handleGitHubError(err);
        if (rateErr) return rateErr;
        return mcpError(err instanceof Error ? err.message : 'Failed to list branches');
      }
    },
  );

  // -- list_pulls --------------------------------------------------------
  mcp.tool(
    'list_pulls',
    'List pull requests in a GitHub repository',
    {
      owner: z.string(),
      repo: z.string(),
      state: z.enum(['open', 'closed', 'all']).optional(),
    },
    async (args, extra) => {
      try {
        const invalid = validateRequired({ owner: args.owner, repo: args.repo });
        if (invalid) return mcpError(invalid);

        const octokit = getOctokitFromExtra(extra);
        const prs = await listPullRequests(
          octokit, args.owner, args.repo,
          args.state ?? 'open',
        );
        const result = prs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          head_ref: pr.head.ref,
          base_ref: pr.base.ref,
          html_url: pr.html_url,
        }));
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        const rateErr = handleGitHubError(err);
        if (rateErr) return rateErr;
        return mcpError(err instanceof Error ? err.message : 'Failed to list pull requests');
      }
    },
  );

  // -- create_pull -------------------------------------------------------
  mcp.tool(
    'create_pull',
    'Create a pull request in a GitHub repository',
    {
      owner: z.string(),
      repo: z.string(),
      title: z.string(),
      body: z.string(),
      head: z.string(),
      base: z.string(),
    },
    async (args, extra) => {
      try {
        const invalid = validateRequired({
          owner: args.owner, repo: args.repo, title: args.title,
          head: args.head, base: args.base,
        });
        if (invalid) return mcpError(invalid);

        const octokit = getOctokitFromExtra(extra);
        const pr = await createPullRequest(
          octokit, args.owner, args.repo,
          args.title, args.body, args.head, args.base,
        );
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ number: pr.number, html_url: pr.html_url }),
          }],
        };
      } catch (err) {
        const rateErr = handleGitHubError(err);
        if (rateErr) return rateErr;
        return mcpError(err instanceof Error ? err.message : 'Failed to create pull request');
      }
    },
  );

  // -- search_files ------------------------------------------------------
  mcp.tool(
    'search_files',
    'Search for files by name pattern in a GitHub repository',
    {
      owner: z.string(),
      repo: z.string(),
      query: z.string(),
      branch: z.string().optional(),
    },
    async (args, extra) => {
      try {
        const invalid = validateRequired({ owner: args.owner, repo: args.repo, query: args.query });
        if (invalid) return mcpError(invalid);

        const octokit = getOctokitFromExtra(extra);
        const tree = await getRepoTree(
          octokit, args.owner, args.repo,
          args.branch ?? 'main',
        );
        const queryLower = args.query.toLowerCase();
        const matches = tree
          .filter((t) => t.type === 'blob' && t.path.toLowerCase().includes(queryLower))
          .map((t) => t.path);
        return { content: [{ type: 'text' as const, text: JSON.stringify(matches) }] };
      } catch (err) {
        const rateErr = handleGitHubError(err);
        if (rateErr) return rateErr;
        return mcpError(err instanceof Error ? err.message : 'Failed to search files');
      }
    },
  );

  // -- list_comments -----------------------------------------------------
  mcp.tool(
    'list_comments',
    'List comments on files in a repository (stored in Firestore). Path is required to avoid needing a composite Firestore index.',
    {
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
    },
    async (args, extra) => {
      try {
        const invalid = validateRequired({ owner: args.owner, repo: args.repo, path: args.path });
        if (invalid) return mcpError(invalid);

        // Verify the user has access to this repo via GitHub
        const octokit = getOctokitFromExtra(extra);
        try {
          await octokit.rest.repos.get({
            owner: args.owner,
            repo: args.repo,
          });
        } catch {
          return mcpError('Repository not found or access denied');
        }

        const repoFullName = `${args.owner}/${args.repo}`;
        // Query scoped to a specific file path — avoids the need for a
        // composite Firestore index on [repoFullName, createdAt].
        const snapshot = await (await getAdminDb())
          .collection('comments')
          .where('repoFullName', '==', repoFullName)
          .where('filePath', '==', args.path)
          .orderBy('createdAt', 'desc')
          .limit(100)
          .get();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const comments = snapshot.docs.map((doc: any) => {
          const d = doc.data();
          return {
            id: doc.id,
            filePath: d.filePath,
            author: d.author?.displayName ?? d.author?.githubUsername ?? 'unknown',
            content: d.content,
            type: d.type,
            status: d.status,
            anchorText: d.anchorText,
            createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
          };
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(comments) }] };
      } catch (err) {
        const rateErr = handleGitHubError(err);
        if (rateErr) return rateErr;
        return mcpError(err instanceof Error ? err.message : 'Failed to list comments');
      }
    },
  );

  return mcp;
}

// ---------------------------------------------------------------------------
// Request handler: authenticate, create transport, process MCP request
// ---------------------------------------------------------------------------

async function handleMcpRequest(request: Request): Promise<Response> {
  // Authenticate first
  const auth = await authenticateRequest(request);
  if (!auth) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized' },
        id: null,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Rate limit: 60 requests/minute per user
  const rateLimited = checkRateLimit(auth.userId, { maxTokens: 60, refillRate: 1 });
  if (rateLimited) return rateLimited;

  // Create a per-request MCP server + transport (stateless mode)
  const mcp = buildMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    // undefined = stateless mode — no session tracking between requests
    sessionIdGenerator: undefined,
    // Return JSON responses instead of SSE streams
    enableJsonResponse: true,
  });

  await mcp.connect(transport);

  try {
    const response = await transport.handleRequest(request, {
      authInfo: {
        token: auth.githubToken || '',
        clientId: auth.userId,
        scopes: [],
        extra: { githubToken: auth.githubToken },
      },
    });
    return response;
  } finally {
    await transport.close();
    await mcp.close();
  }
}

// ---------------------------------------------------------------------------
// Next.js route exports (POST for MCP calls, GET for SSE, DELETE for session)
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  try {
    return await handleMcpRequest(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MCP request failed';
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message },
        id: null,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    return await handleMcpRequest(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MCP request failed';
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message },
        id: null,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    return await handleMcpRequest(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MCP request failed';
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32603, message },
        id: null,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
