'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { signInWithGitHub } from '@/lib/firebase/auth';
import type { GitHubRepo, GitHubTreeItem, GitHubContent, GitHubCommit, GitHubBranch, GitHubPullRequest, GitHubReviewComment, ActivePR } from '@/types';

// Cooldown so multiple failing API calls don't spam reconnect toasts
let _lastAuthToast = 0;
const AUTH_TOAST_COOLDOWN = 30_000; // 30 seconds

function isGitHubAuthError(status: number, message: string): boolean {
  if (status === 401) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes('bad credentials') ||
    lower.includes('no github token')
  );
}

function isGitHubInstallationError(status: number, message: string): boolean {
  if (status !== 403) return false;
  const lower = message.toLowerCase();
  return lower.includes('resource not accessible');
}

function showReconnectToast() {
  const now = Date.now();
  if (now - _lastAuthToast < AUTH_TOAST_COOLDOWN) return;
  _lastAuthToast = now;

  toast.error('GitHub connection lost', {
    description: 'Your GitHub token may have expired or been revoked.',
    duration: 15_000,
    action: {
      label: 'Reconnect',
      onClick: () => {
        signInWithGitHub()
          .then(() => toast.success('GitHub reconnected'))
          .catch(() => toast.error('Reconnection failed. Try signing out and back in.'));
      },
    },
  });
}

function showInstallationToast() {
  const now = Date.now();
  if (now - _lastAuthToast < AUTH_TOAST_COOLDOWN) return;
  _lastAuthToast = now;

  const slug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
  const installUrl = slug
    ? `https://github.com/apps/${slug}/installations/new`
    : 'https://github.com/settings/installations';

  toast.error('GitHub App not installed on this repository', {
    description: 'Install the GitMarkdown app to access this repo.',
    duration: 15_000,
    action: {
      label: 'Install',
      onClick: () => {
        window.open(installUrl, '_blank', 'noopener,noreferrer');
      },
    },
  });
}

function useGitHubFetch() {
  const { user } = useAuth();

  const fetchWithAuth = useCallback(
    async (url: string, options?: RequestInit) => {
      if (!user) throw new Error('Not authenticated');
      const idToken = await user.getIdToken();
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        const message = error.error || 'Request failed';
        if (isGitHubAuthError(res.status, message)) {
          showReconnectToast();
        } else if (isGitHubInstallationError(res.status, message)) {
          showInstallationToast();
        }
        throw new Error(message);
      }
      return res.json();
    },
    [user]
  );

  return fetchWithAuth;
}

export function useGitHubRepos() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchWithAuth = useGitHubFetch();

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('/api/github/repos');
      setRepos(data);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  const createRepo = useCallback(
    async (name: string, options: { description?: string; isPrivate?: boolean; autoInit?: boolean }) => {
      const data: GitHubRepo = await fetchWithAuth('/api/github/repos', {
        method: 'POST',
        body: JSON.stringify({ name, ...options }),
      });
      setRepos((prev) => [data, ...prev]);
      return data;
    },
    [fetchWithAuth]
  );

  return { repos, loading, fetchRepos, createRepo };
}

export function useGitHubRepo() {
  const fetchWithAuth = useGitHubFetch();

  const fetchRepo = useCallback(
    async (owner: string, repo: string): Promise<GitHubRepo> => {
      return fetchWithAuth(`/api/github/repos?owner=${owner}&repo=${repo}`);
    },
    [fetchWithAuth]
  );

  return { fetchRepo };
}

