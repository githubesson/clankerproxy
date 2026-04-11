import type { ClankerProxyAPI } from '../../preload/preload';

export type ProviderKeyEntry = Record<string, any>;

type ProviderKeysAPI = Pick<ClankerProxyAPI, 'providerKeys'>;

export function getProviderModelName(model: any): string {
  return model?.name ?? model?.id ?? model?.alias ?? '';
}

export function maskSecret(secret: string): string {
  return secret.length > 16 ? `${secret.slice(0, 10)}..${secret.slice(-4)}` : secret;
}

export function getProviderEntrySecret(entry: ProviderKeyEntry): string {
  return entry['api-key'] || entry['api-key-entries']?.[0]?.['api-key'] || '';
}

export function safeHostname(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

export function getProviderEntryTitle(entry: ProviderKeyEntry): string {
  return entry.name || entry.prefix || (entry['base-url'] ? safeHostname(entry['base-url']) : '');
}

export function getCustomClaudeChannelLabel(entry: ProviderKeyEntry): string {
  return entry.prefix || safeHostname(entry['base-url'] || '');
}

export function mergeUniqueModels(existingModels: any[] = [], newModels: any[] = []): any[] {
  const seen = new Set(existingModels.map(getProviderModelName));
  const merged = [...existingModels];

  for (const model of newModels) {
    const modelName = getProviderModelName(model);
    if (!modelName || seen.has(modelName)) {
      continue;
    }

    seen.add(modelName);
    merged.push(model);
  }

  return merged;
}

export async function upsertProviderEntryModels({
  api,
  provider,
  baseUrl,
  newModels,
  createEntry,
}: {
  api: ProviderKeysAPI;
  provider: string;
  baseUrl: string;
  newModels: any[];
  createEntry: () => ProviderKeyEntry;
}): Promise<ProviderKeyEntry[]> {
  if (newModels.length === 0) {
    return api.providerKeys.list(provider);
  }

  const existingEntries = await api.providerKeys.list(provider);
  const nextEntries = [...existingEntries];
  const matchIndex = nextEntries.findIndex((entry) => (entry['base-url'] ?? '') === baseUrl);

  if (matchIndex >= 0) {
    nextEntries[matchIndex] = {
      ...nextEntries[matchIndex],
      models: mergeUniqueModels(nextEntries[matchIndex].models, newModels),
    };
  } else {
    nextEntries.push(createEntry());
  }

  await api.providerKeys.put(provider, nextEntries);
  return nextEntries;
}
