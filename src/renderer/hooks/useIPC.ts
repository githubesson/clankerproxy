import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ClankerProxyAPI } from '../../preload/preload';

declare global {
  interface Window {
    clankerProxy: ClankerProxyAPI;
  }
}

const api = () => window.clankerProxy;

function useInvalidateQueriesMutation<TVariables = void, TResult = void>({
  mutationFn,
  queryKeys,
  invalidateOn = 'success',
}: {
  mutationFn: (variables: TVariables) => Promise<TResult>;
  queryKeys: QueryKey[];
  invalidateOn?: 'success' | 'settled';
}) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      if (invalidateOn === 'success') {
        await invalidate();
      }
    },
    onSettled: async () => {
      if (invalidateOn === 'settled') {
        await invalidate();
      }
    },
  });
}

function useProxyQuery<TData>({
  queryKey,
  queryFn,
  refetchInterval = false,
  staleTime,
  enabled = true,
}: {
  queryKey: QueryKey;
  queryFn: () => Promise<TData> | TData;
  refetchInterval?: number | false;
  staleTime?: number;
  enabled?: boolean;
}) {
  const running = useIsProxyRunning();
  const isEnabled = running && enabled;

  return useQuery({
    queryKey,
    queryFn,
    enabled: isEnabled,
    staleTime,
    refetchInterval: isEnabled ? refetchInterval : false,
  });
}

// Proxy status
export function useProxyStatus() {
  const query = useQuery({
    queryKey: ['proxy', 'status'],
    queryFn: () => api().proxy.getStatus(),
    refetchInterval: 2000,
  });

  useEffect(() => {
    const unsub = api().proxy.onStateChange(() => {
      query.refetch();
    });
    return unsub;
  }, [query.refetch]);

  return query;
}

/** True when the proxy is running — used to gate management API queries */
export function useIsProxyRunning(): boolean {
  const { data } = useProxyStatus();
  return data?.state === 'running';
}

export function useStartProxy() {
  return useInvalidateQueriesMutation<void, void>({
    mutationFn: async () => {
      await api().proxy.start();
    },
    queryKeys: [['proxy', 'status']],
    invalidateOn: 'settled',
  });
}

export function useStopProxy() {
  return useInvalidateQueriesMutation<void, void>({
    mutationFn: async () => {
      await api().proxy.stop();
    },
    queryKeys: [['proxy', 'status']],
    invalidateOn: 'settled',
  });
}

export function useRestartProxy() {
  return useInvalidateQueriesMutation<void, void>({
    mutationFn: async () => {
      await api().proxy.restart();
    },
    queryKeys: [['proxy', 'status']],
    invalidateOn: 'settled',
  });
}

// Binary management
export function useBinaryStatus() {
  return useQuery({
    queryKey: ['binary', 'status'],
    queryFn: async () => ({
      installed: await api().binary.isInstalled(),
      version: await api().binary.currentVersion(),
    }),
  });
}

export function useDownloadBinary() {
  return useInvalidateQueriesMutation<void, string>({
    mutationFn: () => api().binary.download(),
    queryKeys: [['binary']],
    invalidateOn: 'settled',
  });
}

export function useCheckUpdate() {
  return useQuery({
    queryKey: ['binary', 'update'],
    queryFn: () => api().binary.checkForUpdate(),
    enabled: false,
  });
}

// API Keys — auto-fetches when proxy is running, polls every 5s
export function useAPIKeys() {
  return useProxyQuery({
    queryKey: ['apiKeys'],
    queryFn: () => api().apiKeys.list(),
    refetchInterval: 5000,
  });
}

export function useAddAPIKey() {
  return useInvalidateQueriesMutation({
    mutationFn: (key: string) => api().apiKeys.add(key),
    queryKeys: [['apiKeys']],
  });
}

export function useDeleteAPIKey() {
  return useInvalidateQueriesMutation({
    mutationFn: (index: number) => api().apiKeys.delete(index),
    queryKeys: [['apiKeys']],
  });
}

// Provider Keys
export function useProviderKeys(provider: string) {
  return useProxyQuery({
    queryKey: ['providerKeys', provider],
    queryFn: () => api().providerKeys.list(provider),
    refetchInterval: 5000,
  });
}

export function usePatchProviderKeys(provider: string) {
  return useInvalidateQueriesMutation({
    mutationFn: (body: any) => api().providerKeys.patch(provider, body),
    queryKeys: [['providerKeys']],
  });
}

export function usePutProviderKeys(provider: string) {
  return useInvalidateQueriesMutation({
    mutationFn: (entries: any[]) => api().providerKeys.put(provider, entries),
    queryKeys: [['providerKeys']],
  });
}

export function useDeleteProviderKey(provider: string) {
  return useInvalidateQueriesMutation({
    mutationFn: (index: number) => api().providerKeys.delete(provider, index),
    queryKeys: [['providerKeys']],
  });
}

// Auth Files — auto-fetches when proxy is running, polls every 3s
export function useAuthFiles() {
  return useProxyQuery({
    queryKey: ['authFiles'],
    queryFn: () => api().authFiles.list(),
    refetchInterval: 3000,
  });
}

export function useToggleAuthFile() {
  return useInvalidateQueriesMutation({
    mutationFn: ({ name, disabled }: { name: string; disabled: boolean }) =>
      api().authFiles.toggle(name, disabled),
    queryKeys: [['authFiles']],
  });
}

export function useDeleteAuthFile() {
  return useInvalidateQueriesMutation({
    mutationFn: (name: string) => api().authFiles.delete(name),
    queryKeys: [['authFiles']],
  });
}

// OAuth
export function useOAuthLogin() {
  return useMutation({
    mutationFn: (provider: string) => api().oauth.startLogin(provider),
  });
}

// Logs
export function useProcessLogs() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    api().proxy.getLogs().then(setLogs);

    const unsub = api().proxy.onLog((newLines: string[]) => {
      setLogs((prev) => [...prev, ...newLines].slice(-5000));
    });
    return unsub;
  }, []);

  return logs;
}

// Config — auto-fetches when proxy is running
export function useConfig() {
  return useProxyQuery({
    queryKey: ['config'],
    queryFn: () => api().config.get(),
  });
}

export function useUpdateConfigField() {
  return useInvalidateQueriesMutation({
    mutationFn: ({ field, value }: { field: string; value: any }) =>
      api().config.updateField(field, value),
    queryKeys: [['config']],
  });
}

// Usage
export function useUsage() {
  return useProxyQuery({
    queryKey: ['usage'],
    queryFn: () => api().usage.get(),
    refetchInterval: 5000,
  });
}

export function useModelDefinitions(channel: string, enabled: boolean = true) {
  return useProxyQuery({
    queryKey: ['models', channel],
    queryFn: () => api().models.get(channel),
    staleTime: 60000,
    enabled,
  });
}

export function useModelsDevCatalog(enabled: boolean = true) {
  return useQuery({
    queryKey: ['modelsDev'],
    queryFn: () => api().modelsDev.get(),
    enabled,
    staleTime: 600000,
  });
}
