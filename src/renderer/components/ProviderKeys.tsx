import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useDeleteProviderKey,
  useIsProxyRunning,
  useModelsDevCatalog,
  usePatchProviderKeys,
  useProviderKeys,
  usePutProviderKeys,
} from '../hooks/useIPC';
import {
  getProviderEntrySecret,
  getProviderEntryTitle,
  getProviderModelName,
  maskSecret,
  safeHostname,
  upsertProviderEntryModels,
} from '../lib/providerKeys';
import { PROVIDER_KEY_DEFINITIONS, PROVIDER_KEY_MOVE_TARGETS } from '../../shared/provider-registry';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Badge, Select, ProxyRequired,
} from './ui';
import { ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon, XMarkIcon, PlusIcon, TrashIcon } from './icons';

const PROVIDER_LOOKUP = new Map(PROVIDER_KEY_DEFINITIONS.map((provider) => [provider.id, provider]));

type ProviderId = (typeof PROVIDER_KEY_DEFINITIONS)[number]['id'];
type SearchMode = 'both' | 'provider' | 'model';

export function ProviderKeys() {
  const isRunning = useIsProxyRunning();
  const [active, setActive] = useState<ProviderId>(PROVIDER_KEY_DEFINITIONS[0].id);
  const [showPresets, setShowPresets] = useState(false);
  const provider = PROVIDER_LOOKUP.get(active) ?? PROVIDER_KEY_DEFINITIONS[0];

  if (!isRunning) return <ProxyRequired />;

  return (
    <div className="max-w-lg space-y-2">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[0.625rem] text-muted-foreground text-pretty">Upstream LLM provider keys.</p>
        <Button variant={showPresets ? 'default' : 'outline'} onClick={() => setShowPresets((value) => !value)}>
          Presets
        </Button>
        {!showPresets && (
          <Select
            name="active-provider"
            aria-label="Active provider"
            value={active}
            onChange={(value) => setActive(value as ProviderId)}
            options={PROVIDER_KEY_DEFINITIONS.map(({ id, label }) => ({ value: id, label }))}
          />
        )}
      </div>

      {showPresets ? <PresetBrowser /> : <Section key={active} provider={provider.id} keyField={provider.keyField} />}
    </div>
  );
}

