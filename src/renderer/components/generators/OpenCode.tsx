import React from 'react';
import { GeneratorShell, type GeneratorDef, type SelectedModel } from './GeneratorShell';
import { createGeneratorChannelFormatMap } from './shared';

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
};

function buildThinkingOptions(fmt: string, v: string): Record<string, any> {
  if (fmt === 'anthropic') {
    if (v === 'disabled') return { thinking: { type: 'disabled' } };
    if (v === 'adaptive') return { thinking: { type: 'adaptive' } };
    return { thinking: { type: 'enabled', budgetTokens: parseInt(v) } };
  }
  return { reasoningEffort: v };
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

function buildVariantOptions(fmt: string, v: string, fast: boolean, fastSupported: boolean): Record<string, any> {
  return {
    ...buildThinkingOptions(fmt, v),
    ...(fast && fastSupported ? buildFastModeOptions(fmt) : {}),
  };
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
  ],
  channelFormatMap: createGeneratorChannelFormatMap({
    anthropic: 'anthropic',
    openai: 'openai',
    compat: 'openai-compatible',
  }),

  getThinkingOptions(format) {
    return format === 'anthropic' ? ANTHROPIC_CHIPS : OPENAI_CHIPS;
  },

  supportsFastMode(model) {
    return model.channel === 'codex';
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
      const key = fmt === 'anthropic' ? 'clanker-anthropic' : fmt === 'openai' ? 'clanker-openai' : 'clanker-proxy';

      const modelsObj: Record<string, any> = {};
      for (const m of fmtModels) {
        const fastSupported = m.channel === 'codex';
        const entry: Record<string, any> = {
          name: `[clanker] ${m.displayName}`,
        };
        // Only include limit when both values are known (not fallback defaults)
        if (m.contextLength > 0 && m.maxOutputTokens > 0 && m.maxOutputTokens !== 16384) {
          entry.limit = { context: m.contextLength, output: m.maxOutputTokens };
        }

        const totalVariants = m.variants.length + m.fastVariants.length;

        if (totalVariants === 1) {
          if (m.variants.length === 1) {
            entry.options = buildVariantOptions(fmt, m.variants[0], false, fastSupported);
          } else if (m.fastVariants.length === 1) {
            entry.options = buildVariantOptions(fmt, m.fastVariants[0], true, fastSupported);
          }
        } else if (totalVariants > 1) {
          const variants: Record<string, any> = {};
          for (const v of m.variants) {
            variants[variantName(fmt, v)] = buildVariantOptions(fmt, v, false, fastSupported);
          }
          for (const v of m.fastVariants) {
            variants[`fast-${variantName(fmt, v)}`] = buildVariantOptions(fmt, v, true, fastSupported);
          }
          entry.variants = variants;
        }

        modelsObj[m.id] = entry;
      }

      provider[key] = {
        npm: NPM[fmt],
        name: 'ClankerProxy',
        options: { baseURL: `http://127.0.0.1:${port}/v1`, apiKey },
        models: modelsObj,
      };
    }

    return { $schema: 'https://opencode.ai/config.json', provider };
  },
};

interface Props {
  availableChannels: { channel: string; label: string }[];
}

export function OpenCodeGenerator({ availableChannels }: Props) {
  return <GeneratorShell def={def} availableChannels={availableChannels} />;
}
