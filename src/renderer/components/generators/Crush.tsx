import React from 'react';
import { GeneratorShell, type GeneratorDef, type SelectedModel } from './GeneratorShell';

// Crush uses proxy suffixes for thinking (like Factory Droid) since its
// native thinking support is just a boolean `think: true` flag.
// The suffix approach gives finer control.

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
  openai: 'openai', 'openai-compat': 'openai', anthropic: 'claude', gemini: 'gemini',
};

const CHANNEL_FORMAT: Record<string, string> = {
  claude: 'anthropic', gemini: 'openai-compat', 'gemini-cli': 'openai-compat',
  codex: 'openai', cursor: 'openai-compat', kimi: 'openai-compat',
  qwen: 'openai-compat', kiro: 'openai-compat', 'github-copilot': 'openai-compat',
  antigravity: 'openai-compat', iflow: 'openai-compat', kilo: 'openai-compat',
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
  channelFormatMap: CHANNEL_FORMAT,

  getThinkingOptions(format) {
    const family = FORMAT_FAMILY[format] ?? 'openai';
    return SUFFIX_CHIPS[family] ?? SUFFIX_CHIPS.openai;
  },

  getVariantName(_format, value) {
    return value.replace(/[()]/g, '');
  },

  buildOutput({ selected, port, apiKey }) {
    // Group by format for separate provider entries
    const byFormat: Record<string, SelectedModel[]> = {};
    for (const s of selected) {
      (byFormat[s.format] ??= []).push(s);
    }

    const providers: Record<string, any> = {};

    for (const [fmt, fmtModels] of Object.entries(byFormat)) {
      const providerKey = fmt === 'anthropic' ? 'clanker-anthropic'
        : fmt === 'openai' ? 'clanker-openai'
        : fmt === 'gemini' ? 'clanker-gemini'
        : 'clanker-proxy';

      // Build model list for this provider
      const modelList: any[] = [];
      for (const m of fmtModels) {
        const hasThinking = m.variants.some((v) => v !== '(none)');
        if (m.variants.length === 0) {
          modelList.push({
            id: m.id,
            name: `[clanker] ${m.displayName}`,
            default_max_tokens: m.maxOutputTokens,
            ...(m.contextLength ? { context_window: m.contextLength } : {}),
          });
        } else {
          for (const suffix of m.variants) {
            const level = suffix.replace(/[()]/g, '');
            modelList.push({
              id: `${m.id}${suffix}`,
              name: `[clanker] ${m.displayName} (${level})`,
              default_max_tokens: m.maxOutputTokens,
              ...(m.contextLength ? { context_window: m.contextLength } : {}),
              can_reason: suffix !== '(none)',
            });
          }
        }
      }

      providers[providerKey] = {
        name: 'ClankerProxy',
        base_url: fmt === 'anthropic' ? `http://127.0.0.1:${port}` : `http://127.0.0.1:${port}/v1`,
        type: fmt === 'openai-compat' ? 'openai-compat' : fmt,
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
