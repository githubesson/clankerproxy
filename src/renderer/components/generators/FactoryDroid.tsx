import React from 'react';
import { GeneratorShell, type GeneratorDef } from './GeneratorShell';
import { createGeneratorChannelFormatMap, getSuffixThinkingOptions, stripSuffixVariant } from './shared';

const FORMAT_FAMILY: Record<string, 'claude' | 'openai'> = {
  anthropic: 'claude',
  openai: 'openai',
  'generic-chat-completion-api': 'openai',
};

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

      if (model.variants.length === 0) {
        entries.push({ model: model.id, displayName: `[clanker] ${model.displayName}`, ...base });
        continue;
      }

      for (const suffix of model.variants) {
        entries.push({
          model: `${model.id}${suffix}`,
          displayName: `[clanker] ${model.displayName} ${suffix}`,
          ...base,
        });
      }
    }

    return { customModels: entries };
  },
};

interface Props {
  availableChannels: { channel: string; label: string }[];
}

export function FactoryDroidGenerator({ availableChannels }: Props) {
  return <GeneratorShell def={def} availableChannels={availableChannels} />;
}
