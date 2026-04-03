import React from 'react';
import { GeneratorShell, type GeneratorDef, type SelectedModel } from './GeneratorShell';

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

const CHANNEL_FORMAT: Record<string, string> = {
  claude: 'anthropic', gemini: 'openai-compatible', 'gemini-cli': 'openai-compatible',
  codex: 'openai', cursor: 'openai-compatible', kimi: 'openai-compatible',
  qwen: 'openai-compatible', kiro: 'openai-compatible', 'github-copilot': 'openai-compatible',
  antigravity: 'openai-compatible', iflow: 'openai-compatible', kilo: 'openai-compatible',
};

function buildThinkingOptions(fmt: string, v: string): Record<string, any> {
  if (fmt === 'anthropic') {
    if (v === 'disabled') return { thinking: { type: 'disabled' } };
    if (v === 'adaptive') return { thinking: { type: 'adaptive' } };
    return { thinking: { type: 'enabled', budgetTokens: parseInt(v) } };
  }
  return { reasoningEffort: v };
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
  channelFormatMap: CHANNEL_FORMAT,

  getThinkingOptions(format) {
    return format === 'anthropic' ? ANTHROPIC_CHIPS : OPENAI_CHIPS;
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
        const entry: Record<string, any> = {
          name: `[clanker] ${m.displayName}`,
          limit: {
            ...(m.contextLength ? { context: m.contextLength } : {}),
            ...(m.maxOutputTokens ? { output: m.maxOutputTokens } : {}),
          },
        };
        if (Object.keys(entry.limit).length === 0) delete entry.limit;

        if (m.variants.length === 1) {
          entry.options = buildThinkingOptions(fmt, m.variants[0]);
        } else if (m.variants.length > 1) {
          const variants: Record<string, any> = {};
          for (const v of m.variants) {
            variants[variantName(fmt, v)] = buildThinkingOptions(fmt, v);
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
