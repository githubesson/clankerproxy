import React, { useMemo, useState, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAPIKeys, useModelDefinitions, useModelsDevCatalog, useProxyStatus } from '../../hooks/useIPC';
import { isCustomChannel, resolveCustomChannelModels } from '../../lib/customModels';
import { maskSecret } from '../../lib/providerKeys';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Badge, Select, Field, Label } from '../ui';
import { CopyIcon, CheckIcon, XMarkIcon, SelectChevron } from '../icons';

export interface SelectedModel {
  id: string;
  displayName: string;
  format: string;
  variants: string[];
  secondaryVariants: string[];
  channel: string;
  maxOutputTokens: number;
  contextLength: number;
}

export interface GeneratorSecondaryProfile {
  id: string;
  label: string;
}

export interface GeneratorDef {
  name: string;
  description: string;
  apiKeyPlaceholder: string;
  formats: { value: string; label: string }[];
  channelFormatMap: Record<string, string>;
  getThinkingOptions: (format: string) => { value: string; label: string }[];
  getSecondaryProfile?: (model: SelectedModel) => GeneratorSecondaryProfile | null;
  getVariantName?: (format: string, value: string) => string;
  buildOutput: (ctx: {
    selected: SelectedModel[];
    port: number;
    apiKey: string;
  }) => any;
}

interface Props {
  def: GeneratorDef;
  availableChannels: { channel: string; label: string }[];
}

type ProfileMode = 'standard' | 'secondary';

