import React from 'react';
import { GeneratorShell, type GeneratorDef, type SelectedModel } from './GeneratorShell';
import { createGeneratorChannelFormatMap, getSuffixThinkingOptions, stripSuffixVariant } from './shared';

const FORMAT_FAMILY: Record<string, 'claude' | 'openai' | 'gemini'> = {
  anthropic: 'claude',
  openai: 'openai',
  'openai-compat': 'openai',
  gemini: 'gemini',
};

function resolveSecondaryProfile(model: SelectedModel) {
  if (model.channel === 'codex') return { id: 'fast', label: 'Fast' };
  if (model.channel === 'claude') return { id: 'claude-1m', label: '1M' };
  return null;
}

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

  getSecondaryProfile(model) {
    return resolveSecondaryProfile(model);
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
      const providerKeyBase = format === 'anthropic'
        ? 'clanker-anthropic'
        : format === 'openai'
          ? 'clanker-openai'
          : format === 'gemini'
            ? 'clanker-gemini'
            : 'clanker-proxy';

      const standardModelList: any[] = [];
      const secondaryModelList: any[] = [];
      for (const model of models) {
        if (model.variants.length === 0 && model.secondaryVariants.length === 0) {
          standardModelList.push({
            id: model.id,
            name: `[clanker] ${model.displayName}`,
            default_max_tokens: model.maxOutputTokens,
            ...(model.contextLength ? { context_window: model.contextLength } : {}),
          });
          continue;
        }

        standardModelList.push(...buildModelEntries(model, model.variants, false));
        secondaryModelList.push(...buildModelEntries(model, model.secondaryVariants, true));
      }

      if (standardModelList.length > 0) {
        providers[providerKeyBase] = buildProviderConfig(format, port, apiKey, standardModelList, false, models);
      }
      if (secondaryModelList.length > 0) {
        providers[`${providerKeyBase}-${resolveProviderSecondarySuffix(models)}`] = buildProviderConfig(
          format,
          port,
          apiKey,
          secondaryModelList,
          true,
          models,
        );
      }
    }

    return {
      $schema: 'https://charm.land/crush.json',
      providers,
    };
  },
};

function buildModelEntries(model: SelectedModel, variants: string[], secondary: boolean): any[] {
  const secondaryProfile = resolveSecondaryProfile(model);
  return variants.map((suffix) => {
    const level = stripSuffixVariant(suffix);
    const name = secondary && secondaryProfile
      ? `[clanker] ${model.displayName} ${secondaryProfile.label} (${level})`
      : `[clanker] ${model.displayName} (${level})`;
    return {
      id: `${model.id}${suffix}`,
      name,
      default_max_tokens: model.maxOutputTokens,
      ...(model.contextLength ? { context_window: model.contextLength } : {}),
      can_reason: suffix !== '(none)',
    };
  });
}

function buildProviderConfig(
  format: string,
  port: number,
  apiKey: string,
  models: any[],
  secondary: boolean,
  selectedModels: SelectedModel[],
) {
  const secondaryProfile = resolveProviderSecondaryProfile(selectedModels);
  return {
    name: 'ClankerProxy',
    base_url: format === 'anthropic' ? `http://127.0.0.1:${port}` : `http://127.0.0.1:${port}/v1`,
    type: format === 'openai-compat' ? 'openai-compat' : format,
    api_key: apiKey,
    ...(secondary ? buildSecondaryProviderConfig(secondaryProfile) : {}),
    models,
  };
}

function resolveProviderSecondaryProfile(models: SelectedModel[]) {
  for (const model of models) {
    const profile = resolveSecondaryProfile(model);
    if (profile) return profile;
  }
  return null;
}

function resolveProviderSecondarySuffix(models: SelectedModel[]) {
  const profile = resolveProviderSecondaryProfile(models);
  return profile?.id === 'fast' ? 'fast' : '1m';
}

function buildSecondaryProviderConfig(profile: { id: string; label: string } | null): Record<string, any> {
  if (profile?.id === 'fast') {
    return {
      extra_body: {
        service_tier: 'priority',
      },
    };
  }
  if (profile?.id === 'claude-1m') {
    return {
      extra_headers: {
        'X-CPA-CLAUDE-1M': 'true',
      },
    };
  }
  return {};
}

interface Props {
  availableChannels: { channel: string; label: string }[];
}

export function CrushGenerator({ availableChannels }: Props) {
  return <GeneratorShell def={def} availableChannels={availableChannels} />;
}