function PresetBrowser() {
  const queryClient = useQueryClient();
  const { data: catalog, isLoading } = useModelsDevCatalog();
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('both');
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  const providers = useMemo(() => {
    if (!catalog) return [];

    return Object.values(catalog)
      .filter((provider: any) => provider.name && provider.models && Object.keys(provider.models).length > 0)
      .filter((provider: any) => {
        if (!search) return true;

        const query = search.toLowerCase();
        const nameMatch = provider.name?.toLowerCase().includes(query) || provider.id?.toLowerCase().includes(query);
        const modelMatch = Object.values(provider.models).some((model: any) =>
          model.id?.toLowerCase().includes(query) || model.name?.toLowerCase().includes(query),
        );

        if (searchMode === 'provider') return nameMatch;
        if (searchMode === 'model') return modelMatch;
        return nameMatch || modelMatch;
      })
      .sort((left: any, right: any) => left.name.localeCompare(right.name));
  }, [catalog, search, searchMode]);

  const addPreset = useMutation({
    mutationFn: async () => {
      if (!selectedProvider || !apiKey.trim()) return;

      const api = window.clankerProxy;
      const trimmedApiKey = apiKey.trim();
      const providerNpm = selectedProvider.npm ?? '';
      const baseUrl = selectedProvider.api || `https://api.${selectedProvider.id}.com/v1`;
      const claudeBaseUrl = baseUrl.replace(/\/v1\/?$/, '');
      const claudeModels: any[] = [];
      const openAICompatModels: any[] = [];

      for (const model of Object.values(selectedProvider.models) as any[]) {
        if (!selectedModels.has(model.id)) continue;

        const npm = model.provider?.npm ?? providerNpm;
        const entry = { name: model.id };

        if (npm.includes('anthropic')) {
          claudeModels.push(entry);
        } else {
          openAICompatModels.push(entry);
        }
      }

      await upsertProviderEntryModels({
        api,
        provider: 'claude-api-key',
        baseUrl: claudeBaseUrl,
        newModels: claudeModels,
        createEntry: () => ({
          'api-key': trimmedApiKey,
          'base-url': claudeBaseUrl,
          prefix: selectedProvider.id,
          headers: { 'x-api-key': trimmedApiKey },
          models: claudeModels,
        }),
      });

      await upsertProviderEntryModels({
        api,
        provider: 'openai-compatibility',
        baseUrl,
        newModels: openAICompatModels,
        createEntry: () => ({
          name: selectedProvider.id,
          'base-url': baseUrl,
          'api-key-entries': [{ 'api-key': trimmedApiKey }],
          models: openAICompatModels,
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['providerKeys'] });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setSelectedProvider(null);
        setApiKey('');
        setSelectedModels(new Set());
      }, 2000);
    },
  });

  const toggleModel = (id: string) => {
    setSelectedModels((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllModels = () => {
    if (!selectedProvider) return;
    const allModels = Object.keys(selectedProvider.models);
    setSelectedModels((previous) => (previous.size === allModels.length ? new Set() : new Set(allModels)));
  };

  if (selectedProvider) {
    const models = Object.values(selectedProvider.models) as any[];

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => { setSelectedProvider(null); setSelectedModels(new Set()); }}
              aria-label="Back to provider list"
              title="Back"
            >
              <ChevronLeftIcon className="size-3" />
            </Button>
            <div className="flex-1 min-w-0">
              <CardTitle>{selectedProvider.name}</CardTitle>
              <CardDescription>{selectedProvider.api || selectedProvider.id} · {models.length} models</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            name="preset-api-key"
            aria-label={`API key for ${selectedProvider.name}`}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`API key (${selectedProvider.env?.[0] || 'key'})…`}
          />

          <div className="flex items-center gap-2">
            <span className="flex-1 text-[0.5625rem] text-muted-foreground tabular-nums">{selectedModels.size} selected</span>
            <Button variant="ghost" size="sm" onClick={selectAllModels}>
              {selectedModels.size === models.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <ul role="list" className="max-h-48 overflow-y-auto space-y-px">
            {models.map((model: any) => {
              const active = selectedModels.has(model.id);
              return (
                <li key={model.id}>
                  <button
                    type="button"
                    onClick={() => toggleModel(model.id)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[0.625rem] ${
                      active ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="flex-1 min-w-0 truncate font-mono">{model.id}</span>
                    <span className="flex shrink-0 gap-1">
                      {model.reasoning && <Badge variant="success">reason</Badge>}
                      {model.tool_call && <Badge variant="outline">tools</Badge>}
                      {model.limit?.context && <Badge variant="outline">{Math.round(model.limit.context / 1000)}K</Badge>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <Button
            onClick={() => addPreset.mutate()}
            disabled={!apiKey.trim() || selectedModels.size === 0 || addPreset.isPending}
            className="w-full"
          >
            {done ? 'Added!' : addPreset.isPending ? 'Adding…' : `Add ${selectedModels.size} model${selectedModels.size !== 1 ? 's' : ''}`}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Catalog</CardTitle>
        <CardDescription>Browse providers from models.dev</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-1.5">
          <Input
            name="preset-search"
            aria-label="Search providers and models"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${searchMode === 'both' ? 'providers & models' : searchMode === 'provider' ? 'providers' : 'models'}…`}
          />
          <div className="inline-flex shrink-0 rounded ring-1 ring-inset ring-white/10 bg-white/[0.02] p-0.5" role="group" aria-label="Search scope">
            {(['both', 'provider', 'model'] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => setSearchMode(mode)}
                aria-pressed={searchMode === mode}
                className={`px-1.5 py-0.5 rounded text-[0.5625rem] ${
                  searchMode === mode
                    ? 'bg-white/[0.08] text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === 'both' ? 'All' : mode === 'provider' ? 'Prov' : 'Model'}
              </button>
            ))}
          </div>
        </div>

        <ul role="list" className="max-h-64 overflow-y-auto space-y-px">
          {isLoading && <li className="py-4 text-center text-[0.625rem] text-muted-foreground">Loading catalog…</li>}
          {!isLoading && providers.length === 0 && (
            <li className="py-4 text-center text-[0.625rem] text-muted-foreground">No results.</li>
          )}
          {providers.map((provider: any) => {
            const modelCount = Object.keys(provider.models).length;
            const reasoningCount = Object.values(provider.models).filter((model: any) => model.reasoning).length;

            return (
              <li key={provider.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedProvider(provider); setSelectedModels(new Set(Object.keys(provider.models))); }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-white/[0.04]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.625rem] text-foreground font-medium truncate">{provider.name}</p>
                    <p className="text-[0.5625rem] text-muted-foreground/60 truncate">{provider.api || provider.id}</p>
                  </div>
                  <span className="flex shrink-0 gap-1">
                    <Badge variant="outline">{modelCount} model{modelCount !== 1 ? 's' : ''}</Badge>
                    {reasoningCount > 0 && <Badge variant="success">{reasoningCount} reason</Badge>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function Section({ provider, keyField }: { provider: ProviderId; keyField: 'api-key' | 'name' }) {
  const { data: keys, isLoading } = useProviderKeys(provider);
  const deleteEntry = useDeleteProviderKey(provider);
  const addEntry = usePatchProviderKeys(provider);
  const putEntries = usePutProviderKeys(provider);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const [prefix, setPrefix] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  const moveModel = useMutation({
    mutationFn: async ({ entryIndex, modelName, targetProvider }: { entryIndex: number; modelName: string; targetProvider: string }) => {
      if (!keys || targetProvider === provider) return;

      const api = window.clankerProxy;
      const entry = keys[entryIndex];
      const sourceModels = entry.models ?? [];
      const model = sourceModels.find((candidate: any) => getProviderModelName(candidate) === modelName);

      if (!model) return;

      const baseUrl = entry['base-url'] || '';
      const targetBaseUrl = targetProvider === 'openai-compatibility'
        ? (baseUrl.match(/\/v1\/?$/) ? baseUrl : `${baseUrl.replace(/\/+$/, '')}/v1`)
        : baseUrl.replace(/\/v1\/?$/, '');
      const secret = getProviderEntrySecret(entry);

      await upsertProviderEntryModels({
        api,
        provider: targetProvider,
        baseUrl: targetBaseUrl,
        newModels: [model],
        createEntry: () => {
          if (targetProvider === 'openai-compatibility') {
            return {
              name: entry.name || entry.prefix || (targetBaseUrl ? safeHostname(targetBaseUrl) : 'moved'),
              'base-url': targetBaseUrl,
              'api-key-entries': [{ 'api-key': secret }],
              models: [model],
            };
          }

          return {
            'api-key': secret,
            'base-url': targetBaseUrl,
            prefix: entry.name || entry.prefix,
            models: [model],
          };
        },
      });

      const nextSourceEntries = [...keys];
      const nextSourceModels = sourceModels.filter((candidate: any) => getProviderModelName(candidate) !== modelName);

      if (nextSourceModels.length === 0) {
        await api.providerKeys.delete(provider, entryIndex);
      } else {
        nextSourceEntries[entryIndex] = {
          ...entry,
          models: nextSourceModels,
        };
        await api.providerKeys.put(provider, nextSourceEntries);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providerKeys'] }),
  });

  const providerBadge = PROVIDER_LOOKUP.get(provider)?.badgeLabel ?? provider.replace('-api-key', '');

  return (
    <div className="space-y-2">
      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="px-3 py-2 text-[0.625rem] text-muted-foreground">Loading…</div>}
          {!isLoading && keys?.length === 0 && !adding && (
            <div className="px-3 py-6 text-center text-[0.625rem] text-muted-foreground">No keys for this provider.</div>
          )}
          <ul role="list">
            {keys?.map((entry: any, index: number) => {
              const title = getProviderEntryTitle(entry);
              const secret = getProviderEntrySecret(entry);
              const isOpen = expanded === index;

              return (
                <li key={index} className={index > 0 ? 'border-t border-white/5' : ''}>
                  <div className="relative flex items-stretch group hover:bg-white/[0.03]">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className="flex flex-1 min-w-0 items-center gap-2 px-3 py-1.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    >
                      {isOpen ? <ChevronDownIcon className="size-3 text-muted-foreground/50" /> : <ChevronRightIcon className="size-3 text-muted-foreground/50" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[0.625rem] text-foreground truncate">{title || '—'}</span>
                          {secret && <code className="text-[0.5625rem] text-muted-foreground/40 font-mono">{maskSecret(secret)}</code>}
                          <Badge variant="outline">{providerBadge}</Badge>
                        </div>
                        {entry['base-url'] && (
                          <p className="text-[0.5625rem] text-muted-foreground/50 font-mono truncate">{entry['base-url']}</p>
                        )}
                        {entry.models?.length > 0 && (
                          <p className="text-[0.5625rem] text-muted-foreground/40 tabular-nums">
                            {entry.models.length} model{entry.models.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry.mutate(index)}
                      disabled={deleteEntry.isPending}
                      aria-label={`Delete ${title || 'entry'}`}
                      title={`Delete ${title || 'entry'}`}
                      className="inline-flex size-6 my-auto mr-2 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <TrashIcon className="size-3" />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="px-3 pb-2 pl-8 space-y-1">
                      <EditableUrl
                        value={entry['base-url'] || ''}
                        onSave={async (nextUrl) => {
                          if (!keys) return;
                          const nextEntries = [...keys];
                          nextEntries[index] = { ...entry, 'base-url': nextUrl };
                          await putEntries.mutateAsync(nextEntries);
                        }}
                      />

                      {entry.models?.length > 0 && (
                        <ul role="list" className="space-y-px">
                          {entry.models.map((model: any, modelIndex: number) => {
                            const modelName = getProviderModelName(model);

                            return (
                              <li
                                key={modelIndex}
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/[0.03] group/model"
                              >
                                <code className="flex-1 min-w-0 text-[0.5625rem] font-mono text-muted-foreground truncate">{modelName}</code>
                                {model.alias && model.alias !== modelName && (
                                  <span className="text-[0.5625rem] text-muted-foreground/40 truncate">{model.alias}</span>
                                )}
                                <div className="flex gap-0.5 opacity-0 group-hover/model:opacity-100 shrink-0">
                                  {PROVIDER_KEY_MOVE_TARGETS
                                    .filter((target) => target.value !== provider)
                                    .map((target) => (
                                      <button
                                        type="button"
                                        key={target.value}
                                        title={`Move to ${target.label}`}
                                        aria-label={`Move ${modelName} to ${target.label}`}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          moveModel.mutate({ entryIndex: index, modelName, targetProvider: target.value });
                                        }}
                                        disabled={moveModel.isPending}
                                        className="inline-flex items-center rounded px-1 py-px text-[0.5rem] ring-1 ring-inset ring-white/10 text-muted-foreground/50 hover:ring-white/20 hover:text-foreground disabled:opacity-50"
                                      >
                                        {target.label}
                                      </button>
                                    ))}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {adding ? (
        <Card>
          <CardContent className="space-y-1.5">
            <Input
              name="new-entry-value"
              aria-label={keyField === 'name' ? 'Name' : 'API key'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={keyField === 'name' ? 'Name' : 'API key'}
            />
            <div className="grid grid-cols-2 gap-1.5">
              <Input name="new-entry-prefix" aria-label="Prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Prefix" />
              <Input name="new-entry-base-url" aria-label="Base URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Base URL" />
            </div>
            <div className="flex gap-1.5">
              <Button
                onClick={() => {
                  if (!value.trim()) return;

                  const entry: Record<string, string> = { [keyField]: value.trim() };
                  if (prefix.trim()) entry.prefix = prefix.trim();
                  if (baseUrl.trim()) entry['base-url'] = baseUrl.trim();

                  addEntry.mutate(
                    { action: 'add', entry },
                    {
                      onSuccess: () => {
                        setAdding(false);
                        setValue('');
                        setPrefix('');
                        setBaseUrl('');
                      },
                    },
                  );
                }}
                disabled={!value.trim() || addEntry.isPending}
              >
                Add
              </Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <PlusIcon className="size-3" />
          Add Key
        </Button>
      )}
    </div>
  );
}

function EditableUrl({ value, onSave }: { value: string; onSave: (nextValue: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); setDraft(value); setEditing(true); }}
        title="Click to edit base URL"
        className="w-full truncate text-left text-[0.5625rem] font-mono text-muted-foreground/50 hover:text-muted-foreground"
      >
        {value || 'No base URL set'}
      </button>
    );
  }

  const save = () => {
    setSaving(true);
    onSave(draft).finally(() => {
      setSaving(false);
      setEditing(false);
    });
  };

  return (
    <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
      <Input
        name="base-url-edit"
        aria-label="Base URL"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="https://…"
        className="flex-1"
        onKeyDown={(event) => {
          if (event.key === 'Enter') save();
          if (event.key === 'Escape') setEditing(false);
        }}
      />
      <Button size="sm" disabled={saving} onClick={save}>
        {saving ? '…' : 'Save'}
      </Button>
      <Button variant="ghost" size="iconSm" onClick={() => setEditing(false)} aria-label="Cancel edit" title="Cancel">
        <XMarkIcon className="size-3" />
      </Button>
    </div>
  );
}
