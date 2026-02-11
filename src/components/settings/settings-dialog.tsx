'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Settings, Type, Bot, Timer, Monitor, Sun, Moon, Minus, Plus, Key, Webhook, Copy, Trash2, Loader2, Plug, FileText, Pencil, Github, RefreshCw, CheckCircle2, XCircle, Eye, EyeOff, AlertTriangle, ChevronsUpDown, ExternalLink, Building2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSettingsStore, type CustomSnippet } from '@/stores/settings-store';
import { CODE_THEME_PAIRS, type CodeThemeKey } from '@/lib/editor/shiki';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { signInWithGitHub } from '@/lib/firebase/auth';
import type { User } from 'firebase/auth';
import type { AIProvider } from '@/types';

const AI_MODELS: Record<AIProvider, { value: string; label: string; description?: string }[]> = {
  anthropic: [
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6', description: 'Most capable, extended thinking' },
    { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5', description: 'Best balance of speed and intelligence' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', description: 'Fast and affordable' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: 'Previous generation' },
  ],
  openai: [
    { value: 'gpt-4.1', label: 'GPT-4.1', description: 'Smartest non-reasoning, 1M context' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Fast and affordable' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', description: 'Most cost-efficient' },
    { value: 'o3', label: 'o3', description: 'Advanced reasoning' },
    { value: 'o4-mini', label: 'o4-mini', description: 'Fast reasoning, strong at coding' },
    { value: 'o3-mini', label: 'o3-mini', description: 'Efficient reasoning' },
    { value: 'gpt-4o', label: 'GPT-4o', description: 'Previous gen multimodal' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Previous gen fast' },
  ],
};

export type SettingsTab = 'general' | 'editor' | 'ai' | 'auto-save' | 'snippets' | 'integrations';
type Tab = SettingsTab;

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'editor', label: 'Editor', icon: Type },
  { id: 'ai', label: 'AI', icon: Bot },
  { id: 'auto-save', label: 'Auto-Save', icon: Timer },
  { id: 'snippets', label: 'Snippets', icon: FileText },
  { id: 'integrations', label: 'API', icon: Plug },
];

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
}) {
  const display = format ? format(value) : String(value);
  const canDecrement = value - step >= min - 0.001;
  const canIncrement = value + step <= max + 0.001;

  const decrement = () => {
    if (canDecrement) {
      const next = Math.round((value - step) * 100) / 100;
      onChange(Math.max(min, next));
    }
  };

  const increment = () => {
    if (canIncrement) {
      const next = Math.round((value + step) * 100) / 100;
      onChange(Math.min(max, next));
    }
  };

  return (
    <div className="inline-flex items-center rounded-md border">
      <Button
        variant="ghost"
        size="icon-xs"
        className="h-8 w-8 rounded-r-none border-r"
        onClick={decrement}
        disabled={!canDecrement}
      >
        <Minus className="size-3" />
      </Button>
      <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">
        {display}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="h-8 w-8 rounded-l-none border-l"
        onClick={increment}
        disabled={!canIncrement}
      >
        <Plus className="size-3" />
      </Button>
    </div>
  );
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: Tab;
}

