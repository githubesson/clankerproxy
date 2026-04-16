import React, { useEffect, useId, useState } from 'react';
import { useConfig, useIsProxyRunning, useUpdateConfigField } from '../hooks/useIPC';
import { Card, CardContent, Input, Switch, Select, ProxyRequired, Separator, Label } from './ui';
import { usePref, useSetPref } from '../hooks/usePrefs';

export function Settings() {
  const isRunning = useIsProxyRunning();
  const { data: config } = useConfig();

  if (!isRunning) return <ProxyRequired />;
  if (!config) return null;

  return (
    <div className="max-w-md space-y-3">
      <p className="text-[0.625rem] text-muted-foreground text-pretty">Changes apply instantly via hot-reload.</p>

      <Card>
        <CardContent className="p-0">
          <ToggleField label="Debug logging" field="debug" value={config.debug ?? false} />
          <Separator />
          <ToggleField label="Usage statistics" field="usage-statistics-enabled" value={config['usage-statistics-enabled'] ?? false} />
          <Separator />
          <ToggleField label="Log to file" field="logging-to-file" value={config['logging-to-file'] ?? false} />
          <Separator />
          <ToggleField label="Force model prefix" field="force-model-prefix" value={config['force-model-prefix'] ?? false} />
        </CardContent>
      </Card>

      <AutoUpdateCard />

      <Card>
        <CardContent className="p-0">
          <BlurInputField
            label="Request retry"
            field="request-retry"
            value={config['request-retry'] ?? 3}
            parse={(draft) => {
              const parsed = parseInt(draft, 10);
              return Number.isNaN(parsed) ? null : parsed;
            }}
            inputProps={{ type: 'number', className: 'w-16 text-right' }}
          />
          <Separator />
          <SelectField
            label="Routing"
            field="routing/strategy"
            value={config.routing?.strategy ?? 'round-robin'}
            options={[
              { value: 'round-robin', label: 'Round Robin' },
              { value: 'fill-first', label: 'Fill First' },
            ]}
          />
          <Separator />
          <BlurInputField
            label="Proxy URL"
            field="proxy-url"
            value={config['proxy-url'] ?? ''}
            parse={(draft) => draft}
            stacked
            inputProps={{ placeholder: 'socks5://host:port' }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleField({ label, field, value }: { label: string; field: string; value: boolean }) {
  const updateField = useConfigFieldMutation<boolean>(field);
  const id = useId();

  return (
    <SettingRow label={label} id={id}>
      <Switch id={id} checked={value} onCheckedChange={(nextValue) => updateField.mutate(nextValue)} disabled={updateField.isPending} aria-label={label} />
    </SettingRow>
  );
}

function SelectField({
  label,
  field,
  value,
  options,
}: {
  label: string;
  field: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const updateField = useConfigFieldMutation<string>(field);
  const id = useId();

  return (
    <SettingRow label={label} id={id}>
      <Select id={id} name={field} value={value} onChange={(nextValue) => updateField.mutate(nextValue)} options={options} aria-label={label} />
    </SettingRow>
  );
}

function BlurInputField<TValue extends string | number>({
  label,
  field,
  value,
  parse,
  stacked = false,
  inputProps,
}: {
  label: string;
  field: string;
  value: TValue;
  parse: (draft: string) => TValue | null;
  stacked?: boolean;
  inputProps?: { type?: string; className?: string; placeholder?: string };
}) {
  const updateField = useConfigFieldMutation<TValue>(field);
  const [draft, setDraft] = useState(String(value));
  const id = useId();

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const nextValue = parse(draft);
    if (nextValue === null || Object.is(nextValue, value)) {
      return;
    }

    updateField.mutate(nextValue);
  };

  return (
    <SettingRow label={label} stacked={stacked} id={id}>
      <Input
        id={id}
        name={field}
        aria-label={label}
        type={inputProps?.type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder={inputProps?.placeholder}
        className={inputProps?.className}
      />
    </SettingRow>
  );
}

function SettingRow({
  label,
  children,
  stacked = false,
  id,
}: {
  label: string;
  children: React.ReactNode;
  stacked?: boolean;
  id?: string;
}) {
  if (stacked) {
    return (
      <div className="px-3 py-2 space-y-1">
        <Label htmlFor={id} className="text-[0.6875rem] text-foreground">{label}</Label>
        {children}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <Label htmlFor={id} className="text-[0.6875rem] text-foreground">{label}</Label>
      {children}
    </div>
  );
}

function AutoUpdateCard() {
  const { data: enabled } = usePref<boolean>('autoUpdateBinary', false);
  const { data: interval } = usePref<number>('autoUpdateIntervalMinutes', 30);
  const setEnabled = useSetPref('autoUpdateBinary');
  const setInterval_ = useSetPref('autoUpdateIntervalMinutes');
  const [draft, setDraft] = useState(String(interval ?? 30));
  const toggleId = useId();
  const intervalId = useId();

  useEffect(() => {
    setDraft(String(interval ?? 30));
  }, [interval]);

  const commitInterval = () => {
    const parsed = parseInt(draft, 10);
    if (Number.isNaN(parsed) || parsed < 1) return;
    if (parsed !== interval) setInterval_.mutate(parsed);
  };

  return (
    <Card>
      <CardContent className="p-0">
        <SettingRow label="Auto-update binary" id={toggleId}>
          <Switch id={toggleId} checked={enabled ?? false} onCheckedChange={(v) => setEnabled.mutate(v)} aria-label="Auto-update binary" />
        </SettingRow>
        {enabled && (
          <>
            <Separator />
            <SettingRow label="Check interval (min)" id={intervalId}>
              <Input
                id={intervalId}
                name="auto-update-interval"
                aria-label="Check interval in minutes"
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitInterval}
                className="w-16 text-right"
              />
            </SettingRow>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function useConfigFieldMutation<TValue>(field: string) {
  const updateField = useUpdateConfigField();

  return {
    ...updateField,
    mutate: (value: TValue) => updateField.mutate({ field, value }),
  };
}
