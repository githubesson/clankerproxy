import React, { useState, useEffect, useCallback, useId } from 'react';
import { useIsProxyRunning, useOAuthLogin } from '../hooks/useIPC';
import { Card, CardContent, Button, Badge, Label, ProxyRequired } from './ui';
import { OAUTH_CATEGORIES, OAUTH_PROVIDERS } from '../../shared/provider-registry';
import { SelectChevron, SpinnerIcon } from './icons';

export function OAuthPanel() {
  const isRunning = useIsProxyRunning();
  const [selected, setSelected] = useState(OAUTH_PROVIDERS[0].id);
  const [history, setHistory] = useState<{ id: string; label: string; status: 'pending' | 'success' | 'error'; time: string }[]>([]);
  const providerSelectId = useId();

  if (!isRunning) return <ProxyRequired />;
  const provider = OAUTH_PROVIDERS.find((p) => p.id === selected) ?? OAUTH_PROVIDERS[0];

  return (
    <div className="max-w-md space-y-2">
      <p className="text-[0.625rem] text-muted-foreground text-pretty">Authenticate via OAuth. Opens your browser.</p>

      <Card>
        <CardContent className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor={providerSelectId}>Provider</Label>
            <div className="inline-grid w-full grid-cols-[1fr_--spacing(6)] items-center rounded ring-1 ring-inset ring-white/10 bg-white/[0.02] has-focus-visible:outline-2 has-focus-visible:-outline-offset-1 has-focus-visible:outline-ring">
              <select
                id={providerSelectId}
                name="oauth-provider"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="col-span-full row-start-1 h-7 appearance-none bg-transparent pl-2 pr-6 text-[0.6875rem] text-foreground focus:outline-hidden"
              >
                {OAUTH_CATEGORIES.map((cat) => (
                  <optgroup key={cat.label} label={cat.label}>
                    {cat.providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <SelectChevron className="text-muted-foreground" />
            </div>
          </div>
          <Trigger
            provider={provider}
            onResult={(s) =>
              setHistory((h) =>
                [{ id: provider.id, label: provider.label, status: s, time: new Date().toLocaleTimeString() }, ...h].slice(0, 15),
              )
            }
          />
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <ul role="list">
              {history.map((e, i) => (
                <li
                  key={`${e.time}-${i}`}
                  className={`flex items-center gap-2 px-3 py-1 ${i > 0 ? 'border-t border-white/5' : ''}`}
                >
                  <span className="text-[0.625rem] text-foreground font-medium">{e.label}</span>
                  <span className="flex-1 text-[0.5625rem] text-muted-foreground/50 font-mono tabular-nums">{e.time}</span>
                  <Badge variant={e.status === 'success' ? 'success' : e.status === 'error' ? 'destructive' : 'warning'}>
                    {e.status === 'success' ? 'OK' : e.status === 'error' ? 'Fail' : '…'}
                  </Badge>
                </li>
              ))}
            </ul>
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
    } catch (err) {
      console.error('OAuth poll failed:', err);
      setPolling(false);
      onResult('error');
    }
  }, [onResult]);

  useEffect(() => {
    if (!polling || !state) return;
    const id = setInterval(() => poll(state), 2000);
    return () => clearInterval(id);
  }, [polling, state, poll]);

  return (
    <Button
      className="w-full"
      onClick={async () => {
        try { const r = await login.mutateAsync(provider.id); setState(r.state); setPolling(true); }
        catch { onResult('error'); }
      }}
      disabled={polling || login.isPending}
    >
      {polling ? <><SpinnerIcon className="size-3" />Waiting…</> : `Login — ${provider.label}`}
    </Button>
  );
}
