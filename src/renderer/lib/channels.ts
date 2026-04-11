import type { ClankerProxyAPI } from '../../preload/preload';
import { AUTH_DETECTED_CHANNELS, NATIVE_PROVIDER_KEY_CHANNELS } from '../../shared/provider-registry';
import { getCustomClaudeChannelLabel } from './providerKeys';

export interface ChannelOption {
  channel: string;
  label: string;
}

export interface ConfiguredProviderChannels {
  channels: string[];
  customChannels: ChannelOption[];
}

export async function getConfiguredProviderChannels(
  api: Pick<ClankerProxyAPI, 'providerKeys'>,
): Promise<ConfiguredProviderChannels> {
  const channels: string[] = [];
  const customChannels: ChannelOption[] = [];

  for (const provider of NATIVE_PROVIDER_KEY_CHANNELS) {
    try {
      const keys = await api.providerKeys.list(provider.providerId);
      if (keys.length > 0) {
        channels.push(provider.channel);
      }
    } catch {
      // Ignore unavailable provider endpoints until the backend supports them.
    }
  }

  try {
    const openAICompatEntries = await api.providerKeys.list('openai-compatibility');
    for (const entry of openAICompatEntries ?? []) {
      if (entry.name && entry.models?.length > 0) {
        customChannels.push({
          channel: `custom:${entry.name}`,
          label: `${entry.name} (openai-compat)`,
        });
      }
    }
  } catch {
    // Ignore unsupported endpoints.
  }

  try {
    const claudeEntries = await api.providerKeys.list('claude-api-key');
    for (const entry of claudeEntries ?? []) {
      if (entry['base-url'] && entry.models?.length > 0) {
        const label = getCustomClaudeChannelLabel(entry);
        customChannels.push({
          channel: `custom-claude:${label}`,
          label: `${label} (anthropic)`,
        });
      }
    }
  } catch {
    // Ignore unsupported endpoints.
  }

  return { channels, customChannels };
}

export function buildAvailableChannels(
  authFiles: any[] | undefined,
  configuredProviders?: ConfiguredProviderChannels,
): ChannelOption[] {
  const activeChannels = new Set<string>();

  for (const authFile of authFiles ?? []) {
    const haystack = `${authFile.name ?? ''} ${authFile.provider ?? ''}`.toLowerCase();
    for (const channel of AUTH_DETECTED_CHANNELS) {
      if (channel.authPatterns?.some((pattern) => haystack.includes(pattern))) {
        activeChannels.add(channel.channel);
      }
    }
  }

  for (const channel of configuredProviders?.channels ?? []) {
    if (channel === 'claude') {
      activeChannels.add('claude');
    }
    if (channel === 'codex') {
      activeChannels.add('codex');
    }
    if (channel === 'gemini' || channel === 'vertex') {
      activeChannels.add('gemini');
      activeChannels.add('gemini-cli');
    }
  }

  return [
    ...AUTH_DETECTED_CHANNELS
      .filter((channel) => activeChannels.has(channel.channel))
      .map(({ channel, label }) => ({ channel, label })),
    ...(configuredProviders?.customChannels ?? []),
  ];
}
