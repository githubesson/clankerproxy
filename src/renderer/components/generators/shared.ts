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

const GENERATOR_CHANNEL_FAMILIES: Record<string, 'anthropic' | 'openai' | 'compat'> = {
  claude: 'anthropic',
  gemini: 'compat',
  'gemini-cli': 'compat',
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
}): Record<string, string> {
  return Object.fromEntries(
    Object.entries(GENERATOR_CHANNEL_FAMILIES).map(([channel, family]) => [
      channel,
      family === 'anthropic' ? formats.anthropic : family === 'openai' ? formats.openai : formats.compat,
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

export function stripSuffixVariant(value: string): string {
  return value.replace(/[()]/g, '');
}