export function SettingsDialog({ open, onOpenChange, initialTab }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? 'general');

  // Switch to initialTab when dialog opens
  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="settings-dialog" className="w-[95vw] h-[85vh] sm:max-w-2xl sm:h-[min(600px,85vh)] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Configure your GitMarkdown preferences
          </DialogDescription>
        </DialogHeader>
        <Separator className="mt-4 shrink-0" />
        <div className="flex flex-col sm:flex-row min-h-0 flex-1">
          {/* Tab navigation */}
          <nav className="flex sm:flex-col sm:w-44 shrink-0 overflow-x-auto sm:overflow-x-visible gap-1 sm:gap-0.5 p-2 sm:border-r border-b sm:border-b-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  data-testid={`settings-tab-${tab.id}`}
                  aria-label={`${tab.label} settings`}
                  aria-selected={activeTab === tab.id}
                  role="tab"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                    'sm:w-full',
                    activeTab === tab.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Content area */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'editor' && <EditorSettings />}
            {activeTab === 'ai' && <AISettings />}
            {activeTab === 'auto-save' && <AutoSaveSettings />}
            {activeTab === 'snippets' && <SnippetsSettings />}
            {activeTab === 'integrations' && <IntegrationsSettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GitHubConnectionSection() {
  const { user } = useAuth();
  const [status, setStatus] = useState<{
    loading: boolean;
    connected: boolean;
    username?: string;
    avatarUrl?: string;
    name?: string;
    error?: string;
  }>({ loading: true, connected: false });
  const [reconnecting, setReconnecting] = useState(false);
  const [installUrl, setInstallUrl] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    if (!user) {
      setStatus({ loading: false, connected: false, error: 'Not signed in' });
      return;
    }
    setStatus((s) => ({ ...s, loading: true }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/auth/github-status', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      setStatus({ loading: false, ...data });
    } catch {
      setStatus({ loading: false, connected: false, error: 'Failed to check connection' });
    }
  }, [user]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    fetch('/api/auth/github-manage-url')
      .then((res) => res.json())
      .then((data) => { if (data.installUrl) setInstallUrl(data.installUrl); })
      .catch(() => {});
  }, []);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await signInWithGitHub();
      toast.success('GitHub reconnected');
      checkConnection();
    } catch {
      toast.error('Reconnection failed. Try signing out and back in.');
    } finally {
      setReconnecting(false);
    }
  };

  const handleConfigureAccess = () => {
    if (installUrl) {
      window.open(installUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div>
      <h3 className="text-sm font-medium mb-1">GitHub</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Your GitHub account connection status
      </p>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div className="flex items-center gap-3">
          {status.loading ? (
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          ) : status.connected && status.avatarUrl ? (
            <img
              src={status.avatarUrl}
              alt={status.username || 'GitHub avatar'}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Github className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div>
            {status.loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Checking connection...</span>
              </div>
            ) : status.connected ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{status.name || status.username}</span>
                  <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                </div>
                {status.name && status.username && (
                  <p className="text-xs text-muted-foreground">@{status.username}</p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Not connected</span>
                <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800 dark:bg-red-950">
                  <XCircle className="h-3 w-3" />
                  Disconnected
                </Badge>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReconnect}
            disabled={reconnecting || status.loading}
          >
            {reconnecting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {status.connected ? 'Re-authorize' : 'Connect'}
          </Button>
        </div>
      </div>
      {!status.loading && !status.connected && status.error && (
        <p className="mt-2 text-xs text-muted-foreground">{status.error}</p>
      )}

      {/* Repository Access */}
      {status.connected && installUrl && (
        <div className="mt-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Repository Access
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Install GitMarkdown on additional repos or organizations
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleConfigureAccess}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Configure Access
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            After installing on new repos, click &ldquo;Refresh&rdquo; on the dashboard to see them.
          </p>
        </div>
      )}
    </div>
  );
}

function GeneralSettings() {
  const { setTheme } = useTheme();
  const storeTheme = useSettingsStore((s) => s.theme);
  const setStoreTheme = useSettingsStore((s) => s.setTheme);
  const pullOnOpen = useSettingsStore((s) => s.pullOnOpen);
  const setPullOnOpen = useSettingsStore((s) => s.setPullOnOpen);

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    setStoreTheme(value);
    setTheme(value);
  };

  return (
    <div className="space-y-6">
      <GitHubConnectionSection />

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-1">Theme</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Choose your preferred appearance
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'light' as const, label: 'Light', icon: Sun },
            { value: 'dark' as const, label: 'Dark', icon: Moon },
            { value: 'system' as const, label: 'System', icon: Monitor },
          ].map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => handleThemeChange(option.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-md border p-3 text-sm transition-colors',
                  storeTheme === option.value
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border hover:bg-accent/50'
                )}
              >
                <Icon className="h-5 w-5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Pull on open */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="pull-on-open">Pull on open</Label>
          <p className="text-xs text-muted-foreground">
            Automatically pull the latest changes when you open a file
          </p>
        </div>
        <Switch
          id="pull-on-open"
          checked={pullOnOpen}
          onCheckedChange={setPullOnOpen}
        />
      </div>
    </div>
  );
}

