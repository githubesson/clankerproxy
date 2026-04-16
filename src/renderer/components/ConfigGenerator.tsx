import React, { useState } from 'react';
import { useIsProxyRunning, useAuthFiles } from '../hooks/useIPC';
import { useQuery } from '@tanstack/react-query';
import { ProxyRequired, Select } from './ui';
import { FactoryDroidGenerator } from './generators/FactoryDroid';
import { OpenCodeGenerator } from './generators/OpenCode';
import { CrushGenerator } from './generators/Crush';
import { buildAvailableChannels, getConfiguredProviderChannels } from '../lib/channels';

const GENERATORS = [
  { id: 'factory-droid', label: 'Factory Droid' },
  { id: 'opencode', label: 'OpenCode' },
  { id: 'crush', label: 'Crush' },
] as const;

type GeneratorId = (typeof GENERATORS)[number]['id'];

export function ConfigGenerator() {
  const isRunning = useIsProxyRunning();
  const { data: authFiles } = useAuthFiles();
  const [generator, setGenerator] = useState<GeneratorId>('factory-droid');

  const { data: configuredProviders } = useQuery({
    queryKey: ['configuredProviders'],
    queryFn: () => getConfiguredProviderChannels(window.clankerProxy),
    enabled: isRunning,
    staleTime: 10000,
  });

  if (!isRunning) return <ProxyRequired />;

  const availableChannels = buildAvailableChannels(authFiles, configuredProviders);

  return (
    <div className="max-w-xl space-y-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[0.625rem] text-muted-foreground text-pretty">
          Generate config for external tools using your proxy.
        </p>
        <Select
          name="generator"
          aria-label="Target generator"
          value={generator}
          onChange={(v) => setGenerator(v as GeneratorId)}
          options={GENERATORS.map((g) => ({ value: g.id, label: g.label }))}
        />
      </div>

      {availableChannels.length === 0 && (
        <div className="rounded-md ring-1 ring-white/5 bg-card px-3 py-6 text-center">
          <p className="text-[0.625rem] text-muted-foreground text-pretty">No providers configured yet.</p>
          <p className="mt-1 text-[0.5625rem] text-muted-foreground/50 text-pretty">Add API keys or use OAuth to set up providers first.</p>
        </div>
      )}

      {availableChannels.length > 0 && generator === 'factory-droid' && (
        <FactoryDroidGenerator availableChannels={availableChannels} />
      )}

      {availableChannels.length > 0 && generator === 'opencode' && (
        <OpenCodeGenerator availableChannels={availableChannels} />
      )}

      {availableChannels.length > 0 && generator === 'crush' && (
        <CrushGenerator availableChannels={availableChannels} />
      )}
    </div>
  );
}
