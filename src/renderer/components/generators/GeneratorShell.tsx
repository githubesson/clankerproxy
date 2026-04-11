import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAPIKeys, useModelDefinitions, useModelsDevCatalog, useProxyStatus } from '../../hooks/useIPC';
import { isCustomChannel, resolveCustomChannelModels } from '../../lib/customModels';
import { maskSecret } from '../../lib/providerKeys';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Badge, Select } from '../ui';

export interface SelectedModel {
  id: string;
  displayName: string;
  format: string;
  variants: string[];
  channel: string;
  maxOutputTokens: number;
  contextLength: number;
}

export interface GeneratorDef {
  name: string;
  description: string;
  apiKeyPlaceholder: string;
  formats: { value: string; label: string }[];
  channelFormatMap: Record<string, string>;
  getThinkingOptions: (format: string) => { value: string; label: string }[];
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

export function GeneratorShell({ def, availableChannels }: Props) {
  const { data: status } = useProxyStatus();
  const { data: apiKeys } = useAPIKeys();
  const port = status?.port ?? 8317;

  const [channel, setChannel] = useState(availableChannels[0]?.channel ?? 'claude');
  const [format, setFormat] = useState(() => inferFormat(availableChannels[0]?.channel ?? 'claude', def.formats, def.channelFormatMap));
  const [selected, setSelected] = useState<SelectedModel[]>([]);
  const [apiKeyRef, setApiKeyRef] = useState(def.apiKeyPlaceholder);
  const [copied, setCopied] = useState(false);

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
      if (previous.some((entry) => entry.id === model.id)) {
        return previous;
      }

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

  const updateFormat = (id: string, nextFormat: string) => {
    setSelected((previous) => previous.map((entry) =>
      entry.id === id ? { ...entry, format: nextFormat, variants: [] } : entry,
    ));
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
            <div className="space-y-1">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">API Key</label>
              <Input value={apiKeyRef} onChange={(e) => setApiKeyRef(e.target.value)} placeholder={def.apiKeyPlaceholder} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Proxy</label>
              <Input value={`127.0.0.1:${port}`} onChange={() => {}} disabled />
            </div>
          </div>

          {apiKeys && apiKeys.length > 0 && (
            <div className="space-y-1">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Use configured key</label>
              <select
                onChange={(e) => { if (e.target.value) setApiKeyRef(e.target.value); }}
                className="flex h-6 w-full rounded border border-input bg-transparent px-2 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select...</option>
                {apiKeys.map((key: string, index: number) => (
                  <option key={index} value={key}>{maskSecret(key)}</option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Select
              value={channel}
              onChange={(nextChannel) => {
                setChannel(nextChannel);
                setFormat(inferFormat(nextChannel, def.formats, def.channelFormatMap));
              }}
              options={availableChannels.map((option) => ({ value: option.channel, label: option.label }))}
            />
            <Select value={format} onChange={setFormat} options={def.formats} />
            <Button variant="outline" size="sm" onClick={addAll}>Add All</Button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-px">
            {models.map((model: any) => {
              const isAdded = selected.some((entry) => entry.id === model.id);
              return (
                <div key={model.id} className="flex items-center gap-2 py-0.5">
                  <button
                    onClick={() => isAdded ? removeModel(model.id) : addModel(model)}
                    className={`flex-1 text-left px-2 py-1 rounded text-[10px] font-mono truncate transition-colors ${
                      isAdded ? 'bg-accent/10 text-accent' : 'hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {model.id}
                  </button>
                  {isAdded && <Badge variant="success">OK</Badge>}
                </div>
              );
            })}
            {models.length === 0 && (
              <p className="text-[10px] text-muted-foreground py-4 text-center">No models for this channel.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {selected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected ({selected.length})</CardTitle>
            <CardDescription>Toggle thinking levels per model.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {selected.map((model, index) => {
              const chips = def.getThinkingOptions(model.format);
              return (
                <div key={model.id} className={`px-3 py-2 ${index > 0 ? 'border-t border-border' : ''}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <code className="text-[10px] font-mono text-foreground flex-1 truncate">{model.id}</code>
                    <Select value={model.format} onChange={(value) => updateFormat(model.id, value)} options={def.formats} />
                    <button onClick={() => removeModel(model.id)} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                      X
                    </button>
                  </div>
                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {chips.map((chip) => {
                        const active = model.variants.includes(chip.value);
                        return (
                          <button
                            key={chip.value}
                            onClick={() => toggleVariant(model.id, chip.value)}
                            className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors ${
                              active
                                ? 'bg-accent/15 text-accent border-accent/30'
                                : 'bg-transparent text-muted-foreground/60 border-border hover:border-muted-foreground/30 hover:text-muted-foreground'
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {model.variants.length > 0 && (
                    <p className="text-[9px] text-muted-foreground/40 mt-1">
                      {model.variants.length} variant{model.variants.length !== 1 ? 's' : ''}: {model.variants.map((variant) => def.getVariantName?.(model.format, variant) ?? variant).join(', ')}
                    </p>
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
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <CardDescription>{def.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-[10px] font-mono text-muted-foreground bg-muted/30 rounded p-2 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre select-text">
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
    channel,
    maxOutputTokens: model.max_completion_tokens || model.outputTokenLimit || 16384,
    contextLength: model.context_length || model.inputTokenLimit || 0,
  };
}
