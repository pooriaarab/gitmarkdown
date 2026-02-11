'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, GitBranch, Search, Loader2, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/providers/auth-provider';
import { useGitHubRepos } from '@/hooks/use-github';
import { createWorkspace, getUserWorkspaces } from '@/lib/firebase/firestore';
import type { GitHubRepo, Workspace } from '@/types';
import { AppHeader } from '@/components/layout/app-header';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user } = useAuth();
  const { repos, loading: reposLoading, fetchRepos } = useGitHubRepos();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [connecting, setConnecting] = useState<number | null>(null);
  const [installUrl, setInstallUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchRepos();
      getUserWorkspaces(user.uid).then(setWorkspaces);
    }
  }, [user, fetchRepos]);

  useEffect(() => {
    fetch('/api/auth/github-manage-url')
      .then((res) => res.json())
      .then((data) => { if (data.installUrl) setInstallUrl(data.installUrl); })
      .catch(() => {});
  }, []);

  const connectedRepoIds = new Set(workspaces.map((w) => w.repoId));

  const filteredRepos = repos.filter((repo) =>
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnectRepo = async (repo: GitHubRepo) => {
    if (!user) return;
    setConnecting(repo.id);
    try {
      const workspaceId = await createWorkspace({
        repoFullName: repo.full_name,
        repoId: repo.id,
        owner: repo.owner.login,
        repo: repo.name,
        defaultBranch: repo.default_branch,
        members: {
          [user.uid]: { role: 'owner', joinedAt: new Date() },
        },
        syncSettings: {
          autoSync: false,
          syncBranch: repo.default_branch,
          syncInterval: 5,
        },
        lastSyncedCommitSha: null,
      });
      toast.success(`Connected ${repo.full_name}`);
      router.push(`/${repo.owner.login}/${repo.name}`);
    } catch (error) {
      toast.error('Failed to connect repository');
    } finally {
      setConnecting(null);
    }
  };

  const handleOpenWorkspace = (workspace: Workspace) => {
    router.push(`/${workspace.owner}/${workspace.repo}`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AppHeader />
      <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Connect repositories and manage your workspaces.</p>
        </div>

        {/* Connected Workspaces */}
        {workspaces.length > 0 && (
          <div className="mb-10" data-testid="workspaces-section">
            <h2 className="mb-4 text-lg font-semibold">Your Workspaces</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((workspace) => (
                <Card
                  key={workspace.id}
                  data-testid={`workspace-card-${workspace.repo}`}
                  role="link"
                  aria-label={`Open ${workspace.repoFullName} workspace in the editor`}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => handleOpenWorkspace(workspace)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      {workspace.repo}
                    </CardTitle>
                    <CardDescription className="text-xs">{workspace.repoFullName}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {workspace.defaultBranch}
                      </Badge>
                      <span>{Object.keys(workspace.members).length} member(s)</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Repository Selector */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Connect a Repository</h2>
            <div className="flex items-center gap-2">
              {installUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(installUrl, '_blank', 'noopener,noreferrer')}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Repos
                </Button>
              )}
              <Button
                data-testid="refresh-repos-button"
                aria-label="Refresh repository list from GitHub"
                aria-busy={reposLoading}
                variant="outline"
                size="sm"
                onClick={fetchRepos}
                disabled={reposLoading}
              >
                {reposLoading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Refresh
              </Button>
            </div>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="repo-search-input"
                aria-label="Search repositories by name to filter the list below"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {reposLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading repositories from GitHub" role="status">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRepos.map((repo) => {
                const isConnected = connectedRepoIds.has(repo.id);
                return (
                  <div
                    key={repo.id}
                    data-testid={`repo-row-${repo.full_name}`}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{repo.full_name}</span>
                        {repo.private ? (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Globe className="h-3 w-3 text-muted-foreground" />
                        )}
                        {repo.language && (
                          <Badge variant="outline" className="text-xs">
                            {repo.language}
                          </Badge>
                        )}
                      </div>
                      {repo.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{repo.description}</p>
                      )}
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      {isConnected ? (
                        <Badge variant="secondary">Connected</Badge>
                      ) : (
                        <Button
                          data-testid={`connect-repo-${repo.full_name}`}
                          aria-label={`Connect ${repo.full_name} repository to GitMarkdown`}
                          aria-busy={connecting === repo.id}
                          size="sm"
                          onClick={() => handleConnectRepo(repo)}
                          disabled={connecting === repo.id}
                        >
                          {connecting === repo.id ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="mr-2 h-3 w-3" />
                          )}
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredRepos.length === 0 && !reposLoading && (
                <div data-testid="repos-empty-state" role="status" className="py-8 text-center text-muted-foreground">
                  <p>{searchQuery ? 'No repositories match your search.' : 'No repositories found.'}</p>
                  {!searchQuery && installUrl && (
                    <p className="mt-2 text-xs">
                      Install the GitMarkdown app on your repos to see them here.{' '}
                      <button
                        className="text-primary underline underline-offset-2 hover:text-primary/80"
                        onClick={() => window.open(installUrl, '_blank', 'noopener,noreferrer')}
                      >
                        Install on GitHub
                      </button>{' '}
                      then click Refresh.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