export function GeneratorShell({ def, availableChannels }: Props) {
  const { data: status } = useProxyStatus();
  const { data: apiKeys } = useAPIKeys();
  const port = status?.port ?? 8317;

  const [channel, setChannel] = useState(availableChannels[0]?.channel ?? 'claude');
  const [format, setFormat] = useState(() => inferFormat(availableChannels[0]?.channel ?? 'claude', def.formats, def.channelFormatMap));
  const [selected, setSelected] = useState<SelectedModel[]>([]);
  const [profileModes, setProfileModes] = useState<Record<string, ProfileMode>>({});
  const [apiKeyRef, setApiKeyRef] = useState(def.apiKeyPlaceholder);
  const [copied, setCopied] = useState(false);
  const configuredKeyId = useId();

  const customChannel = isCustomChannel(channel);
  const { data: modelData } = useModelDefinitions(channel, !customChannel);
  const { data: modelsCatalog } = useModelsDevCatalog(customChannel);
  const { data: customModels } = useQuery({
    queryKey: ['customModels', channel, Boolean(modelsCatalog)],
    queryFn: () => resolveCustomChannelModels(window.clankerProxy, channel, modelsCatalog),
    enabled: customChannel,
    staleTime: 10000,
  });

  const models = customChannel ? (customModels ?? []) : (modelData?.models ?? []);
  const output = useMemo(
    () => def.buildOutput({ selected, port, apiKey: apiKeyRef }),
    [selected, port, apiKeyRef, def],
  );
  const jsonOutput = JSON.stringify(output, null, 2);

  const addModel = (model: any) => {
    setSelected((previous) => {
      if (previous.some((entry) => entry.id === model.id)) return previous;
      return [...previous, toSelectedModel(model, format, channel)];
    });
  };

  const addAll = () => {
    setSelected((previous) => {
      const selectedIds = new Set(previous.map((entry) => entry.id));
      const nextModels = models
        .filter((model: any) => !selectedIds.has(model.id))
        .map((model: any) => toSelectedModel(model, format, channel));
      return [...previous, ...nextModels];
    });
  };

  const removeModel = (id: string) => setSelected((previous) => previous.filter((entry) => entry.id !== id));

  const toggleVariant = (id: string, variant: string) => {
    setSelected((previous) => previous.map((entry) => {
      if (entry.id !== id) return entry;
      return entry.variants.includes(variant)
        ? { ...entry, variants: entry.variants.filter((value) => value !== variant) }
        : { ...entry, variants: [...entry.variants, variant] };
    }));
  };

  const toggleSecondaryVariant = (id: string, variant: string) => {
    setSelected((previous) => previous.map((entry) => {
      if (entry.id !== id) return entry;
      return entry.secondaryVariants.includes(variant)
        ? { ...entry, secondaryVariants: entry.secondaryVariants.filter((value) => value !== variant) }
        : { ...entry, secondaryVariants: [...entry.secondaryVariants, variant] };
    }));
  };

  const setProfileMode = (id: string, mode: ProfileMode) => {
    setProfileModes((previous) => ({ ...previous, [id]: mode }));
  };

  const updateFormat = (id: string, nextFormat: string) => {
    setSelected((previous) => previous.map((entry) =>
      entry.id === id ? { ...entry, format: nextFormat, variants: [], secondaryVariants: [] } : entry,
    ));
    setProfileModes((previous) => ({ ...previous, [id]: 'standard' }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{def.name}</CardTitle>
          <CardDescription>{def.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="API Key">
              {({ id }) => (
                <Input
                  id={id}
                  name="generator-api-key"
                  aria-label="API Key"
                  value={apiKeyRef}
                  onChange={(e) => setApiKeyRef(e.target.value)}
                  placeholder={def.apiKeyPlaceholder}
                />
              )}
            </Field>
            <Field label="Proxy">
              {({ id }) => (
                <Input id={id} name="generator-proxy" aria-label="Proxy endpoint" value={`127.0.0.1:${port}`} onChange={() => {}} disabled />
              )}
            </Field>
          </div>

          {apiKeys && apiKeys.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor={configuredKeyId}>Use configured key</Label>
              <div className="inline-grid w-full grid-cols-[1fr_--spacing(6)] items-center rounded ring-1 ring-inset ring-white/10 bg-white/[0.02] has-focus-visible:outline-2 has-focus-visible:-outline-offset-1 has-focus-visible:outline-ring">
                <select
                  id={configuredKeyId}
                  name="configured-key"
                  onChange={(e) => { if (e.target.value) setApiKeyRef(e.target.value); }}
                  className="col-span-full row-start-1 h-7 appearance-none bg-transparent pl-2 pr-6 text-[0.6875rem] text-foreground focus:outline-hidden"
                >
                  <option value="">Select…</option>
                  {apiKeys.map((key: string, index: number) => (
                    <option key={index} value={key}>{maskSecret(key)}</option>
                  ))}
                </select>
                <SelectChevron className="text-muted-foreground" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Select
              name="generator-channel"
              aria-label="Channel"
              value={channel}
              onChange={(nextChannel) => {
                setChannel(nextChannel);
                setFormat(inferFormat(nextChannel, def.formats, def.channelFormatMap));
              }}
              options={availableChannels.map((option) => ({ value: option.channel, label: option.label }))}
            />
            <Select name="generator-format" aria-label="Format" value={format} onChange={setFormat} options={def.formats} />
            <Button variant="outline" onClick={addAll}>Add All</Button>
          </div>

          <ul role="list" className="max-h-40 overflow-y-auto space-y-px">
            {models.map((model: any) => {
              const isAdded = selected.some((entry) => entry.id === model.id);
              return (
                <li key={model.id} className="flex items-center gap-2 py-0.5">
                  <button
                    type="button"
                    onClick={() => isAdded ? removeModel(model.id) : addModel(model)}
                    aria-pressed={isAdded}
                    className={`flex-1 truncate rounded px-2 py-1 text-left text-[0.625rem] font-mono ${
                      isAdded ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-white/[0.04]'
                    }`}
                  >
                    {model.id}
                  </button>
                  {isAdded && <Badge variant="success">OK</Badge>}
                </li>
              );
            })}
            {models.length === 0 && (
              <li className="py-4 text-center text-[0.625rem] text-muted-foreground">No models for this channel.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      {selected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected ({selected.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selected.map((model, index) => {
              const chips = def.getThinkingOptions(model.format);
              const secondaryProfile = def.getSecondaryProfile?.(model) ?? null;
              const hasSecondaryProfile = secondaryProfile !== null;
              const activeMode = hasSecondaryProfile ? (profileModes[model.id] ?? 'standard') : 'standard';
              const activeVariants = activeMode === 'secondary' ? model.secondaryVariants : model.variants;
              const standardCount = model.variants.length;
              const secondaryCount = model.secondaryVariants.length;
              return (
                <div key={model.id} className={`px-3 py-2 ${index > 0 ? 'border-t border-white/5' : ''}`}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate text-[0.625rem] font-mono text-foreground">{model.id}</code>
                    <Select
                      name={`format-${model.id}`}
                      aria-label={`Format for ${model.id}`}
                      value={model.format}
                      onChange={(value) => updateFormat(model.id, value)}
                      options={def.formats}
                    />
                    {hasSecondaryProfile && secondaryProfile && (
                      <div className="inline-flex h-7 items-center rounded ring-1 ring-inset ring-white/10 p-0.5" role="group" aria-label="Profile mode">
                        <button
                          type="button"
                          onClick={() => setProfileMode(model.id, 'standard')}
                          aria-pressed={activeMode === 'standard'}
                          className={`inline-flex h-full items-center rounded px-2 text-[0.5625rem] ${
                            activeMode === 'standard'
                              ? 'bg-white/[0.08] text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          Standard{standardCount > 0 ? ` ${standardCount}` : ''}
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfileMode(model.id, 'secondary')}
                          aria-pressed={activeMode === 'secondary'}
                          className={`inline-flex h-full items-center rounded px-2 text-[0.5625rem] ${
                            activeMode === 'secondary'
                              ? 'bg-white/[0.08] text-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {secondaryProfile.label}{secondaryCount > 0 ? ` ${secondaryCount}` : ''}
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeModel(model.id)}
                      aria-label={`Remove ${model.id}`}
                      title={`Remove ${model.id}`}
                      className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <XMarkIcon className="size-3" />
                    </button>
                  </div>
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {chips.map((chip) => {
                        const active = activeVariants.includes(chip.value);
                        return (
                          <button
                            type="button"
                            key={`${activeMode}-${chip.value}`}
                            onClick={() => activeMode === 'secondary'
                              ? toggleSecondaryVariant(model.id, chip.value)
                              : toggleVariant(model.id, chip.value)}
                            aria-pressed={active}
                            className={`rounded px-1.5 py-0.5 text-[0.5625rem] ring-1 ring-inset ${
                              active
                                ? 'bg-accent/15 text-accent ring-accent/30'
                                : 'bg-transparent text-muted-foreground ring-white/10 hover:ring-white/20 hover:text-foreground'
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {selected.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Output</CardTitle>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                {copied ? <><CheckIcon className="size-3" />Copied</> : <><CopyIcon className="size-3" />Copy</>}
              </Button>
            </div>
            <CardDescription>{def.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-60 select-text overflow-auto whitespace-pre rounded bg-black/40 p-2 font-mono text-[0.625rem] text-muted-foreground ring-1 ring-inset ring-white/5">
              {jsonOutput}
            </pre>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function inferFormat(
  channel: string,
  formats: { value: string; label: string }[],
  channelFormatMap: Record<string, string>,
): string {
  if (channel.startsWith('custom-claude:')) return 'anthropic';
  if (channel.startsWith('custom:')) {
    return formats.find((format) =>
      format.value === 'openai-compatible' || format.value === 'openai-compat' || format.value === 'generic-chat-completion-api',
    )?.value
      ?? formats.find((format) => format.value.includes('compat'))?.value
      ?? formats[0].value;
  }

  return channelFormatMap[channel] ?? formats[0].value;
}

function toSelectedModel(model: any, format: string, channel: string): SelectedModel {
  return {
    id: model.id,
    displayName: model.display_name || model.id,
    format,
    variants: [],
    secondaryVariants: [],
    channel,
    maxOutputTokens: model.max_completion_tokens || model.outputTokenLimit || 16384,
    contextLength: model.context_length || model.inputTokenLimit || 0,
  };
}
