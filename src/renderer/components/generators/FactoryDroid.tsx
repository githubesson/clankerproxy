import React, { useState, useMemo } from 'react';
import { useProxyStatus, useAPIKeys } from '../../hooks/useIPC';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Badge, Select } from '../ui';

const API_FORMATS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'generic-chat-completion-api', label: 'Generic' },
];

const REASONING = [
  { value: '', label: 'Default' },
  { value: 'off', label: 'Off' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const PROVIDER_THINKING: Record<string, { value: string; label: string }[]> = {
  claude: [
    { value: '', label: 'None' },
    { value: '(none)', label: '(none) — off' },
    { value: '(low)', label: '(low) — 1K' },
    { value: '(medium)', label: '(medium) — 8K' },
    { value: '(high)', label: '(high) — 24K' },
    { value: '(xhigh)', label: '(xhigh) — 32K' },
    { value: '(max)', label: '(max) — 128K' },
  ],
  openai: [
    { value: '', label: 'None' },
    { value: '(none)', label: '(none) — off' },
    { value: '(low)', label: '(low)' },
    { value: '(medium)', label: '(medium)' },
    { value: '(high)', label: '(high)' },
    { value: '(xhigh)', label: '(xhigh)' },
  ],
  gemini: [
    { value: '', label: 'None' },
    { value: '(none)', label: '(none) — off' },
    { value: '(low)', label: '(low) — 1K' },
    { value: '(medium)', label: '(medium) — 8K' },
    { value: '(high)', label: '(high) — 24K' },
    { value: '(xhigh)', label: '(xhigh) — 32K' },
    { value: '(max)', label: '(max) — 128K' },
  ],
};

const CHANNEL_THINKING_MAP: Record<string, string> = {
  claude: 'claude', gemini: 'gemini', 'gemini-cli': 'gemini', vertex: 'gemini',
  codex: 'openai', cursor: 'openai', kimi: 'openai', qwen: 'openai', kiro: 'openai',
  'github-copilot': 'openai', antigravity: 'openai', iflow: 'openai', kilo: 'openai',
};

function getThinkingSuffixes(channel: string) {
  return PROVIDER_THINKING[CHANNEL_THINKING_MAP[channel] ?? 'openai'] ?? PROVIDER_THINKING.openai;
}

interface SelectedModel {
  id: string;
  displayName: string;
  provider: string;
  reasoning: string;
  thinkingSuffix: string;
  channel: string;
}

interface Props {
  availableChannels: { channel: string; label: string }[];
}

export function FactoryDroidGenerator({ availableChannels }: Props) {
  const { data: status } = useProxyStatus();
  const { data: apiKeys } = useAPIKeys();
  const port = status?.port ?? 8317;

  const [channel, setChannel] = useState(availableChannels[0]?.channel ?? 'claude');
  const [apiFormat, setApiFormat] = useState(channel === 'claude' ? 'anthropic' : 'openai');
  const [selected, setSelected] = useState<SelectedModel[]>([]);
  const [apiKeyRef, setApiKeyRef] = useState('${PROXY_API_KEY}');
  const [copied, setCopied] = useState(false);

  const { data: modelData } = useQuery({
    queryKey: ['models', channel],
    queryFn: () => window.clankerProxy.models.get(channel),
    enabled: true,
    staleTime: 60000,
  });

  const models = modelData?.models ?? [];

  const addModel = (m: any) => {
    if (selected.find((s) => s.id === m.id)) return;
    setSelected((prev) => [...prev, {
      id: m.id, displayName: m.display_name || m.id, provider: apiFormat,
      reasoning: '', thinkingSuffix: '', channel,
    }]);
  };

  const removeModel = (id: string) => setSelected((prev) => prev.filter((s) => s.id !== id));

  const updateModel = (id: string, field: keyof SelectedModel, value: string) => {
    setSelected((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: value };
      if (field === 'thinkingSuffix' && value) updated.reasoning = '';
      if (field === 'reasoning' && value) updated.thinkingSuffix = '';
      if (field === 'thinkingSuffix' && value) {
        if (!getThinkingSuffixes(s.channel).some((o) => o.value === value)) updated.thinkingSuffix = '';
      }
      return updated;
    }));
  };

  const addAll = () => {
    const newModels = models
      .filter((m: any) => !selected.find((s) => s.id === m.id))
      .map((m: any) => ({
        id: m.id, displayName: m.display_name || m.id, provider: apiFormat,
        reasoning: '', thinkingSuffix: '', channel,
      }));
    setSelected((prev) => [...prev, ...newModels]);
  };

  const generated = useMemo(() => {
    return selected.map((s) => {
      const modelName = s.thinkingSuffix ? `${s.id}${s.thinkingSuffix}` : s.id;
      const tag = s.thinkingSuffix ? ` ${s.thinkingSuffix}` : '';
      const entry: Record<string, any> = {
        model: modelName,
        displayName: `[clanker] ${s.displayName}${tag}`,
        baseUrl: s.provider === 'openai' ? `http://127.0.0.1:${port}/v1` : `http://127.0.0.1:${port}`,
        apiKey: apiKeyRef,
        provider: s.provider,
      };
      if (s.reasoning) entry.reasoningEffort = s.reasoning;
      return entry;
    });
  }, [selected, port, apiKeyRef]);

  const jsonOutput = JSON.stringify({ customModels: generated }, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* API key config */}
      <Card>
        <CardHeader>
          <CardTitle>Factory Droid</CardTitle>
          <CardDescription>~/.factory/settings.json</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">API Key</label>
              <Input value={apiKeyRef} onChange={(e) => setApiKeyRef(e.target.value)} placeholder="${PROXY_API_KEY}" />
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
                {apiKeys.map((k, i) => (
                  <option key={i} value={k}>{k.length > 20 ? `${k.slice(0, 12)}··${k.slice(-4)}` : k}</option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model picker — only shows available channels */}
      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Select
              value={channel}
              onChange={(v) => { setChannel(v); setApiFormat(v === 'claude' ? 'anthropic' : 'openai'); }}
              options={availableChannels.map((c) => ({ value: c.channel, label: c.label }))}
            />
            <Select value={apiFormat} onChange={setApiFormat} options={API_FORMATS} />
            <Button variant="outline" size="sm" onClick={addAll}>Add All</Button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-px">
            {models.map((m: any) => {
              const isAdded = selected.some((s) => s.id === m.id);
              return (
                <div key={m.id} className="flex items-center gap-2 py-0.5">
                  <button
                    onClick={() => isAdded ? removeModel(m.id) : addModel(m)}
                    className={`flex-1 text-left px-2 py-1 rounded text-[10px] font-mono truncate transition-colors ${
                      isAdded ? 'bg-accent/10 text-accent' : 'hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {m.id}
                  </button>
                  {isAdded && <Badge variant="success">✓</Badge>}
                </div>
              );
            })}
            {models.length === 0 && (
              <p className="text-[10px] text-muted-foreground py-4 text-center">No models for this channel.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {selected.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected ({selected.length})</CardTitle>
            <CardDescription>Suffix = proxy-side thinking budget. Reasoning = Factory-side. Suffix wins if both set.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border text-[8px] text-muted-foreground/50 uppercase tracking-wider">
                  <th className="text-left font-medium px-3 py-1.5">Model</th>
                  <th className="text-left font-medium px-2 py-1.5">Format</th>
                  <th className="text-left font-medium px-2 py-1.5">Thinking</th>
                  <th className="text-left font-medium px-2 py-1.5">Reasoning</th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {selected.map((s, i) => (
                  <tr key={s.id} className={`group hover:bg-muted/30 ${i > 0 ? 'border-t border-border' : ''}`}>
                    <td className="px-3 py-1.5">
                      <code className="font-mono text-foreground truncate block max-w-[160px]">{s.id}</code>
                    </td>
                    <td className="px-2 py-1.5">
                      <Select value={s.provider} onChange={(v) => updateModel(s.id, 'provider', v)} options={API_FORMATS} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select value={s.thinkingSuffix} onChange={(v) => updateModel(s.id, 'thinkingSuffix', v)} options={getThinkingSuffixes(s.channel)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select value={s.reasoning} onChange={(v) => updateModel(s.id, 'reasoning', v)} options={REASONING} />
                    </td>
                    <td className="px-1 py-1.5">
                      <button onClick={() => removeModel(s.id)} className="text-muted-foreground/30 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Output */}
      {selected.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Output</CardTitle>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <CardDescription>Paste into ~/.factory/settings.json</CardDescription>
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
