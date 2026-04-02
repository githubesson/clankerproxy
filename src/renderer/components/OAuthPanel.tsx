import React, { useState, useEffect, useCallback } from 'react';
import { useIsProxyRunning, useOAuthLogin } from '../hooks/useIPC';
import { Card, CardContent, Button, Badge, ProxyRequired } from './ui';

const OAUTH_CATEGORIES = [
  { label: 'Major Providers', providers: [
    { id: 'anthropic', label: 'Claude', desc: 'Anthropic OAuth' },
    { id: 'gemini-cli', label: 'Gemini', desc: 'Google CLI OAuth' },
    { id: 'codex', label: 'Codex', desc: 'OpenAI Codex OAuth' },
    { id: 'github', label: 'GitHub Copilot', desc: 'GitHub device code flow' },
    { id: 'gitlab', label: 'GitLab Duo', desc: 'GitLab OAuth' },
  ]},
  { label: 'AWS / Cloud', providers: [
    { id: 'kiro', label: 'Kiro', desc: 'AWS CodeWhisperer' },
  ]},
  { label: 'Community', providers: [
    { id: 'antigravity', label: 'Antigravity', desc: 'OAuth' },
    { id: 'kimi', label: 'Kimi', desc: 'Moonshot OAuth' },
    { id: 'cursor', label: 'Cursor', desc: 'OAuth' },
    { id: 'qwen', label: 'Qwen', desc: 'Alibaba OAuth' },
    { id: 'iflow', label: 'iFlow', desc: 'OAuth' },
    { id: 'kilo', label: 'Kilocode', desc: 'Device code' },
  ]},
];
const ALL = OAUTH_CATEGORIES.flatMap((c) => c.providers);

export function OAuthPanel() {
  const isRunning = useIsProxyRunning();
  const [selected, setSelected] = useState(ALL[0].id);
  const [history, setHistory] = useState<{ id: string; label: string; status: 'pending' | 'success' | 'error'; time: string }[]>([]);

  if (!isRunning) return <ProxyRequired />;
  const provider = ALL.find((p) => p.id === selected) ?? ALL[0];

  return (
    <div className="max-w-md space-y-2">
      <p className="text-[10px] text-muted-foreground">Authenticate via OAuth. Opens your browser.</p>

      <Card>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <label className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Provider</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}
              className="flex h-6 w-full rounded border border-input bg-transparent px-2 text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              {OAUTH_CATEGORIES.map((cat) => (
                <optgroup key={cat.label} label={cat.label}>
                  {cat.providers.map((p) => <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <Trigger provider={provider} onResult={(s) => setHistory((h) => [{ id: provider.id, label: provider.label, status: s, time: new Date().toLocaleTimeString() }, ...h].slice(0, 15))} />
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardContent className="p-0">
            {history.map((e, i) => (
              <div key={`${e.time}-${i}`} className={`flex items-center gap-2 px-3 py-1 ${i > 0 ? 'border-t border-border' : ''}`}>
                <span className="text-[10px] text-foreground font-medium">{e.label}</span>
                <span className="text-[9px] text-muted-foreground/40 font-mono flex-1">{e.time}</span>
                <Badge variant={e.status === 'success' ? 'success' : e.status === 'error' ? 'destructive' : 'warning'}>
                  {e.status === 'success' ? 'OK' : e.status === 'error' ? 'Fail' : '...'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Trigger({ provider, onResult }: { provider: { id: string; label: string }; onResult: (s: 'success' | 'error') => void }) {
  const login = useOAuthLogin();
  const [polling, setPolling] = useState(false);
  const [state, setState] = useState('');

  const poll = useCallback(async (s: string) => {
    try {
      const r = await window.clankerProxy.oauth.getStatus(s);
      if (r.status === 'ok' || r.status === 'success') { setPolling(false); onResult('success'); }
      else if (r.status === 'error' || r.error) { setPolling(false); onResult('error'); }
    } catch {}
  }, [onResult]);

  useEffect(() => {
    if (!polling || !state) return;
    const id = setInterval(() => poll(state), 2000);
    return () => clearInterval(id);
  }, [polling, state, poll]);

  return (
    <div className="flex items-center gap-2">
      <Button className="flex-1" onClick={async () => {
        try { const r = await login.mutateAsync(provider.id); setState(r.state); setPolling(true); } catch { onResult('error'); }
      }} disabled={polling || login.isPending}>
        {polling ? 'Waiting...' : `Login — ${provider.label}`}
      </Button>
      {polling && <div className="w-1.5 h-1.5 rounded-full bg-warning" style={{ animation: 'pulse-dot 1.5s ease-in-out infinite' }} />}
    </div>
  );
}
