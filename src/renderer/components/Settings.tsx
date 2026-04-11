import React, { useEffect, useState } from 'react';
import { useConfig, useIsProxyRunning, useUpdateConfigField } from '../hooks/useIPC';
import { Card, CardContent, Input, Switch, Select, ProxyRequired, Separator } from './ui';

export function Settings() {
  const isRunning = useIsProxyRunning();
  const { data: config } = useConfig();

  if (!isRunning) return <ProxyRequired />;
  if (!config) return null;

  return (
    <div className="max-w-md space-y-3">
      <p className="text-[10px] text-muted-foreground">Changes apply instantly via hot-reload.</p>

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

  return (
    <SettingRow label={label}>
      <Switch checked={value} onCheckedChange={(nextValue) => updateField.mutate(nextValue)} disabled={updateField.isPending} />
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

  return (
    <SettingRow label={label}>
      <Select value={value} onChange={(nextValue) => updateField.mutate(nextValue)} options={options} />
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
    <SettingRow label={label} stacked={stacked}>
      <Input
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
}: {
  label: string;
  children: React.ReactNode;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="px-3 py-2 space-y-1">
        <span className="text-[11px] text-foreground">{label}</span>
        {children}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[11px] text-foreground">{label}</span>
      {children}
    </div>
  );
}

function useConfigFieldMutation<TValue>(field: string) {
  const updateField = useUpdateConfigField();

  return {
    ...updateField,
    mutate: (value: TValue) => updateField.mutate({ field, value }),
  };
}