export function useGitHubTree() {
  const [tree, setTree] = useState<GitHubTreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchWithAuth = useGitHubFetch();

  const fetchTree = useCallback(
    async (owner: string, repo: string, branch?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ owner, repo });
        if (branch) params.set('branch', branch);
        const data = await fetchWithAuth(`/api/github/tree?${params}`);
        setTree(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  return { tree, loading, fetchTree };
}

export function useGitHubContent() {
  const [loading, setLoading] = useState(false);
  const fetchWithAuth = useGitHubFetch();

  const fetchContent = useCallback(
    async (owner: string, repo: string, path: string, ref?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ owner, repo, path });
        if (ref) params.set('ref', ref);
        const data: GitHubContent = await fetchWithAuth(`/api/github/contents?${params}`);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const updateContent = useCallback(
    async (owner: string, repo: string, path: string, content: string, message: string, sha: string, branch?: string) => {
      return fetchWithAuth('/api/github/contents', {
        method: 'PUT',
        body: JSON.stringify({ owner, repo, path, content, message, sha, branch }),
      });
    },
    [fetchWithAuth]
  );

  const createContent = useCallback(
    async (owner: string, repo: string, path: string, content: string, message: string, branch?: string) => {
      return fetchWithAuth('/api/github/contents', {
        method: 'POST',
        body: JSON.stringify({ owner, repo, path, content, message, branch }),
      });
    },
    [fetchWithAuth]
  );

  const deleteContent = useCallback(
    async (owner: string, repo: string, path: string, sha: string, message: string, branch?: string) => {
      return fetchWithAuth('/api/github/contents', {
        method: 'DELETE',
        body: JSON.stringify({ owner, repo, path, sha, message, branch }),
      });
    },
    [fetchWithAuth]
  );

  return { loading, fetchContent, updateContent, createContent, deleteContent };
}

// Module-level cache so commit data persists across sidebar open/close cycles
const _commitsCache = new Map<string, GitHubCommit[]>();

export function useGitHubCommits() {
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchWithAuth = useGitHubFetch();

  const fetchCommits = useCallback(
    async (owner: string, repo: string, path?: string, options?: { includeStats?: boolean }) => {
      const cacheKey = `${owner}/${repo}/${path || ''}`;
      const cached = _commitsCache.get(cacheKey);
      if (cached) {
        setCommits(cached);
      }
      setLoading(!cached);
      try {
        const params = new URLSearchParams({ owner, repo });
        if (path) params.set('path', path);
        if (options?.includeStats) params.set('includeStats', 'true');
        const data: GitHubCommit[] = await fetchWithAuth(`/api/github/commits?${params}`);
        // Preserve existing stats from cache when new data doesn't have them
        if (cached) {
          const existingStats = new Map(
            cached.filter((c) => c.stats).map((c) => [c.sha, c.stats!])
          );
          for (const commit of data) {
            if (!commit.stats && existingStats.has(commit.sha)) {
              commit.stats = existingStats.get(commit.sha);
            }
          }
        }
        _commitsCache.set(cacheKey, data);
        setCommits(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const fetchCommit = useCallback(
    async (owner: string, repo: string, sha: string) => {
      return fetchWithAuth(`/api/github/commits?owner=${owner}&repo=${repo}&commitSha=${sha}`);
    },
    [fetchWithAuth]
  );

  return { commits, loading, fetchCommits, fetchCommit };
}

/** Lightweight pre-fetch that populates the module-level cache without managing state */
export function useCommitsPrefetch() {
  const fetchWithAuth = useGitHubFetch();
  return useCallback(
    async (owner: string, repo: string, path?: string) => {
      const cacheKey = `${owner}/${repo}/${path || ''}`;
      if (_commitsCache.has(cacheKey)) return;
      try {
        const params = new URLSearchParams({ owner, repo });
        if (path) params.set('path', path);
        const data = await fetchWithAuth(`/api/github/commits?${params}`);
        _commitsCache.set(cacheKey, data);
      } catch {
        // Silent fail for pre-fetch
      }
    },
    [fetchWithAuth]
  );
}

export function useGitHubBranches() {
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchWithAuth = useGitHubFetch();

  const fetchBranches = useCallback(
    async (owner: string, repo: string) => {
      setLoading(true);
      try {
        const data = await fetchWithAuth(`/api/github/branches?owner=${owner}&repo=${repo}`);
        setBranches(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const createBranch = useCallback(
    async (owner: string, repo: string, branchName: string, fromSha: string) => {
      return fetchWithAuth('/api/github/branches', {
        method: 'POST',
        body: JSON.stringify({ owner, repo, branchName, fromSha }),
      });
    },
    [fetchWithAuth]
  );

  return { branches, loading, fetchBranches, createBranch };
}

// Module-level cache for collaborators
const _collaboratorsCache = new Map<string, { login: string; avatar_url: string; id: number }[]>();

export function useGitHubCollaborators() {
  const [collaborators, setCollaborators] = useState<{ login: string; avatar_url: string; id: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchWithAuth = useGitHubFetch();

  const fetchCollaborators = useCallback(
    async (owner: string, repo: string) => {
      const cacheKey = `${owner}/${repo}`;
      const cached = _collaboratorsCache.get(cacheKey);
      if (cached) {
        setCollaborators(cached);
        return cached;
      }
      setLoading(true);
      try {
        const data = await fetchWithAuth(`/api/github/collaborators?owner=${owner}&repo=${repo}`);
        _collaboratorsCache.set(cacheKey, data);
        setCollaborators(data);
        return data;
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  return { collaborators, loading, fetchCollaborators };
}

export interface CompareFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'changed';
  additions: number;
  deletions: number;
  patch?: string;
}

export interface CompareCommit {
  sha: string;
  message: string;
}

export interface CompareResult {
  files: CompareFile[];
  commits: CompareCommit[];
  totalCommits: number;
  aheadBy: number;
}

export function useGitHubCompare() {
  const [compareData, setCompareData] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchWithAuth = useGitHubFetch();

  const fetchCompare = useCallback(
    async (owner: string, repo: string, base: string, head: string) => {
      setLoading(true);
      setCompareData(null);
      try {
        const params = new URLSearchParams({ owner, repo, base, head });
        const data: CompareResult = await fetchWithAuth(`/api/github/compare?${params}`);
        setCompareData(data);
        return data;
      } catch {
        setCompareData(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  return { compareData, compareLoading: loading, fetchCompare };
}

// Module-level cache for open PRs with TTL
const _openPRsCache = new Map<string, { data: GitHubPullRequest[]; timestamp: number }>();
const PR_CACHE_TTL = 60_000; // 60 seconds

export function useGitHubOpenPRs() {
  const [prs, setPrs] = useState<GitHubPullRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchWithAuth = useGitHubFetch();
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const fetchOpenPRs = useCallback(
    async (owner: string, repo: string, forceRefresh?: boolean) => {
      // Check cache unless forced
      const cacheKey = `${owner}/${repo}`;
      if (!forceRefresh) {
        const cached = _openPRsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < PR_CACHE_TTL) {
          if (mountedRef.current) {
            setPrs(cached.data);
            setError(null);
          }
          return cached.data;
        }
      }

      // Abort any previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (mountedRef.current) {
        setLoading(true);
        setError(null);
      }
      try {
        const data: GitHubPullRequest[] = await fetchWithAuth(
          `/api/github/pulls?owner=${owner}&repo=${repo}&state=open`
        );
        if (controller.signal.aborted) return prs;
        // Sort by updated_at descending
        data.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        _openPRsCache.set(cacheKey, { data, timestamp: Date.now() });
        if (mountedRef.current) {
          setPrs(data);
        }
        return data;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return prs;
        const message = err instanceof Error ? err.message : 'Failed to fetch pull requests';
        if (mountedRef.current) {
          setError(message);
          setPrs([]);
        }
        return [];
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [fetchWithAuth, prs]
  );

  return { prs, loading, error, fetchOpenPRs };
}

export function useGitHubPulls() {
  const [loading, setLoading] = useState(false);
  const fetchWithAuth = useGitHubFetch();

  const createPR = useCallback(
    async (owner: string, repo: string, title: string, body: string, head: string, base: string) => {
      setLoading(true);
      try {
        return await fetchWithAuth('/api/github/pulls', {
          method: 'POST',
          body: JSON.stringify({ owner, repo, title, body, head, base }),
        });
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  const fetchPRForBranch = useCallback(
    async (owner: string, repo: string, branchName: string): Promise<ActivePR | null> => {
      try {
        const pulls = await fetchWithAuth(
          `/api/github/pulls?owner=${owner}&repo=${repo}&state=open`
        );
        const match = (pulls as { number: number; head: { ref: string; sha: string }; base: { ref: string }; html_url: string }[])
          .find((p) => p.head.ref === branchName);
        if (!match) return null;
        return {
          number: match.number,
          headSha: match.head.sha,
          baseRef: match.base.ref,
          htmlUrl: match.html_url,
        };
      } catch {
        return null;
      }
    },
    [fetchWithAuth]
  );

  return { loading, createPR, fetchPRForBranch };
}

export function useGitHubReviewComments() {
  const fetchWithAuth = useGitHubFetch();

  const listComments = useCallback(
    async (owner: string, repo: string, pullNumber: number, path?: string) => {
      const params = new URLSearchParams({
        owner,
        repo,
        pullNumber: String(pullNumber),
      });
      if (path) params.set('path', path);
      return fetchWithAuth(
        `/api/github/review-comments?${params}`
      ) as Promise<GitHubReviewComment[]>;
    },
    [fetchWithAuth]
  );

  const createComment = useCallback(
    async (
      owner: string,
      repo: string,
      pullNumber: number,
      body: string,
      commitId: string,
      path: string,
      line: number,
      startLine?: number
    ) => {
      return fetchWithAuth('/api/github/review-comments', {
        method: 'POST',
        body: JSON.stringify({ owner, repo, pullNumber, body, commitId, path, line, startLine }),
      }) as Promise<GitHubReviewComment>;
    },
    [fetchWithAuth]
  );

  const replyToComment = useCallback(
    async (
      owner: string,
      repo: string,
      pullNumber: number,
      inReplyTo: number,
      body: string
    ) => {
      return fetchWithAuth('/api/github/review-comments', {
        method: 'POST',
        body: JSON.stringify({ owner, repo, pullNumber, inReplyTo, body }),
      }) as Promise<GitHubReviewComment>;
    },
    [fetchWithAuth]
  );

  const updateComment = useCallback(
    async (owner: string, repo: string, commentId: number, body: string) => {
      return fetchWithAuth('/api/github/review-comments', {
        method: 'PUT',
        body: JSON.stringify({ owner, repo, commentId, body }),
      }) as Promise<GitHubReviewComment>;
    },
    [fetchWithAuth]
  );

  const deleteComment = useCallback(
    async (owner: string, repo: string, commentId: number) => {
      return fetchWithAuth('/api/github/review-comments', {
        method: 'DELETE',
        body: JSON.stringify({ owner, repo, commentId }),
      });
    },
    [fetchWithAuth]
  );

  return { listComments, createComment, replyToComment, updateComment, deleteComment };
}
