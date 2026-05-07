import React from 'react';
import { GeneratorShell, type GeneratorDef, type SelectedModel } from './GeneratorShell';
import { createGeneratorChannelFormatMap, getGeminiSuffixThinkingOptions, stripSuffixVariant } from './shared';

const ANTHROPIC_CHIPS = [
  { value: 'disabled', label: 'Off' },
  { value: 'adaptive', label: 'Adaptive' },
  { value: '1024', label: 'Low' },
  { value: '8192', label: 'Medium' },
  { value: '16000', label: 'Med-High' },
  { value: '24576', label: 'High' },
  { value: '32768', label: 'XHigh' },
  { value: '128000', label: 'Max' },
];

const OPENAI_CHIPS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'XHigh' },
];

const NPM: Record<string, string> = {
  anthropic: '@ai-sdk/anthropic',
  openai: '@ai-sdk/openai',
  'openai-compatible': '@ai-sdk/openai-compatible',
  google: '@ai-sdk/google',
};

function buildThinkingOptions(fmt: string, v: string): Record<string, any> {
  if (fmt === 'anthropic') {
    if (v === 'disabled') return { thinking: { type: 'disabled' } };
    if (v === 'adaptive') return { thinking: { type: 'adaptive' } };
    return { thinking: { type: 'enabled', budgetTokens: parseInt(v) } };
  }
  if (fmt === 'google') {
    return {};
  }
  return { reasoningEffort: v };
}

const GEMINI_LEVEL_BUDGET: Record<string, number> = {
  minimal: 512,
  low: 1024,
  medium: 8192,
  high: 24576,
  xhigh: 32768,
  max: 128000,
};

function buildGeminiThinkingOptions(model: SelectedModel, suffix: string): Record<string, any> {
  const level = stripSuffixVariant(suffix);
  const levels = model.thinking?.levels;

  if (Array.isArray(levels) && levels.length > 0) {
    if (level === 'none') {
      return {
        thinkingConfig: {
          includeThoughts: false,
          thinkingLevel: String(levels[0]).trim().toLowerCase(),
        },
      };
    }
    return {
      thinkingConfig: {
        includeThoughts: true,
        thinkingLevel: level,
      },
    };
  }

  if (level === 'none') {
    return {
      thinkingConfig: {
        includeThoughts: false,
        thinkingBudget: 0,
      },
    };
  }

  return {
    thinkingConfig: {
      includeThoughts: true,
      thinkingBudget: GEMINI_LEVEL_BUDGET[level] ?? 8192,
    },
  };
}

function buildFastModeOptions(fmt: string): Record<string, any> {
  if (fmt === 'openai') {
    return { serviceTier: 'priority' };
  }
  if (fmt === 'openai-compatible') {
    return { service_tier: 'priority' };
  }
  return {};
}

function buildClaude1MOptions(): Record<string, any> {
  return {
    headers: {
      'X-CPA-CLAUDE-1M': 'true',
    },
  };
}

function buildSecondaryProfileOptions(model: SelectedModel, fmt: string): Record<string, any> {
  if (model.channel === 'codex') {
    return buildFastModeOptions(fmt);
  }
  if (model.channel === 'claude') {
    return buildClaude1MOptions();
  }
  return {};
}

function secondaryVariantName(model: SelectedModel, fmt: string, v: string): string {
  if (model.channel === 'codex') {
    return `fast-${variantName(fmt, v)}`;
  }
  if (model.channel === 'claude') {
    return `1m-${variantName(fmt, v)}`;
  }
  return variantName(fmt, v);
}

function buildVariantOptions(model: SelectedModel, fmt: string, v: string, secondary: boolean): Record<string, any> {
  return {
    ...buildThinkingOptions(fmt, v),
    ...(secondary ? buildSecondaryProfileOptions(model, fmt) : {}),
  };
}

function buildGeminiModelEntries(model: SelectedModel): Record<string, any> {
  const entry: Record<string, any> = {
    name: `[clanker] ${model.displayName}`,
    ...buildLimit(model),
  };

  if (model.variants.length > 0) {
    entry.variants = Object.fromEntries(
      model.variants.map((suffix) => [variantName('google', suffix), buildGeminiThinkingOptions(model, suffix)]),
    );
  }

  return { [model.id]: entry };
}

