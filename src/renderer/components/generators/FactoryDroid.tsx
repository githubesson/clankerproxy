import React from 'react';
import { GeneratorShell, type GeneratorDef, type SelectedModel } from './GeneratorShell';

const SUFFIX_CHIPS: Record<string, { value: string; label: string }[]> = {
  claude: [
    { value: '(none)', label: 'Off' },
    { value: '(low)', label: 'Low' },
    { value: '(medium)', label: 'Medium' },
    { value: '(high)', label: 'High' },
    { value: '(xhigh)', label: 'XHigh' },
    { value: '(max)', label: 'Max' },
  ],
  openai: [
    { value: '(none)', label: 'Off' },
    { value: '(low)', label: 'Low' },
    { value: '(medium)', label: 'Medium' },
    { value: '(high)', label: 'High' },
    { value: '(xhigh)', label: 'XHigh' },
  ],
  gemini: [
    { value: '(none)', label: 'Off' },
    { value: '(low)', label: 'Low' },
    { value: '(medium)', label: 'Medium' },
    { value: '(high)', label: 'High' },
    { value: '(xhigh)', label: 'XHigh' },
    { value: '(max)', label: 'Max' },
  ],
};

const FORMAT_FAMILY: Record<string, string> = {
  anthropic: 'claude', openai: 'openai', 'generic-chat-completion-api': 'openai',
};

const CHANNEL_FORMAT: Record<string, string> = {
  claude: 'anthropic', gemini: 'openai', 'gemini-cli': 'openai', codex: 'openai',
  cursor: 'openai', kimi: 'openai', qwen: 'openai', kiro: 'openai',
  'github-copilot': 'openai', antigravity: 'openai', iflow: 'openai', kilo: 'openai',
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
  channelFormatMap: CHANNEL_FORMAT,

  getThinkingOptions(format) {
    const family = FORMAT_FAMILY[format] ?? 'openai';
    return SUFFIX_CHIPS[family] ?? SUFFIX_CHIPS.openai;
  },

  buildOutput({ selected, port, apiKey }) {
    const entries: any[] = [];

    for (const s of selected) {
      const baseUrl = s.format === 'openai' ? `http://127.0.0.1:${port}/v1` : `http://127.0.0.1:${port}`;
      const base = { baseUrl, apiKey, provider: s.format };

      if (s.variants.length === 0) {
        entries.push({ model: s.id, displayName: `[clanker] ${s.displayName}`, ...base });
      } else {
        for (const suffix of s.variants) {
          entries.push({
            model: `${s.id}${suffix}`,
            displayName: `[clanker] ${s.displayName} ${suffix}`,
            ...base,
          });
        }
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
