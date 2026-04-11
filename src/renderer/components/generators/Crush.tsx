import React from 'react';
import { GeneratorShell, type GeneratorDef, type SelectedModel } from './GeneratorShell';
import { createGeneratorChannelFormatMap, getSuffixThinkingOptions, stripSuffixVariant } from './shared';

const FORMAT_FAMILY: Record<string, 'claude' | 'openai' | 'gemini'> = {
  anthropic: 'claude',
  openai: 'openai',
  'openai-compat': 'openai',
  gemini: 'gemini',
};

const def: GeneratorDef = {
  name: 'Crush',
  description: 'crush.json (project) or ~/.config/crush/crush.json (global)',
  apiKeyPlaceholder: '$PROXY_API_KEY',
  formats: [
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'openai-compat', label: 'OpenAI Compatible' },
    { value: 'gemini', label: 'Gemini' },
  ],
  channelFormatMap: createGeneratorChannelFormatMap({
    anthropic: 'anthropic',
    openai: 'openai',
    compat: 'openai-compat',
  }),

  getThinkingOptions(format) {
    return getSuffixThinkingOptions(format, FORMAT_FAMILY);
  },

  getVariantName(_format, value) {
    return stripSuffixVariant(value);
  },

  buildOutput({ selected, port, apiKey }) {
    const byFormat: Record<string, SelectedModel[]> = {};
    for (const model of selected) {
      (byFormat[model.format] ??= []).push(model);
    }

    const providers: Record<string, any> = {};

    for (const [format, models] of Object.entries(byFormat)) {
      const providerKey = format === 'anthropic'
        ? 'clanker-anthropic'
        : format === 'openai'
          ? 'clanker-openai'
          : format === 'gemini'
            ? 'clanker-gemini'
            : 'clanker-proxy';

      const modelList: any[] = [];
      for (const model of models) {
        if (model.variants.length === 0) {
          modelList.push({
            id: model.id,
            name: `[clanker] ${model.displayName}`,
            default_max_tokens: model.maxOutputTokens,
            ...(model.contextLength ? { context_window: model.contextLength } : {}),
          });
          continue;
        }

        for (const suffix of model.variants) {
          const level = stripSuffixVariant(suffix);
          modelList.push({
            id: `${model.id}${suffix}`,
            name: `[clanker] ${model.displayName} (${level})`,
            default_max_tokens: model.maxOutputTokens,
            ...(model.contextLength ? { context_window: model.contextLength } : {}),
            can_reason: suffix !== '(none)',
          });
        }
      }

      providers[providerKey] = {
        name: 'ClankerProxy',
        base_url: format === 'anthropic' ? `http://127.0.0.1:${port}` : `http://127.0.0.1:${port}/v1`,
        type: format === 'openai-compat' ? 'openai-compat' : format,
        api_key: apiKey,
        models: modelList,
      };
    }

    return {
      $schema: 'https://charm.land/crush.json',
      providers,
    };
  },
};

interface Props {
  availableChannels: { channel: string; label: string }[];
}

export function CrushGenerator({ availableChannels }: Props) {
  return <GeneratorShell def={def} availableChannels={availableChannels} />;
}
