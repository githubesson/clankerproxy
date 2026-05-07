const SUFFIX_THINKING_OPTIONS: Record<string, { value: string; label: string }[]> = {
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

const GEMINI_LEVEL_LABELS: Record<string, string> = {
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'XHigh',
  max: 'Max',
};

const GENERATOR_CHANNEL_FAMILIES: Record<string, 'anthropic' | 'openai' | 'compat' | 'google'> = {
  claude: 'anthropic',
  gemini: 'google',
  'gemini-cli': 'google',
  codex: 'openai',
  cursor: 'compat',
  kimi: 'compat',
  qwen: 'compat',
  kiro: 'compat',
  'github-copilot': 'compat',
  antigravity: 'compat',
  iflow: 'compat',
  kilo: 'compat',
};

export function createGeneratorChannelFormatMap(formats: {
  anthropic: string;
  openai: string;
  compat: string;
  google?: string;
}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(GENERATOR_CHANNEL_FAMILIES).map(([channel, family]) => [
      channel,
      family === 'anthropic'
        ? formats.anthropic
        : family === 'openai'
          ? formats.openai
          : family === 'google'
            ? (formats.google ?? formats.compat)
            : formats.compat,
    ]),
  );
}

export function getSuffixThinkingOptions(
  format: string,
  formatFamilies: Record<string, keyof typeof SUFFIX_THINKING_OPTIONS>,
): { value: string; label: string }[] {
  const family = formatFamilies[format] ?? 'openai';
  return SUFFIX_THINKING_OPTIONS[family] ?? SUFFIX_THINKING_OPTIONS.openai;
}

export function getGeminiSuffixThinkingOptions(model?: { thinking?: any }): { value: string; label: string }[] {
  const levels = model?.thinking?.levels;
  if (!Array.isArray(levels) || levels.length === 0) {
    return SUFFIX_THINKING_OPTIONS.gemini;
  }

  const options = [{ value: '(none)', label: 'Off' }];
  for (const rawLevel of levels) {
    const level = String(rawLevel).trim().toLowerCase();
    const label = GEMINI_LEVEL_LABELS[level];
    if (label) {
      options.push({ value: `(${level})`, label });
    }
  }
  return options;
}

export function stripSuffixVariant(value: string): string {
  return value.replace(/[()]/g, '');
}
