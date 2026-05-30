import { appLogger } from './app-logger';
import { fetchModelsDevCatalog } from './models-dev';
import { ProxyManager } from './proxy-manager';
import { store } from './store';

type TargetProvider = 'claude-api-key' | 'openai-compatibility';
type TargetKind = 'claude' | 'openai-compat';
type ProviderEntry = Record<string, any>;
type CatalogProvider = {
  id?: string;
  name?: string;
  npm?: string;
  api?: string;
  models?: Record<string, any>;
};

type ManagementClient = NonNullable<ProxyManager['client']>;
type ModelSnapshots = Record<string, string[]>;

interface UpdateSummary {
  entriesUpdated: number;
  modelsAdded: number;
}

let timer: ReturnType<typeof setInterval> | null = null;
let checking = false;

function log(msg: string) {
  appLogger.log(`[models.dev-updater] ${msg}`);
}

function getIntervalMinutes(): number {
  const configured = store.get('modelsDevPresetUpdateIntervalMinutes') || 30;
  return Math.max(1, configured);
}

function snapshotKey(target: TargetKind, id: string): string {
  return `${target}:${id}`;
}

function normalizeBaseUrl(value: string, stripV1 = false): string {
  let normalized = value.trim().replace(/\/+$/, '');
  if (stripV1) {
    normalized = normalized.replace(/\/v1$/i, '');
  }
  return normalized.toLowerCase();
}

function getProviderId(fallbackId: string, provider: CatalogProvider): string {
  return String(provider.id || fallbackId).trim();
}

function defaultBaseUrl(id: string): string {
  return `https://api.${id}.com/v1`;
}

function providerBaseUrl(id: string, provider: CatalogProvider, target: TargetKind): string {
  const baseUrl = String(provider.api || defaultBaseUrl(id));
  return target === 'claude' ? baseUrl.replace(/\/v1\/?$/i, '') : baseUrl;
}

function modelUsesAnthropicAPI(model: any, provider: CatalogProvider): boolean {
  const npm = String(model?.provider?.npm ?? provider.npm ?? '').toLowerCase();
  return npm.includes('anthropic');
}

function catalogModelsForTarget(
  id: string,
  provider: CatalogProvider,
  target: TargetKind,
): Array<{ name: string }> {
  const models = provider.models ?? {};
  const out: Array<{ name: string }> = [];

  for (const [fallbackModelId, model] of Object.entries(models)) {
    const modelId = String((model as any)?.id || fallbackModelId).trim();
    if (!modelId) continue;

    const isAnthropic = modelUsesAnthropicAPI(model, provider);
    if ((target === 'claude') !== isAnthropic) {
      continue;
    }

    out.push({ name: modelId });
  }

  return out;
}

function catalogModelIdsForTarget(id: string, provider: CatalogProvider, target: TargetKind): string[] {
  return catalogModelsForTarget(id, provider, target).map((model) => model.name);
}

function getProviderModelName(model: any): string {
  return String(model?.name ?? model?.id ?? model?.alias ?? '').trim();
}

function mergeMissingModels(existingModels: any[] = [], newModels: Array<{ name: string }>): {
  models: any[];
  added: number;
} {
  const seen = new Set(existingModels.map((model) => getProviderModelName(model)).filter(Boolean));
  const merged = [...existingModels];
  let added = 0;

  for (const model of newModels) {
    if (!model.name || seen.has(model.name)) {
      continue;
    }

    seen.add(model.name);
    merged.push(model);
    added += 1;
  }

  return { models: merged, added };
}

function entryMatchesProvider(
  entry: ProviderEntry,
  id: string,
  provider: CatalogProvider,
  target: TargetKind,
): boolean {
  const normalizedId = id.toLowerCase();
  const normalizedName = String(provider.name || '').trim().toLowerCase();
  const identities = [entry.name, entry.prefix]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  if (identities.some((value) => value === normalizedId || value === normalizedName)) {
    return true;
  }

  const entryBaseUrl = normalizeBaseUrl(String(entry['base-url'] || ''), target === 'claude');
  const catalogBaseUrl = normalizeBaseUrl(providerBaseUrl(id, provider, target), target === 'claude');
  return Boolean(entryBaseUrl && catalogBaseUrl && entryBaseUrl === catalogBaseUrl);
}

