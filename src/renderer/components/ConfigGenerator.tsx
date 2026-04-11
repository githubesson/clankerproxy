import React, { useState } from 'react';
import { useIsProxyRunning, useAuthFiles } from '../hooks/useIPC';
import { useQuery } from '@tanstack/react-query';
import { ProxyRequired, Select } from './ui';
import { FactoryDroidGenerator } from './generators/FactoryDroid';
import { OpenCodeGenerator } from './generators/OpenCode';
import { CrushGenerator } from './generators/Crush';
import { buildAvailableChannels, getConfiguredProviderChannels } from '../lib/channels';

// Registered generators — add new ones here
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

  // Detect which provider keys are configured via management API
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

      {availableChannels.length > 0 && generator === 'opencode' && (
        <OpenCodeGenerator availableChannels={availableChannels} />
      )}

      {availableChannels.length > 0 && generator === 'crush' && (
        <CrushGenerator availableChannels={availableChannels} />
      )}
    </div>
  );
}
