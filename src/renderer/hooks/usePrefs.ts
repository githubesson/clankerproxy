import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const api = () => window.clankerProxy;

export function usePref<T>(key: string, defaultValue: T) {
  return useQuery({
    queryKey: ['prefs', key],
    queryFn: async () => {
      const val = await api().prefs.get(key);
      return (val ?? defaultValue) as T;
    },
  });
}

export function useSetPref(key: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: any) => api().prefs.set(key, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prefs', key] }),
  });
}