async function updateProviderKeyModels(
  client: ManagementClient,
  targetProvider: TargetProvider,
  target: TargetKind,
  catalog: Record<string, CatalogProvider>,
  snapshots: ModelSnapshots,
  nextSnapshots: ModelSnapshots,
): Promise<UpdateSummary> {
  const entries = await client.getProviderKeys(targetProvider);
  if (entries.length === 0) {
    return { entriesUpdated: 0, modelsAdded: 0 };
  }

  const nextEntries = [...entries];
  let entriesUpdated = 0;
  let modelsAdded = 0;

  for (let entryIndex = 0; entryIndex < nextEntries.length; entryIndex += 1) {
    const entry = nextEntries[entryIndex];
    let entryModels = Array.isArray(entry.models) ? entry.models : [];
    let entryAdded = 0;

    for (const [fallbackId, provider] of Object.entries(catalog)) {
      const id = getProviderId(fallbackId, provider);
      if (!id || !entryMatchesProvider(entry, id, provider, target)) {
        continue;
      }

      const catalogModels = catalogModelsForTarget(id, provider, target);
      if (catalogModels.length === 0) {
        continue;
      }

      const key = snapshotKey(target, id);
      const previousModelIds = snapshots[key];
      const currentModelIds = catalogModels.map((model) => model.name);
      nextSnapshots[key] = currentModelIds;

      if (!previousModelIds) {
        continue;
      }

      const previousModelSet = new Set(previousModelIds);
      const newCatalogModels = catalogModels.filter((model) => !previousModelSet.has(model.name));
      const result = mergeMissingModels(entryModels, newCatalogModels);
      entryModels = result.models;
      entryAdded += result.added;
    }

    if (entryAdded > 0) {
      nextEntries[entryIndex] = {
        ...entry,
        models: entryModels,
      };
      entriesUpdated += 1;
      modelsAdded += entryAdded;
    }
  }

  if (modelsAdded > 0) {
    await client.putProviderKeys(targetProvider, nextEntries);
  }

  return { entriesUpdated, modelsAdded };
}

export async function checkModelsDevPresetUpdates(proxyManager: ProxyManager): Promise<UpdateSummary> {
  if (!store.get('autoUpdateModelsDevPresets')) {
    return { entriesUpdated: 0, modelsAdded: 0 };
  }

  if (checking) {
    return { entriesUpdated: 0, modelsAdded: 0 };
  }

  const client = proxyManager.client;
  if (proxyManager.state !== 'running' || !client) {
    log('Proxy is not running; skipping preset check.');
    return { entriesUpdated: 0, modelsAdded: 0 };
  }

  checking = true;
  try {
    log('Checking models.dev presets...');
    const catalog = await fetchModelsDevCatalog({ force: true });
    const snapshots = store.get('modelsDevPresetModelSnapshots') ?? {};
    const nextSnapshots = { ...snapshots };
    const claude = await updateProviderKeyModels(client, 'claude-api-key', 'claude', catalog, snapshots, nextSnapshots);
    const openAICompat = await updateProviderKeyModels(client, 'openai-compatibility', 'openai-compat', catalog, snapshots, nextSnapshots);
    const summary = {
      entriesUpdated: claude.entriesUpdated + openAICompat.entriesUpdated,
      modelsAdded: claude.modelsAdded + openAICompat.modelsAdded,
    };
    store.set('modelsDevPresetModelSnapshots', nextSnapshots);

    if (summary.modelsAdded > 0) {
      log(`Added ${summary.modelsAdded} new model${summary.modelsAdded === 1 ? '' : 's'} to ${summary.entriesUpdated} preset entr${summary.entriesUpdated === 1 ? 'y' : 'ies'}.`);
    } else {
      log('No preset model updates found.');
    }

    return summary;
  } catch (err) {
    log(`Preset check failed: ${err}`);
    return { entriesUpdated: 0, modelsAdded: 0 };
  } finally {
    checking = false;
  }
}

export async function registerModelsDevPresetSnapshot(providerId: string): Promise<void> {
  const normalizedProviderId = providerId.trim();
  if (!normalizedProviderId) return;

  const catalog = await fetchModelsDevCatalog();
  const provider = (catalog[normalizedProviderId] as CatalogProvider | undefined)
    ?? (Object.values(catalog) as CatalogProvider[])
      .find((candidate) => String(candidate.id || '').trim() === normalizedProviderId);

  if (!provider) {
    log(`Could not register preset snapshot; provider "${normalizedProviderId}" was not found in models.dev.`);
    return;
  }

  const id = getProviderId(normalizedProviderId, provider);
  const nextSnapshots = { ...(store.get('modelsDevPresetModelSnapshots') ?? {}) };

  for (const target of ['claude', 'openai-compat'] as const) {
    const modelIds = catalogModelIdsForTarget(id, provider, target);
    if (modelIds.length > 0) {
      nextSnapshots[snapshotKey(target, id)] = modelIds;
    }
  }

  store.set('modelsDevPresetModelSnapshots', nextSnapshots);
}

export function startModelsDevPresetUpdater(proxyManager: ProxyManager): void {
  stopModelsDevPresetUpdater();

  if (!store.get('autoUpdateModelsDevPresets')) return;

  const minutes = getIntervalMinutes();
  const ms = minutes * 60 * 1000;

  log(`Enabled, checking every ${minutes} minutes`);
  void checkModelsDevPresetUpdates(proxyManager);

  timer = setInterval(() => {
    void checkModelsDevPresetUpdates(proxyManager);
  }, ms);
}

export function stopModelsDevPresetUpdater(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function restartModelsDevPresetUpdater(proxyManager: ProxyManager): void {
  startModelsDevPresetUpdater(proxyManager);
}