const BUDGET_LEVEL_NAME: Record<string, string> = {
  '1024': 'low',
  '8192': 'medium',
  '16000': 'medium-high',
  '24576': 'high',
  '32768': 'xhigh',
  '128000': 'max',
};

function variantName(fmt: string, v: string): string {
  if (fmt === 'google') {
    return stripSuffixVariant(v);
  }
  if (fmt === 'anthropic') {
    if (v === 'disabled') return 'no-thinking';
    if (v === 'adaptive') return 'adaptive';
    return BUDGET_LEVEL_NAME[v] ?? `thinking-${v}`;
  }
  return v; // openai: just "low", "medium", "high", "xhigh"
}

const def: GeneratorDef = {
  name: 'OpenCode',
  description: 'opencode.json provider config',
  apiKeyPlaceholder: '{env:PROXY_API_KEY}',
  formats: [
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'openai-compatible', label: 'OpenAI Compatible' },
    { value: 'google', label: 'Google' },
  ],
  channelFormatMap: createGeneratorChannelFormatMap({
    anthropic: 'anthropic',
    openai: 'openai',
    compat: 'openai-compatible',
    google: 'google',
  }),

  getThinkingOptions(format, model) {
    if (format === 'google') {
      return getGeminiSuffixThinkingOptions(model);
    }
    return format === 'anthropic' ? ANTHROPIC_CHIPS : OPENAI_CHIPS;
  },

  getSecondaryProfile(model) {
    if (model.channel === 'codex') return { id: 'fast', label: 'Fast' };
    if (model.channel === 'claude') return { id: 'claude-1m', label: '1M' };
    return null;
  },

  getVariantName(format, value) {
    return variantName(format, value);
  },

  buildOutput({ selected, port, apiKey }) {
    const byFormat: Record<string, SelectedModel[]> = {};
    for (const s of selected) {
      (byFormat[s.format] ??= []).push(s);
    }

    const provider: Record<string, any> = {};

    for (const [fmt, fmtModels] of Object.entries(byFormat)) {
      const key = fmt === 'anthropic'
        ? 'clanker-anthropic'
        : fmt === 'openai'
          ? 'clanker-openai'
          : fmt === 'google'
            ? 'clanker-google'
            : 'clanker-proxy';

      const modelsObj: Record<string, any> = {};
      for (const m of fmtModels) {
        if (fmt === 'google') {
          Object.assign(modelsObj, buildGeminiModelEntries(m));
          continue;
        }

        const entry: Record<string, any> = {
          name: `[clanker] ${m.displayName}`,
          ...buildLimit(m),
        };

        const totalVariants = m.variants.length + m.secondaryVariants.length;

        if (totalVariants === 1) {
          if (m.variants.length === 1) {
            entry.options = buildVariantOptions(m, fmt, m.variants[0], false);
          } else if (m.secondaryVariants.length === 1) {
            entry.options = buildVariantOptions(m, fmt, m.secondaryVariants[0], true);
          }
        } else if (totalVariants > 1) {
          const variants: Record<string, any> = {};
          for (const v of m.variants) {
            variants[variantName(fmt, v)] = buildVariantOptions(m, fmt, v, false);
          }
          for (const v of m.secondaryVariants) {
            variants[secondaryVariantName(m, fmt, v)] = buildVariantOptions(m, fmt, v, true);
          }
          entry.variants = variants;
        }

        modelsObj[m.id] = entry;
      }

      provider[key] = {
        npm: NPM[fmt],
        name: 'ClankerProxy',
        options: { baseURL: buildProviderBaseURL(fmt, port), apiKey },
        models: modelsObj,
      };
    }

    return { $schema: 'https://opencode.ai/config.json', provider };
  },
};

function buildLimit(model: SelectedModel): Record<string, any> {
  if (model.contextLength > 0 && model.maxOutputTokens > 0 && model.maxOutputTokens !== 16384) {
    return { limit: { context: model.contextLength, output: model.maxOutputTokens } };
  }
  return {};
}

function buildProviderBaseURL(format: string, port: number): string {
  return format === 'google'
    ? `http://127.0.0.1:${port}/v1beta`
    : `http://127.0.0.1:${port}/v1`;
}

interface Props {
  availableChannels: { channel: string; label: string }[];
}

export function OpenCodeGenerator({ availableChannels }: Props) {
  return <GeneratorShell def={def} availableChannels={availableChannels} />;
}
