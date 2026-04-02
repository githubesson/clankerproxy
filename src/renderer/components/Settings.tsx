import React, { useEffect, useState } from 'react';
import { useIsProxyRunning, useConfig } from '../hooks/useIPC';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, Input, Switch, Select, ProxyRequired, Separator } from './ui';

export function Settings() {
  const isRunning = useIsProxyRunning();
  const { data: config, refetch } = useConfig();

  if (!isRunning) return <ProxyRequired />;
  if (!config) return null;

  return (
    <div className="max-w-md space-y-3">
      <p className="text-[10px] text-muted-foreground">Changes apply instantly via hot-reload.</p>

      <Card>
        <CardContent className="p-0">
          <Toggle label="Debug logging" field="debug" value={config.debug ?? false} onRefresh={refetch} />
          <Separator />
          <Toggle label="Usage statistics" field="usage-statistics-enabled" value={config['usage-statistics-enabled'] ?? false} onRefresh={refetch} />
          <Separator />
          <Toggle label="Log to file" field="logging-to-file" value={config['logging-to-file'] ?? false} onRefresh={refetch} />
          <Separator />
          <Toggle label="Force model prefix" field="force-model-prefix" value={config['force-model-prefix'] ?? false} onRefresh={refetch} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Num label="Request retry" field="request-retry" value={config['request-retry'] ?? 3} onRefresh={refetch} />
          <Separator />
          <Sel label="Routing" field="routing/strategy" value={config.routing?.strategy ?? 'round-robin'}
            options={[{ value: 'round-robin', label: 'Round Robin' }, { value: 'fill-first', label: 'Fill First' }]} onRefresh={refetch} />
          <Separator />
          <Txt label="Proxy URL" field="proxy-url" value={config['proxy-url'] ?? ''} placeholder="socks5://host:port" onRefresh={refetch} />
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({ label, field, value, onRefresh }: { label: string; field: string; value: boolean; onRefresh: () => void }) {
  const m = useMutation({ mutationFn: (v: boolean) => window.clankerProxy.config.updateField(field, v), onSuccess: () => onRefresh() });
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[11px] text-foreground">{label}</span>
      <Switch checked={value} onCheckedChange={(v) => m.mutate(v)} />
    </div>
  );
}

function Num({ label, field, value, onRefresh }: { label: string; field: string; value: number; onRefresh: () => void }) {
  const [l, setL] = useState(String(value));
  useEffect(() => { setL(String(value)); }, [value]);
  const m = useMutation({ mutationFn: (v: number) => window.clankerProxy.config.updateField(field, v), onSuccess: () => onRefresh() });
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[11px] text-foreground">{label}</span>
      <Input type="number" value={l} onChange={(e) => setL(e.target.value)} onBlur={() => { const n = parseInt(l); if (!isNaN(n) && n !== value) m.mutate(n); }} className="w-16 text-right" />
    </div>
  );
}

function Sel({ label, field, value, options, onRefresh }: { label: string; field: string; value: string; options: { value: string; label: string }[]; onRefresh: () => void }) {
  const m = useMutation({ mutationFn: (v: string) => window.clankerProxy.config.updateField(field, v), onSuccess: () => onRefresh() });
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[11px] text-foreground">{label}</span>
      <Select value={value} onChange={(v) => m.mutate(v)} options={options} />
    </div>
  );
}

function Txt({ label, field, value, placeholder, onRefresh }: { label: string; field: string; value: string; placeholder: string; onRefresh: () => void }) {
  const [l, setL] = useState(value);
  useEffect(() => { setL(value); }, [value]);
  const m = useMutation({ mutationFn: (v: string) => window.clankerProxy.config.updateField(field, v), onSuccess: () => onRefresh() });
  return (
    <div className="px-3 py-2 space-y-1">
      <span className="text-[11px] text-foreground">{label}</span>
      <Input value={l} onChange={(e) => setL(e.target.value)} onBlur={() => { if (l !== value) m.mutate(l); }} placeholder={placeholder} />
    </div>
  );
}
