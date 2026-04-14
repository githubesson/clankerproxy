import React from 'react';
import { GeneratorShell, type GeneratorDef, type SelectedModel } from './GeneratorShell';
import { createGeneratorChannelFormatMap, getSuffixThinkingOptions, stripSuffixVariant } from './shared';

const FORMAT_FAMILY: Record<string, 'claude' | 'openai'> = {
  anthropic: 'claude',
  openai: 'openai',
  'generic-chat-completion-api': 'openai',
};

function resolveSecondaryProfile(model: SelectedModel) {
  if (model.channel === 'codex') return { id: 'fast', label: 'Fast' };
  if (model.channel === 'claude') return { id: 'claude-1m', label: '1M' };
  return null;
}

const def: GeneratorDef = {
  name: 'Factory Droid',
  description: '~/.factory/settings.json',
  apiKeyPlaceholder: '${PROXY_API_KEY}',
  formats: [
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'generic-chat-completion-api', label: 'Generic' },
  ],
  channelFormatMap: createGeneratorChannelFormatMap({
    anthropic: 'anthropic',
    openai: 'openai',
    compat: 'openai',
  }),

  getThinkingOptions(format) {
    return getSuffixThinkingOptions(format, FORMAT_FAMILY);
  },

  getSecondaryProfile(model) {
    return resolveSecondaryProfile(model);
  },

  getVariantName(_format, value) {
    return stripSuffixVariant(value);
  },

  buildOutput({ selected, port, apiKey }) {
    const entries: any[] = [];

    for (const model of selected) {
      const baseUrl = model.format === 'anthropic' ? `http://127.0.0.1:${port}` : `http://127.0.0.1:${port}/v1`;
      const base = {
        baseUrl,
        apiKey,
        provider: model.format,
        ...(model.maxOutputTokens ? { maxOutputTokens: model.maxOutputTokens } : {}),
      };

      if (model.variants.length === 0 && model.secondaryVariants.length === 0) {
        entries.push({ model: model.id, displayName: `[clanker] ${model.displayName}`, ...base });
        continue;
      }

      entries.push(...buildVariantEntries(model, base, model.variants, false));
      entries.push(...buildVariantEntries(model, base, model.secondaryVariants, true));
    }

    return { customModels: entries };
  },
};

function buildVariantEntries(
  model: SelectedModel,
  base: Record<string, any>,
  variants: string[],
  secondary: boolean,
) {
  const secondaryProfile = resolveSecondaryProfile(model);
  return variants.map((suffix) => {
    const parts = ['[clanker]', model.displayName];
    if (secondary && secondaryProfile) {
      parts.push(secondaryProfile.label);
    }
    parts.push(stripSuffixVariant(suffix));

    return {
      model: `${model.id}${suffix}`,
      displayName: parts.join(' '),
      ...base,
      ...(secondary ? buildSecondaryProfileConfig(model) : {}),
    };
  });
}

function buildSecondaryProfileConfig(model: SelectedModel): Record<string, any> {
  if (model.channel === 'codex') {
    return { extraArgs: { service_tier: 'priority' } };
  }
  if (model.channel === 'claude') {
    return {
      extraHeaders: {
        'X-CPA-CLAUDE-1M': 'true',
      },
    };
  }
  return {};
}

interface Props {
  availableChannels: { channel: string; label: string }[];
}

export function FactoryDroidGenerator({ availableChannels }: Props) {
  return <GeneratorShell def={def} availableChannels={availableChannels} />;
}
