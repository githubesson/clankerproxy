import React, { useState } from 'react';
import { useIsProxyRunning, useAuthFiles } from '../hooks/useIPC';
import { useQuery } from '@tanstack/react-query';
import { ProxyRequired, Select } from './ui';
import { FactoryDroidGenerator } from './generators/FactoryDroid';

// All known channels and which auth file provider strings map to them
const CHANNEL_DETECTION: { channel: string; label: string; authPatterns: string[] }[] = [
  { channel: 'claude', label: 'Claude', authPatterns: ['claude', 'anthropic'] },
  { channel: 'gemini', label: 'Gemini', authPatterns: ['gemini', 'google'] },
  { channel: 'gemini-cli', label: 'Gemini CLI', authPatterns: ['gemini-cli'] },
  { channel: 'codex', label: 'Codex', authPatterns: ['codex'] },
  { channel: 'cursor', label: 'Cursor', authPatterns: ['cursor'] },
  { channel: 'kimi', label: 'Kimi', authPatterns: ['kimi'] },
  { channel: 'qwen', label: 'Qwen', authPatterns: ['qwen'] },
  { channel: 'kiro', label: 'Kiro', authPatterns: ['kiro'] },
  { channel: 'github-copilot', label: 'GitHub Copilot', authPatterns: ['github', 'copilot'] },
  { channel: 'antigravity', label: 'Antigravity', authPatterns: ['antigravity'] },
  { channel: 'iflow', label: 'iFlow', authPatterns: ['iflow'] },
  { channel: 'kilo', label: 'Kilocode', authPatterns: ['kilo'] },
];

// Registered generators — add new ones here
const GENERATORS = [
  { id: 'factory-droid', label: 'Factory Droid', desc: '~/.factory/settings.json' },
  // future: { id: 'claude-code', label: 'Claude Code', desc: '~/.claude/settings.json' },
  // future: { id: 'continue', label: 'Continue', desc: '~/.continue/config.json' },
] as const;

type GeneratorId = (typeof GENERATORS)[number]['id'];

export function ConfigGenerator() {
  const isRunning = useIsProxyRunning();
  const { data: authFiles } = useAuthFiles();
  const [generator, setGenerator] = useState<GeneratorId>('factory-droid');

  // Detect which provider keys are configured via management API
  const { data: configuredProviders } = useQuery({
    queryKey: ['configuredProviders'],
    queryFn: async () => {
      const api = window.clankerProxy;
      const results: string[] = [];

      // Check API key providers
      const providerChecks = [
        { id: 'claude-api-key', channel: 'claude' },
        { id: 'gemini-api-key', channel: 'gemini' },
        { id: 'codex-api-key', channel: 'codex' },
        { id: 'vertex-api-key', channel: 'vertex' },
        { id: 'openai-compatibility', channel: 'openai-compat' },
      ];

      for (const p of providerChecks) {
        try {
          const keys = await api.providerKeys.list(p.id);
          if (keys && keys.length > 0) results.push(p.channel);
        } catch {}
      }

      return results;
    },
    enabled: isRunning,
    staleTime: 10000,
  });

  if (!isRunning) return <ProxyRequired />;

  // Build available channels from auth files + configured provider keys
  const activeChannels = new Set<string>();

  // From auth files
  authFiles?.forEach((f: any) => {
    const name = ((f.name ?? '') + ' ' + (f.provider ?? '')).toLowerCase();
    for (const cd of CHANNEL_DETECTION) {
      if (cd.authPatterns.some((p) => name.includes(p))) {
        activeChannels.add(cd.channel);
      }
    }
  });

  // From provider keys
  if (configuredProviders) {
    for (const p of configuredProviders) {
      if (p === 'claude') activeChannels.add('claude');
      if (p === 'gemini') { activeChannels.add('gemini'); activeChannels.add('gemini-cli'); }
      if (p === 'codex') activeChannels.add('codex');
      if (p === 'vertex') { activeChannels.add('gemini'); activeChannels.add('gemini-cli'); }
    }
  }

  const availableChannels = CHANNEL_DETECTION.filter((c) => activeChannels.has(c.channel));

  return (
    <div className="max-w-xl space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-[10px] text-muted-foreground flex-1">
          Generate config for external tools using your proxy.
        </p>
        <Select
          value={generator}
          onChange={(v) => setGenerator(v as GeneratorId)}
          options={GENERATORS.map((g) => ({ value: g.id, label: g.label }))}
        />
      </div>

      {availableChannels.length === 0 && (
        <div className="rounded-md border border-border bg-card px-3 py-6 text-center">
          <p className="text-[10px] text-muted-foreground">No providers configured yet.</p>
          <p className="text-[9px] text-muted-foreground/50 mt-1">Add API keys or use OAuth to set up providers first.</p>
        </div>
      )}

      {availableChannels.length > 0 && generator === 'factory-droid' && (
        <FactoryDroidGenerator availableChannels={availableChannels} />
      )}
    </div>
  );
}
