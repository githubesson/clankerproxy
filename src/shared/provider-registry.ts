export interface ChannelDefinition {
  channel: string;
  label: string;
  authPatterns?: string[];
}

export interface ProviderKeyDefinition {
  id: string;
  label: string;
  keyField: 'api-key' | 'name';
  badgeLabel: string;
  moveTarget?: boolean;
}

export interface OAuthProviderDefinition {
  id: string;
  label: string;
  desc: string;
}

export interface OAuthCategoryDefinition {
  label: string;
  providers: OAuthProviderDefinition[];
}

export const AUTH_DETECTED_CHANNELS: ChannelDefinition[] = [
  { channel: 'claude', label: 'Claude', authPatterns: ['claude', 'anthropic'] },
  { channel: 'gemini', label: 'Gemini', authPatterns: ['gemini', 'google'] },
  { channel: 'gemini-cli', label: 'Gemini CLI', authPatterns: ['gemini-cli'] },
  { channel: 'codex', label: 'Codex', authPatterns: ['codex'] },
  { channel: 'cursor', label: 'Cursor', authPatterns: ['cursor'] },
  { channel: 'kimi', label: 'Kimi', authPatterns: ['kimi'] },
  { channel: 'qwen', label: 'Qwen', authPatterns: ['qwen'] },
  { channel: 'kiro', label: 'Kiro', authPatterns: ['kiro'] },
  { channel: 'github-copilot', label: 'GitHub Copilot', authPatterns: ['github', 'copilot'] },
  { channel: 'antigravity', label: 'Antigravity', authPatterns: ['antigravity'] },
  { channel: 'iflow', label: 'iFlow', authPatterns: ['iflow'] },
  { channel: 'kilo', label: 'Kilocode', authPatterns: ['kilo'] },
];

export const MODEL_CHANNEL_OPTIONS = [
  ...AUTH_DETECTED_CHANNELS.map(({ channel, label }) => ({ value: channel, label })),
  { value: 'vertex', label: 'Vertex' },
  { value: 'amazonq', label: 'Amazon Q' },
  { value: 'codebuddy', label: 'CodeBuddy' },
  { value: 'aistudio', label: 'AI Studio' },
];

export const NATIVE_PROVIDER_KEY_CHANNELS = [
  { providerId: 'claude-api-key', channel: 'claude' },
  { providerId: 'gemini-api-key', channel: 'gemini' },
  { providerId: 'codex-api-key', channel: 'codex' },
  { providerId: 'vertex-api-key', channel: 'vertex' },
] as const;

export const PROVIDER_KEY_DEFINITIONS: ProviderKeyDefinition[] = [
  { id: 'claude-api-key', label: 'Claude', keyField: 'api-key', badgeLabel: 'anthropic', moveTarget: true },
  { id: 'gemini-api-key', label: 'Gemini', keyField: 'api-key', badgeLabel: 'gemini', moveTarget: true },
  { id: 'codex-api-key', label: 'Codex', keyField: 'api-key', badgeLabel: 'codex', moveTarget: true },
  { id: 'vertex-api-key', label: 'Vertex', keyField: 'api-key', badgeLabel: 'vertex' },
  { id: 'openai-compatibility', label: 'OpenAI Compat', keyField: 'name', badgeLabel: 'openai', moveTarget: true },
];

export const PROVIDER_KEY_MOVE_TARGETS = PROVIDER_KEY_DEFINITIONS
  .filter((provider) => provider.moveTarget)
  .map(({ id, label }) => ({ value: id, label }));

export const OAUTH_CATEGORIES: OAuthCategoryDefinition[] = [
  {
    label: 'Major Providers',
    providers: [
      { id: 'anthropic', label: 'Claude', desc: 'Anthropic OAuth' },
      { id: 'gemini-cli', label: 'Gemini', desc: 'Google CLI OAuth' },
      { id: 'codex', label: 'Codex', desc: 'OpenAI Codex OAuth' },
      { id: 'github', label: 'GitHub Copilot', desc: 'GitHub device code flow' },
      { id: 'gitlab', label: 'GitLab Duo', desc: 'GitLab OAuth' },
    ],
  },
  {
    label: 'AWS / Cloud',
    providers: [
      { id: 'kiro', label: 'Kiro', desc: 'AWS CodeWhisperer' },
    ],
  },
  {
    label: 'Community',
    providers: [
      { id: 'antigravity', label: 'Antigravity', desc: 'OAuth' },
      { id: 'kimi', label: 'Kimi', desc: 'Moonshot OAuth' },
      { id: 'cursor', label: 'Cursor', desc: 'OAuth' },
      { id: 'qwen', label: 'Qwen', desc: 'Alibaba OAuth' },
      { id: 'iflow', label: 'iFlow', desc: 'OAuth' },
      { id: 'kilo', label: 'Kilocode', desc: 'Device code' },
    ],
  },
];

export const OAUTH_PROVIDERS = OAUTH_CATEGORIES.flatMap((category) => category.providers);
