import type { ClankerProxyAPI } from '../../preload/preload';
import { getCustomClaudeChannelLabel, getProviderModelName } from './providerKeys';

type ProviderKeysAPI = Pick<ClankerProxyAPI, 'providerKeys'>;

export function isCustomChannel(channel: string): boolean {
  return channel.startsWith('custom:') || channel.startsWith('custom-claude:');
}

export async function resolveCustomChannelModels(
  api: ProviderKeysAPI,
  channel: string,
  modelsCatalog?: Record<string, any>,
): Promise<any[]> {
  const { providerName, providerModels } = await getCustomChannelProviderModels(api, channel);
  const providerCatalog = modelsCatalog?.[providerName]?.models ?? {};
  const primaryModels = mapProviderModels(providerModels, providerCatalog);

  if (primaryModels.length > 0 && primaryModels.every((model) => !model.context_length) && modelsCatalog) {
    return mapProviderModels(providerModels, flattenCatalogModels(modelsCatalog));
  }

  return primaryModels;
}

async function getCustomChannelProviderModels(
  api: ProviderKeysAPI,
  channel: string,
): Promise<{ providerName: string; providerModels: any[] }> {
  if (channel.startsWith('custom:')) {
    const providerName = channel.slice('custom:'.length);
    const entries = await api.providerKeys.list('openai-compatibility');
    const entry = entries.find((candidate: any) => candidate.name === providerName);

    return {
      providerName,
      providerModels: entry?.models ?? [],
    };
  }

  const label = channel.slice('custom-claude:'.length);
  const entries = await api.providerKeys.list('claude-api-key');
  const entry = entries.find((candidate: any) => getCustomClaudeChannelLabel(candidate) === label);

  return {
    providerName: label,
    providerModels: entry?.models ?? [],
  };
}

function mapProviderModels(providerModels: any[], catalogModels: Record<string, any>): any[] {
  return providerModels.map((model) => {
    const modelId = getProviderModelName(model);
    const catalogModel = catalogModels[modelId] ?? {};

    return {
      id: modelId,
      display_name: catalogModel.name || model.alias || model.name,
      max_completion_tokens: catalogModel.limit?.output ?? 0,
      context_length: catalogModel.limit?.context ?? 0,
      reasoning: catalogModel.reasoning ?? false,
      tool_call: catalogModel.tool_call ?? false,
    };
  });
}

function flattenCatalogModels(modelsCatalog: Record<string, any>): Record<string, any> {
  const allModels: Record<string, any> = {};

  for (const provider of Object.values(modelsCatalog)) {
    for (const [modelId, model] of Object.entries((provider as any)?.models ?? {})) {
      allModels[modelId] = model;
    }
  }

  return allModels;
}
