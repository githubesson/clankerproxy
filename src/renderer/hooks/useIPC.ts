import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import type { ClankerProxyAPI } from '../../preload/index';

declare global {
  interface Window {
    clankerProxy: ClankerProxyAPI;
  }
}

const api = () => window.clankerProxy;

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
  }, [query]);

  return query;
}

/** True when the proxy is running — used to gate management API queries */
export function useIsProxyRunning(): boolean {
  const { data } = useProxyStatus();
  return data?.state === 'running';
}

export function useStartProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api().proxy.start(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['proxy', 'status'] }),
  });
}

export function useStopProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api().proxy.stop(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['proxy', 'status'] }),
  });
}

export function useRestartProxy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api().proxy.restart(),
    onSettled: () => qc.invalidateQueries({ queryKey: ['proxy', 'status'] }),
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (release?: any) => api().binary.download(release),
    onSettled: () => qc.invalidateQueries({ queryKey: ['binary'] }),
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
  const running = useIsProxyRunning();
  return useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => api().apiKeys.list(),
    enabled: running,
    refetchInterval: running ? 5000 : false,
  });
}

export function useAddAPIKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => api().apiKeys.add(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apiKeys'] }),
  });
}

export function useDeleteAPIKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (index: number) => api().apiKeys.delete(index),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apiKeys'] }),
  });
}

// Provider Keys
export function useProviderKeys(provider: string) {
  const running = useIsProxyRunning();
  return useQuery({
    queryKey: ['providerKeys', provider],
    queryFn: () => api().providerKeys.list(provider),
    enabled: running,
    refetchInterval: running ? 5000 : false,
  });
}

// Auth Files — auto-fetches when proxy is running, polls every 3s
export function useAuthFiles() {
  const running = useIsProxyRunning();
  return useQuery({
    queryKey: ['authFiles'],
    queryFn: () => api().authFiles.list(),
    enabled: running,
    refetchInterval: running ? 3000 : false,
  });
}

export function useToggleAuthFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, disabled }: { name: string; disabled: boolean }) =>
      api().authFiles.toggle(name, disabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['authFiles'] }),
  });
}

export function useDeleteAuthFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api().authFiles.delete(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['authFiles'] }),
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
  const running = useIsProxyRunning();
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api().config.get(),
    enabled: running,
  });
}

// Usage
export function useUsage() {
  const running = useIsProxyRunning();
  return useQuery({
    queryKey: ['usage'],
    queryFn: () => api().usage.get(),
    enabled: running,
    refetchInterval: running ? 5000 : false,
  });
}