function EditorSettings() {
  const editorFontSize = useSettingsStore((s) => s.editorFontSize);
  const setEditorFontSize = useSettingsStore((s) => s.setEditorFontSize);
  const editorLineHeight = useSettingsStore((s) => s.editorLineHeight);
  const setEditorLineHeight = useSettingsStore((s) => s.setEditorLineHeight);
  const showLineNumbers = useSettingsStore((s) => s.showLineNumbers);
  const setShowLineNumbers = useSettingsStore((s) => s.setShowLineNumbers);
  const codeTheme = useSettingsStore((s) => s.codeTheme);
  const setCodeTheme = useSettingsStore((s) => s.setCodeTheme);

  return (
    <div className="space-y-6">
      {/* App Theme */}
      <div className="space-y-2">
        <Label>Theme</Label>
        <Select value={codeTheme} onValueChange={(v) => setCodeTheme(v as CodeThemeKey)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CODE_THEME_PAIRS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Colors the entire app UI and code highlighting (auto-adapts to light/dark mode)
        </p>
      </div>

      <Separator />

      {/* Font Size */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Font size</Label>
          <p className="text-xs text-muted-foreground">
            Adjust the editor font size (12px - 24px)
          </p>
        </div>
        <NumberStepper
          value={editorFontSize}
          onChange={setEditorFontSize}
          min={12}
          max={24}
          step={1}
          format={(v) => `${v}px`}
        />
      </div>

      <Separator />

      {/* Line Height */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Line height</Label>
          <p className="text-xs text-muted-foreground">
            Adjust the spacing between lines (1.0 - 2.5)
          </p>
        </div>
        <NumberStepper
          value={editorLineHeight}
          onChange={setEditorLineHeight}
          min={1.0}
          max={2.5}
          step={0.1}
          format={(v) => v.toFixed(1)}
        />
      </div>

      <Separator />

      {/* Show Line Numbers */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="line-numbers">Show line numbers</Label>
          <p className="text-xs text-muted-foreground">
            Display line numbers in the editor gutter
          </p>
        </div>
        <Switch
          id="line-numbers"
          checked={showLineNumbers}
          onCheckedChange={setShowLineNumbers}
        />
      </div>
    </div>
  );
}

function APIKeyInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="pr-9 font-mono text-xs"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {value && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onChange('')}
            aria-label={`Clear ${label}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ModelPicker({
  models,
  value,
  onChange,
}: {
  models: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedModel = models.find((m) => m.value === value);

  return (
    <div className="space-y-2">
      <Label>Default AI model</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">
              {selectedModel?.label || 'Select model...'}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search models..." />
            <CommandList>
              <CommandEmpty>No model found.</CommandEmpty>
              <CommandGroup>
                {models.map((model) => (
                  <CommandItem
                    key={model.value}
                    value={`${model.label} ${model.description || ''}`}
                    onSelect={() => {
                      onChange(model.value);
                      setOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className={cn(
                        'text-sm',
                        model.value === value && 'font-medium'
                      )}>
                        {model.label}
                      </span>
                      {model.description && (
                        <span className="text-[11px] text-muted-foreground">
                          {model.description}
                        </span>
                      )}
                    </div>
                    {model.value === value && (
                      <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        Search or select the default model for the selected provider
      </p>
    </div>
  );
}

function AISettings() {
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const setAIProvider = useSettingsStore((s) => s.setAIProvider);
  const aiModel = useSettingsStore((s) => s.aiModel);
  const setAIModel = useSettingsStore((s) => s.setAIModel);
  const tabCompletionsEnabled = useSettingsStore((s) => s.tabCompletionsEnabled);
  const setTabCompletionsEnabled = useSettingsStore((s) => s.setTabCompletionsEnabled);
  const userAnthropicKey = useSettingsStore((s) => s.userAnthropicKey);
  const setUserAnthropicKey = useSettingsStore((s) => s.setUserAnthropicKey);
  const userOpenAIKey = useSettingsStore((s) => s.userOpenAIKey);
  const setUserOpenAIKey = useSettingsStore((s) => s.setUserOpenAIKey);

  const availableModels = AI_MODELS[aiProvider] || [];

  const handleProviderChange = (value: string) => {
    const provider = value as AIProvider;
    setAIProvider(provider);
    const models = AI_MODELS[provider];
    if (models && models.length > 0) {
      setAIModel(models[0].value);
    }
  };

  return (
    <div className="space-y-6">
      {/* API Keys */}
      <div>
        <h3 className="text-sm font-medium mb-1">Your API Keys</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Add your own API keys to use AI features. Keys are stored locally in your browser only.
        </p>
        <div className="space-y-3">
          <APIKeyInput
            label="Anthropic API Key"
            value={userAnthropicKey}
            onChange={setUserAnthropicKey}
            placeholder="sk-ant-..."
          />
          <APIKeyInput
            label="OpenAI API Key"
            value={userOpenAIKey}
            onChange={setUserOpenAIKey}
            placeholder="sk-..."
          />
        </div>
        <div className="flex items-start gap-2 mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            Keys are stored in your browser&apos;s local storage and sent directly to the AI provider.
            They are never saved on our servers.
          </p>
        </div>
      </div>

      <Separator />

      {/* AI Provider */}
      <div className="space-y-2">
        <Label>Default AI provider</Label>
        <Select value={aiProvider} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anthropic">Anthropic</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose the default AI provider for suggestions and completions
        </p>
      </div>

      <Separator />

      {/* AI Model */}
      <ModelPicker
        models={availableModels}
        value={aiModel}
        onChange={setAIModel}
      />

      <Separator />

      {/* Tab completions */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="tab-completions">Tab completions</Label>
          <p className="text-xs text-muted-foreground">
            Show AI-powered writing suggestions as you type. Press Tab to accept.
          </p>
        </div>
        <Switch
          id="tab-completions"
          checked={tabCompletionsEnabled}
          onCheckedChange={setTabCompletionsEnabled}
        />
      </div>
    </div>
  );
}

function AutoSaveSettings() {
  const autoCommitDelay = useSettingsStore((s) => s.autoCommitDelay);
  const setAutoCommitDelay = useSettingsStore((s) => s.setAutoCommitDelay);
  const saveStrategy = useSettingsStore((s) => s.saveStrategy);
  const setSaveStrategy = useSettingsStore((s) => s.setSaveStrategy);
  const autoBranchPrefix = useSettingsStore((s) => s.autoBranchPrefix);
  const setAutoBranchPrefix = useSettingsStore((s) => s.setAutoBranchPrefix);
  const commitOnClose = useSettingsStore((s) => s.commitOnClose);
  const setCommitOnClose = useSettingsStore((s) => s.setCommitOnClose);
  const filePattern = useSettingsStore((s) => s.filePattern);
  const setFilePattern = useSettingsStore((s) => s.setFilePattern);
  const commitValidationLevel = useSettingsStore((s) => s.commitValidationLevel);
  const setCommitValidationLevel = useSettingsStore((s) => s.setCommitValidationLevel);
  const excludeBranches = useSettingsStore((s) => s.excludeBranches);
  const setExcludeBranches = useSettingsStore((s) => s.setExcludeBranches);
  const aiCommitMessages = useSettingsStore((s) => s.aiCommitMessages);
  const setAiCommitMessages = useSettingsStore((s) => s.setAiCommitMessages);
  const autoCreatePR = useSettingsStore((s) => s.autoCreatePR);
  const setAutoCreatePR = useSettingsStore((s) => s.setAutoCreatePR);
  const autoCreatePRTitle = useSettingsStore((s) => s.autoCreatePRTitle);
  const setAutoCreatePRTitle = useSettingsStore((s) => s.setAutoCreatePRTitle);

  const isAutoCommitEnabled = autoCommitDelay > 0;

  const handleToggleAutoCommit = (enabled: boolean) => {
    if (enabled) {
      setAutoCommitDelay(30);
    } else {
      setAutoCommitDelay(0);
    }
  };

  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      setAutoCommitDelay(val);
    }
  };

  // Use local string state so the user can type commas freely;
  // only parse to array on blur
  const [excludeBranchesInput, setExcludeBranchesInput] = useState(
    excludeBranches.join(', ')
  );

  const handleExcludeBranchesBlur = useCallback(() => {
    const branches = excludeBranchesInput
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
    setExcludeBranches(branches);
  }, [excludeBranchesInput, setExcludeBranches]);

  return (
    <div className="space-y-6">
      {/* Enable Auto-Commit */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="auto-commit">Enable auto-commit</Label>
          <p className="text-xs text-muted-foreground">
            Automatically commit changes after a period of inactivity
          </p>
        </div>
        <Switch
          id="auto-commit"
          checked={isAutoCommitEnabled}
          onCheckedChange={handleToggleAutoCommit}
        />
      </div>

      <Separator />

      {/* Auto-Commit Delay */}
      <div className="space-y-2">
        <Label htmlFor="commit-delay">Auto-commit delay (seconds)</Label>
        <Input
          id="commit-delay"
          type="number"
          min={1}
          max={300}
          value={isAutoCommitEnabled ? autoCommitDelay : ''}
          onChange={handleDelayChange}
          disabled={!isAutoCommitEnabled}
          className="w-24"
        />
        <p className="text-xs text-muted-foreground">
          Time to wait after last edit before auto-committing (1-300 seconds)
        </p>
      </div>

      <Separator />

      {/* Save Strategy */}
      <div className="space-y-3">
        <Label>Save strategy</Label>
        <div className="space-y-2">
          <button
            onClick={() => setSaveStrategy('main')}
            className={cn(
              'flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors',
              saveStrategy === 'main'
                ? 'border-primary bg-accent'
                : 'border-border hover:bg-accent/50'
            )}
          >
            <div className={cn(
              'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2',
              saveStrategy === 'main' ? 'border-primary bg-primary' : 'border-muted-foreground'
            )} />
            <div>
              <p className="font-medium">Save to current branch</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Commits are saved directly to the branch you&apos;re working on
              </p>
            </div>
          </button>
          <button
            onClick={() => setSaveStrategy('branch')}
            className={cn(
              'flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors',
              saveStrategy === 'branch'
                ? 'border-primary bg-accent'
                : 'border-border hover:bg-accent/50'
            )}
          >
            <div className={cn(
              'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2',
              saveStrategy === 'branch' ? 'border-primary bg-primary' : 'border-muted-foreground'
            )} />
            <div>
              <p className="font-medium">Save to auto-created branch</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Creates a new branch for each editing session
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Branch options (only shown when branch strategy selected) */}
      {saveStrategy === 'branch' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="branch-prefix">Branch name prefix</Label>
            <Input
              id="branch-prefix"
              value={autoBranchPrefix}
              onChange={(e) => setAutoBranchPrefix(e.target.value)}
              placeholder="gitmarkdown-auto/"
              className="w-56"
            />
            <p className="text-xs text-muted-foreground">
              Branches will be named like <code className="rounded bg-muted px-1 py-0.5 text-xs">{autoBranchPrefix}2024-01-15-1430</code>
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-create-pr">Auto-create pull request</Label>
              <p className="text-xs text-muted-foreground">
                Automatically open a PR after the first commit to the auto-created branch
              </p>
            </div>
            <Switch
              id="auto-create-pr"
              checked={autoCreatePR}
              onCheckedChange={setAutoCreatePR}
            />
          </div>

          {autoCreatePR && (
            <div className="space-y-2">
              <Label htmlFor="pr-title">PR title template</Label>
              <Input
                id="pr-title"
                value={autoCreatePRTitle}
                onChange={(e) => setAutoCreatePRTitle(e.target.value)}
                placeholder="Auto-save changes from GitMarkdown"
              />
              <p className="text-xs text-muted-foreground">
                Title for the automatically created pull request
              </p>
            </div>
          )}
        </>
      )}

      <Separator />

      {/* Commit on close */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="commit-on-close">Commit on close</Label>
          <p className="text-xs text-muted-foreground">
            Automatically save unsaved changes when you leave the page
          </p>
        </div>
        <Switch
          id="commit-on-close"
          checked={commitOnClose}
          onCheckedChange={setCommitOnClose}
        />
      </div>

      <Separator />

      {/* File pattern */}
      <div className="space-y-2">
        <Label htmlFor="file-pattern">File pattern</Label>
        <Input
          id="file-pattern"
          value={filePattern}
          onChange={(e) => setFilePattern(e.target.value)}
          placeholder="**/*.md"
          className="w-56"
        />
        <p className="text-xs text-muted-foreground">
          Glob pattern for files to auto-commit (e.g. **/*.md)
        </p>
      </div>

      <Separator />

      {/* Commit validation level */}
      <div className="space-y-2">
        <Label>Commit validation level</Label>
        <Select
          value={commitValidationLevel}
          onValueChange={(v) => setCommitValidationLevel(v as 'none' | 'warning' | 'error')}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Only auto-commit when the file has no problems at or above this level
        </p>
      </div>

      <Separator />

      {/* Exclude branches */}
      <div className="space-y-2">
        <Label htmlFor="exclude-branches">Exclude branches</Label>
        <Input
          id="exclude-branches"
          value={excludeBranchesInput}
          onChange={(e) => setExcludeBranchesInput(e.target.value)}
          onBlur={handleExcludeBranchesBlur}
          placeholder="main, production"
        />
        <p className="text-xs text-muted-foreground">
          Branches where auto-commit is disabled (comma-separated)
        </p>
      </div>

      <Separator />

      {/* AI commit messages */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="ai-commit-messages">AI commit messages</Label>
          <p className="text-xs text-muted-foreground">
            Use AI to generate descriptive commit messages instead of timestamps
          </p>
        </div>
        <Switch
          id="ai-commit-messages"
          checked={aiCommitMessages}
          onCheckedChange={setAiCommitMessages}
        />
      </div>
    </div>
  );
}

function SnippetsSettings() {
  const customSnippets = useSettingsStore((s) => s.customSnippets);
  const addSnippet = useSettingsStore((s) => s.addSnippet);
  const updateSnippet = useSettingsStore((s) => s.updateSnippet);
  const removeSnippet = useSettingsStore((s) => s.removeSnippet);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [trigger, setTrigger] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [triggerError, setTriggerError] = useState('');

  const validateTrigger = useCallback(
    (value: string, excludeId?: string) => {
      if (!value.trim()) {
        return 'Trigger is required';
      }
      if (!/^[a-zA-Z0-9]+$/.test(value)) {
        return 'Only letters and numbers allowed';
      }
      const exists = customSnippets.some(
        (s) => s.trigger === value && s.id !== excludeId
      );
      if (exists) {
        return 'Trigger already exists';
      }
      return '';
    },
    [customSnippets]
  );

  const resetForm = () => {
    setTrigger('');
    setTitle('');
    setContent('');
    setTriggerError('');
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    const error = validateTrigger(trigger, editingId ?? undefined);
    if (error) {
      setTriggerError(error);
      return;
    }
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    if (editingId) {
      updateSnippet(editingId, { trigger, title, content });
      toast.success('Snippet updated');
    } else {
      addSnippet({
        id: crypto.randomUUID(),
        trigger,
        title,
        content,
      });
      toast.success('Snippet created');
    }
    resetForm();
  };

  const handleEdit = (snippet: CustomSnippet) => {
    setEditingId(snippet.id);
    setTrigger(snippet.trigger);
    setTitle(snippet.title);
    setContent(snippet.content);
    setTriggerError('');
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    removeSnippet(id);
    toast.success('Snippet deleted');
    if (editingId === id) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-1">Custom Snippets</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Create reusable text snippets accessible via the slash command menu. Type /{'{trigger}'} to insert.
        </p>
      </div>

      {/* Snippet form */}
      {showForm ? (
        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="snippet-trigger">Trigger</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/</span>
              <Input
                id="snippet-trigger"
                data-testid="snippet-trigger"
                value={trigger}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                  setTrigger(val);
                  setTriggerError(validateTrigger(val, editingId ?? undefined));
                }}
                placeholder="sig"
                className="flex-1"
                maxLength={30}
              />
            </div>
            {triggerError && (
              <p className="text-xs text-destructive">{triggerError}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="snippet-title">Title</Label>
            <Input
              id="snippet-title"
              data-testid="snippet-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Email Signature"
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="snippet-content">Content</Label>
            <Textarea
              id="snippet-content"
              data-testid="snippet-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="The text that will be inserted..."
              className="min-h-[80px] text-sm font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="save-snippet"
              size="sm"
              onClick={handleSave}
              disabled={!trigger.trim() || !title.trim() || !content.trim() || !!triggerError}
            >
              {editingId ? 'Update' : 'Create'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetForm}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          data-testid="add-snippet"
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Snippet
        </Button>
      )}

      {/* Snippet list */}
      {customSnippets.length === 0 && !showForm ? (
        <p className="text-xs text-muted-foreground py-2">No snippets yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {customSnippets.map((snippet) => (
            <div
              key={snippet.id}
              data-testid={`snippet-${snippet.id}`}
              className={cn(
                'rounded-md border px-3 py-2 text-sm',
                editingId === snippet.id && 'border-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium flex-1 truncate">{snippet.title}</span>
                <code className="text-xs text-muted-foreground shrink-0">/{snippet.trigger}</code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  data-testid={`edit-snippet-${snippet.id}`}
                  aria-label={`Edit snippet ${snippet.title}`}
                  onClick={() => handleEdit(snippet)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  data-testid={`delete-snippet-${snippet.id}`}
                  aria-label={`Delete snippet ${snippet.title}`}
                  onClick={() => handleDelete(snippet.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono">
                {snippet.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const WEBHOOK_EVENTS = [
  'file.changed',
  'pr.opened',
  'comment.created',
  'sync.completed',
  '*',
] as const;

/* ---------- API & Integrations Tab ---------- */

interface ApiKeyItem {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  createdAt: string;
}

function IntegrationsSettings() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Please sign in to access API integrations.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ApiKeysSection user={user} />
      <Separator />
      <WebhooksSection user={user} />
      <Separator />
      <SSESection />
      <Separator />
      <MCPSection />
    </div>
  );
}

/* ---------- Section 1: API Keys ---------- */

function ApiKeysSection({ user }: { user: User }) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const getAuthHeader = useCallback(async () => {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  const fetchKeys = useCallback(async () => {
    const headers = await getAuthHeader();
    setLoading(true);
    try {
      const res = await fetch('/api/settings/api-keys', { headers });
      if (res.status === 429) {
        toast.error('Rate limit exceeded. Please try again in a moment.');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!label.trim()) return;
    const headers = await getAuthHeader();
    setCreating(true);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() }),
      });
      if (res.status === 429) {
        toast.error('Rate limit exceeded. Please try again in a moment.');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setLabel('');
        setShowForm(false);
        toast.success('API key created');
        fetchKeys();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create API key');
      }
    } catch {
      toast.error('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const headers = await getAuthHeader();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/settings/api-keys?id=${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.status === 429) {
        toast.error('Rate limit exceeded. Please try again in a moment.');
        return;
      }
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        toast.success('API key revoked');
      } else {
        toast.error('Failed to revoke API key');
      }
    } catch {
      toast.error('Failed to revoke API key');
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div>
      <h3 className="text-sm font-medium mb-1">API Keys</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Generate keys to access GitMarkdown via API
      </p>

      {/* New key reveal */}
      {newKey && (
        <div className="mb-3 rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-2">
            Copy now — you won't see this again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all select-all">
              {newKey}
            </code>
            <Button
              variant="ghost"
              size="icon-xs"
              data-testid="copy-new-api-key"
              aria-label="Copy API key"
              onClick={() => copyToClipboard(newKey)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => setNewKey(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Generate button / form */}
      {showForm ? (
        <div className="flex items-center gap-2 mb-3">
          <Input
            data-testid="api-key-label-input"
            aria-label="API key label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Key label (e.g. My agent key)"
            className="flex-1"
            maxLength={100}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setShowForm(false); setLabel(''); }
            }}
          />
          <Button
            data-testid="confirm-create-api-key"
            aria-label="Create API key"
            size="sm"
            onClick={handleCreate}
            disabled={creating || !label.trim()}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Cancel"
            onClick={() => { setShowForm(false); setLabel(''); }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          data-testid="generate-api-key"
          aria-label="Generate new API key"
          variant="outline"
          size="sm"
          className="mb-3"
          onClick={() => setShowForm(true)}
          disabled={keys.length >= 5}
        >
          <Key className="h-3.5 w-3.5 mr-1.5" />
          Generate New Key
        </Button>
      )}

      {keys.length >= 5 && !showForm && (
        <p className="text-xs text-muted-foreground mb-2">Maximum of 5 keys reached</p>
      )}

      {/* Key list */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading keys...
        </div>
      ) : keys.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No API keys yet</p>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div
              key={k.id}
              data-testid={`api-key-${k.id}`}
              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <code className="text-xs text-muted-foreground shrink-0">{k.prefix}...</code>
              <div className="flex-1 min-w-0">
                <span className="block truncate text-xs" title={k.label}>{k.label}</span>
                {k.lastUsedAt && (
                  <span className="block text-[10px] text-muted-foreground">
                    Last used {relativeTime(k.lastUsedAt)}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{relativeTime(k.createdAt)}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                data-testid={`delete-api-key-${k.id}`}
                aria-label={`Revoke API key ${k.label}`}
                onClick={() => setConfirmDeleteId(k.id)}
                disabled={deletingId === k.id}
              >
                {deletingId === k.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDeleteId) handleDelete(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Section 2: Webhooks ---------- */

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function WebhooksSection({ user }: { user: User }) {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const urlValid = useMemo(() => isValidUrl(url.trim()), [url]);
  const urlIsInsecure = useMemo(() => {
    if (!urlValid) return false;
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'http:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
    } catch {
      return false;
    }
  }, [url, urlValid]);

  const getAuthHeader = useCallback(async () => {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  const fetchWebhooks = useCallback(async () => {
    const headers = await getAuthHeader();
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks', { headers });
      if (res.status === 429) {
        toast.error('Rate limit exceeded. Please try again in a moment.');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch {
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) => {
      if (prev.includes(event)) {
        return prev.filter((e) => e !== event);
      }
      if (event === '*') {
        return ['*'];
      }
      return [...prev.filter((e) => e !== '*'), event];
    });
  };

  const handleCreate = async () => {
    if (!url.trim() || !urlValid || selectedEvents.length === 0) return;
    const headers = await getAuthHeader();
    setCreating(true);
    try {
      const body: Record<string, unknown> = { url: url.trim(), events: selectedEvents };
      if (secret.trim()) body.secret = secret.trim();
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        toast.error('Rate limit exceeded. Please try again in a moment.');
        return;
      }
      if (res.ok) {
        toast.success('Webhook registered');
        setUrl('');
        setSecret('');
        setSelectedEvents([]);
        setShowForm(false);
        fetchWebhooks();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to register webhook');
      }
    } catch {
      toast.error('Failed to register webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const headers = await getAuthHeader();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/webhooks?id=${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.status === 429) {
        toast.error('Rate limit exceeded. Please try again in a moment.');
        return;
      }
      if (res.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
        toast.success('Webhook deleted');
      } else {
        toast.error('Failed to delete webhook');
      }
    } catch {
      toast.error('Failed to delete webhook');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <h3 className="text-sm font-medium mb-1">Webhooks</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Receive HTTP callbacks when events occur
      </p>

      {showForm ? (
        <div className="space-y-3 mb-3 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="webhook-url">Callback URL</Label>
            <Input
              id="webhook-url"
              data-testid="webhook-url-input"
              aria-label="Webhook callback URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://agent.example.com/callback"
            />
            {url.trim() && !urlValid && (
              <p className="text-xs text-destructive">Please enter a valid URL</p>
            )}
            {urlIsInsecure && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Consider using HTTPS for production webhooks
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Events</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEBHOOK_EVENTS.map((event) => (
                <button
                  key={event}
                  data-testid={`webhook-event-${event}`}
                  aria-label={`Toggle event ${event}`}
                  aria-pressed={selectedEvents.includes(event)}
                  onClick={() => toggleEvent(event)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                    selectedEvents.includes(event)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-accent/50'
                  )}
                >
                  {event === '*' ? 'all' : event}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="webhook-secret">Secret (optional)</Label>
            <Input
              id="webhook-secret"
              data-testid="webhook-secret-input"
              aria-label="Webhook HMAC secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="HMAC signing secret"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-testid="confirm-create-webhook"
              aria-label="Register webhook"
              size="sm"
              onClick={handleCreate}
              disabled={creating || !url.trim() || !urlValid || selectedEvents.length === 0}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Register'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Cancel"
              onClick={() => {
                setShowForm(false);
                setUrl('');
                setSecret('');
                setSelectedEvents([]);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          data-testid="register-webhook"
          aria-label="Register new webhook"
          variant="outline"
          size="sm"
          className="mb-3"
          onClick={() => setShowForm(true)}
        >
          <Webhook className="h-3.5 w-3.5 mr-1.5" />
          Register Webhook
        </Button>
      )}

      {/* Webhook list */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading webhooks...
        </div>
      ) : webhooks.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No webhooks registered</p>
      ) : (
        <div className="space-y-2">
          {webhooks.map((w) => (
            <div
              key={w.id}
              data-testid={`webhook-${w.id}`}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate text-xs font-mono" title={w.url}>
                  {w.url}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  data-testid={`delete-webhook-${w.id}`}
                  aria-label={`Delete webhook ${w.url}`}
                  onClick={() => setConfirmDeleteId(w.id)}
                  disabled={deletingId === w.id}
                >
                  {deletingId === w.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {w.events.map((e) => (
                  <Badge key={e} variant="secondary" className="text-[10px]">
                    {e === '*' ? 'all' : e}
                  </Badge>
                ))}
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                  {relativeTime(w.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmDeleteId) handleDelete(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Section 3: SSE ---------- */

function SSESection() {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const sseEndpoint = '/api/events?owner={owner}&repo={repo}';
  const sseExampleQuery = `// Option 1: Pass API key as query parameter
const es = new EventSource(
  '/api/events?owner=you&repo=my-repo&apiKey=YOUR_KEY'
);
es.onmessage = (e) => console.log(JSON.parse(e.data));`;

  const sseExampleFetch = `// Option 2: Use fetch() with custom headers
const res = await fetch('/api/events?owner=you&repo=my-repo', {
  headers: { 'X-API-Key': 'YOUR_KEY' },
});
const reader = res.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}`;

  return (
    <div>
      <h3 className="text-sm font-medium mb-1">Real-Time Events (SSE)</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Subscribe to live events via Server-Sent Events
      </p>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Endpoint</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 rounded bg-muted px-2 py-1.5 text-xs break-all">
              {sseEndpoint}
            </code>
            <Button
              variant="ghost"
              size="icon-xs"
              data-testid="copy-sse-endpoint"
              aria-label="Copy SSE endpoint"
              onClick={() => copyToClipboard(sseEndpoint)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs">Option 1: Query parameter</Label>
          <div className="flex items-start gap-2 mt-1">
            <pre className="flex-1 rounded bg-muted px-2 py-1.5 text-[11px] leading-relaxed overflow-x-auto">
              {sseExampleQuery}
            </pre>
            <Button
              variant="ghost"
              size="icon-xs"
              className="mt-1"
              data-testid="copy-sse-example-query"
              aria-label="Copy SSE query param example"
              onClick={() => copyToClipboard(sseExampleQuery)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs">Option 2: fetch() with headers</Label>
          <div className="flex items-start gap-2 mt-1">
            <pre className="flex-1 rounded bg-muted px-2 py-1.5 text-[11px] leading-relaxed overflow-x-auto">
              {sseExampleFetch}
            </pre>
            <Button
              variant="ghost"
              size="icon-xs"
              className="mt-1"
              data-testid="copy-sse-example-fetch"
              aria-label="Copy SSE fetch example"
              onClick={() => copyToClipboard(sseExampleFetch)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs">Authentication</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Pass your API key as a query parameter{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">?apiKey=YOUR_KEY</code>{' '}
            or via header{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">X-API-Key: YOUR_KEY</code>{' '}
            (header requires fetch approach).
          </p>
        </div>

        <div>
          <Label className="text-xs">Available events</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {['file:changed', 'branch:switched', 'pr:detected', 'comment:added', 'sync:status'].map(
              (event) => (
                <Badge key={event} variant="outline" className="text-[10px]">
                  {event}
                </Badge>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Section 4: MCP ---------- */

function MCPSection() {
  const [origin, setOrigin] = useState('https://your-domain.com');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const mcpEndpoint = '/api/mcp';
  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        gitmarkdown: {
          url: `${origin}/api/mcp`,
          headers: { 'X-API-Key': '<your-api-key>' },
        },
      },
    },
    null,
    2
  );

  const mcpTools = [
    { name: 'list_repos', desc: 'List accessible repositories' },
    { name: 'list_files', desc: 'List files in a repo path' },
    { name: 'read_file', desc: 'Read file contents' },
    { name: 'write_file', desc: 'Create or update a file' },
    { name: 'delete_file', desc: 'Delete a file' },
    { name: 'create_branch', desc: 'Create a new branch' },
    { name: 'create_pr', desc: 'Open a pull request' },
  ];

  return (
    <div>
      <h3 className="text-sm font-medium mb-1">MCP Server</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Connect AI agents via Model Context Protocol
      </p>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Endpoint</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 rounded bg-muted px-2 py-1.5 text-xs">
              {mcpEndpoint}
            </code>
            <Button
              variant="ghost"
              size="icon-xs"
              data-testid="copy-mcp-endpoint"
              aria-label="Copy MCP endpoint"
              onClick={() => copyToClipboard(`${origin}${mcpEndpoint}`)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs">Client config</Label>
          <div className="flex items-start gap-2 mt-1">
            <pre className="flex-1 rounded bg-muted px-2 py-1.5 text-[11px] leading-relaxed overflow-x-auto">
              {mcpConfig}
            </pre>
            <Button
              variant="ghost"
              size="icon-xs"
              className="mt-1"
              data-testid="copy-mcp-config"
              aria-label="Copy MCP client config"
              onClick={() => copyToClipboard(mcpConfig)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs">Available tools</Label>
          <div className="mt-1 space-y-1">
            {mcpTools.map((tool) => (
              <div key={tool.name} className="flex items-baseline gap-2 text-xs">
                <code className="rounded bg-muted px-1 py-0.5 text-[11px] shrink-0">
                  {tool.name}
                </code>
                <span className="text-muted-foreground">{tool.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

