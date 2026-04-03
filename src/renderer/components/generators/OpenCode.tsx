import React from 'react';
import { GeneratorShell, type GeneratorDef, type SelectedModel } from './GeneratorShell';

const ANTHROPIC_CHIPS = [
  { value: 'disabled', label: 'Off' },
  { value: 'adaptive', label: 'Adaptive' },
  { value: '1024', label: '1K' },
  { value: '8192', label: '8K' },
  { value: '16000', label: '16K' },
  { value: '24576', label: '24K' },
  { value: '32768', label: '32K' },
  { value: '128000', label: '128K' },
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

function variantName(fmt: string, v: string): string {
  if (fmt === 'anthropic') {
    if (v === 'disabled') return 'no-thinking';
    if (v === 'adaptive') return 'adaptive';
    return `thinking-${v}`;
  }
  return `reasoning-${v}`;
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
        const entry: Record<string, any> = { name: `[clanker] ${m.displayName}` };

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
