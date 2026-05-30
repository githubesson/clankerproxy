import React, { useMemo, useState } from 'react';
import { useClearUsage, useConfig, useIsProxyRunning, useUpdateConfigField, useUsage } from '../hooks/useIPC';
import { Button, Card, CardContent, EmptyState, Label, Switch } from './ui';
import { TrashIcon } from './icons';
import type { UsageRecord } from '../../shared/usage';

type RangeId = 'all' | '30d' | '7d';
type ViewId = 'overview' | 'models';
type HeatmapCell = {
  key: string;
  inRange: boolean;
  tokens: number;
  label: string;
  fullLabel: string;
  row: number;
  column: number;
};

const RANGES: { id: RangeId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: '30d', label: '30d' },
  { id: '7d', label: '7d' },
];

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'models', label: 'Models' },
];

const compactNumber = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const plainNumber = new Intl.NumberFormat(undefined);

export function Usage() {
  const [view, setView] = useState<ViewId>('overview');
  const [range, setRange] = useState<RangeId>('all');
  const isRunning = useIsProxyRunning();
  const { data: config } = useConfig();
  const { data: records = [], isLoading } = useUsage();
  const clearUsage = useClearUsage();
  const updateConfigField = useUpdateConfigField();

  const scopedRecords = useMemo(() => filterByRange(records, range), [records, range]);
  const stats = useMemo(() => buildStats(scopedRecords), [scopedRecords]);
  const usageEnabled = Boolean(config?.['usage-statistics-enabled']);
  const usageToggleId = 'usage-statistics-toggle';

  const clear = () => {
    if (records.length === 0) return;
    if (confirm('Clear stored usage history?')) {
      clearUsage.mutate();
    }
  };

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex items-center justify-between gap-3">
        <SegmentedControl value={view} options={VIEWS} onChange={setView} ariaLabel="Usage view" />
        <div className="flex items-center gap-2">
          <SegmentedControl value={range} options={RANGES} onChange={setRange} ariaLabel="Usage range" />
          <Button
            variant="ghost"
            size="iconSm"
            aria-label="Clear usage history"
            title="Clear usage history"
            onClick={clear}
            disabled={records.length === 0 || clearUsage.isPending}
            className="hover:text-destructive"
          >
            <TrashIcon className="size-3" />
          </Button>
        </div>
      </div>

      {isRunning && !usageEnabled && (
        <div className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-3 rounded bg-warning/10 px-3 py-2 ring-1 ring-inset ring-warning/20">
          <span aria-hidden="true" />
          <div className="min-w-0 text-center">
            <Label htmlFor={usageToggleId} className="block text-[0.625rem] text-warning">Usage statistics</Label>
            <p className="mt-0.5 truncate text-[0.5625rem] text-warning/75">Existing history is still shown.</p>
          </div>
          <Switch
            id={usageToggleId}
            checked={usageEnabled}
            onCheckedChange={(value) => updateConfigField.mutate({ field: 'usage-statistics-enabled', value })}
            disabled={updateConfigField.isPending}
            aria-label="Usage statistics"
          />
        </div>
      )}

      {isLoading && <EmptyState message="Loading usage history..." />}

      {!isLoading && records.length === 0 && (
        <EmptyState message={isRunning ? 'No usage records stored yet.' : 'No usage records stored yet. Start the proxy to collect history.'} />
      )}

      {!isLoading && records.length > 0 && view === 'overview' && (
        <Overview records={scopedRecords} stats={stats} range={range} />
      )}

      {!isLoading && records.length > 0 && view === 'models' && (
        <ModelsView records={scopedRecords} />
      )}
    </div>
  );
}

function Overview({ records, stats, range }: { records: UsageRecord[]; stats: UsageStats; range: RangeId }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Metric label="Requests" value={plainNumber.format(stats.requests)} />
        <Metric label="Total tokens" value={formatTokenCount(stats.totalTokens)} />
        <Metric label="Active days" value={plainNumber.format(stats.activeDays)} />
        <Metric label="Favorite model" value={stats.favoriteModel || '-'} title={stats.favoriteModel} />
        <Metric label="Current streak" value={`${stats.currentStreak}d`} />
        <Metric label="Longest streak" value={`${stats.longestStreak}d`} />
        <Metric label="Peak hour" value={stats.peakHour >= 0 ? formatHour(stats.peakHour) : '-'} />
        <Metric label="Failed" value={plainNumber.format(stats.failures)} />
      </div>

      <UsageHeatmap records={records} range={range} />

      <RecentEvents records={records} />
    </div>
  );
}

function ModelsView({ records }: { records: UsageRecord[] }) {
  const models = useMemo(() => aggregateModels(records), [records]);

  if (models.length === 0) {
    return <EmptyState message="No records in this range." />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[minmax(0,1.5fr)_64px_78px_72px_72px] gap-2 border-b border-white/5 px-3 py-1.5 text-[0.5625rem] font-medium text-muted-foreground">
          <span>Model</span>
          <span className="text-right">Req</span>
          <span className="text-right">Total</span>
          <span className="text-right">Input</span>
          <span className="text-right">Output</span>
        </div>
        <ul role="list">
          {models.map((model, index) => (
            <li
              key={model.name}
              className={`grid grid-cols-[minmax(0,1.5fr)_64px_78px_72px_72px] items-center gap-2 px-3 py-1.5 text-[0.625rem] ${
                index > 0 ? 'border-t border-white/5' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-foreground" title={model.name}>{model.name}</p>
                <p className="truncate text-[0.5625rem] text-muted-foreground/60">{model.provider || 'unknown'}</p>
              </div>
              <span className="text-right tabular-nums text-muted-foreground">{plainNumber.format(model.requests)}</span>
              <span className="text-right tabular-nums text-foreground">{formatTokenCount(model.totalTokens)}</span>
              <span className="text-right tabular-nums text-muted-foreground">{formatTokenCount(model.inputTokens)}</span>
              <span className="text-right tabular-nums text-muted-foreground">{formatTokenCount(model.outputTokens)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RecentEvents({ records }: { records: UsageRecord[] }) {
  const recent = [...records]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, 18);

  if (recent.length === 0) {
    return <EmptyState message="No records in this range." />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-[96px_minmax(0,1fr)_72px_72px_72px] gap-2 border-b border-white/5 px-3 py-1.5 text-[0.5625rem] font-medium text-muted-foreground">
          <span>Time</span>
          <span>Request</span>
          <span className="text-right">Input</span>
          <span className="text-right">Output</span>
          <span className="text-right">Total</span>
        </div>
        <ul role="list">
          {recent.map((record, index) => (
            <li
              key={record.id}
              className={`grid grid-cols-[96px_minmax(0,1fr)_72px_72px_72px] items-center gap-2 px-3 py-1.5 text-[0.625rem] ${
                index > 0 ? 'border-t border-white/5' : ''
              }`}
            >
              <span className="tabular-nums text-muted-foreground">{formatShortTime(record.timestamp)}</span>
              <div className="min-w-0">
                <p className="truncate font-mono text-foreground" title={record.model}>{record.model}</p>
                <p className="truncate text-[0.5625rem] text-muted-foreground/60">
                  {record.provider || 'unknown'}{record.failed ? ' / failed' : ''}
                </p>
              </div>
              <span className="text-right tabular-nums text-muted-foreground">{plainNumber.format(record.tokens.input_tokens)}</span>
              <span className="text-right tabular-nums text-muted-foreground">{plainNumber.format(record.tokens.output_tokens)}</span>
              <span className="text-right tabular-nums text-foreground">{plainNumber.format(tokenTotal(record))}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function UsageHeatmap({ records, range }: { records: UsageRecord[]; range: RangeId }) {
  const [activeCell, setActiveCell] = useState<HeatmapCell | null>(null);
  const heatmap = useMemo(() => buildHeatmap(records, range), [records, range]);
  const maxTokens = Math.max(1, ...heatmap.cells.map((cell) => cell.tokens));

  return (
    <div className="rounded-md bg-card px-3 py-2 ring-1 ring-white/5">
      <div className="relative grid grid-cols-[1.25rem_minmax(0,auto)] gap-x-1">
        <div className="grid grid-rows-7 gap-1 text-[0.5rem] leading-[10px] text-muted-foreground/55">
          <span />
          <span>M</span>
          <span />
          <span>W</span>
          <span />
          <span>F</span>
          <span />
        </div>
        <div
          className="grid grid-flow-col gap-1"
          style={{
            gridTemplateRows: 'repeat(7, minmax(0, 10px))',
            gridTemplateColumns: `repeat(${heatmap.columns}, minmax(0, 10px))`,
          }}
        >
          {heatmap.cells.map((cell) => (
            <button
              key={cell.key}
              type="button"
              aria-label={cell.inRange ? `${cell.fullLabel}: ${plainNumber.format(cell.tokens)} tokens` : 'Outside range'}
              onMouseEnter={() => setActiveCell(cell)}
              onMouseLeave={() => setActiveCell(null)}
              onFocus={() => setActiveCell(cell)}
              onBlur={() => setActiveCell(null)}
              disabled={!cell.inRange}
              className={`size-2.5 rounded-[2px] ${heatClass(cell, maxTokens)}`}
            />
          ))}
        </div>
        {activeCell?.inRange && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-44 rounded bg-popover px-2 py-1.5 text-left shadow-lg ring-1 ring-white/10"
            style={{
              left: `${20 + activeCell.column * 14}px`,
              top: activeCell.row < 3 ? `${activeCell.row * 14 + 18}px` : `${activeCell.row * 14 - 2}px`,
              transform: activeCell.row < 3 ? 'translateY(8px)' : 'translateY(-100%)',
            }}
          >
            <p className="text-[0.625rem] font-medium text-foreground">{activeCell.fullLabel}</p>
            <p className="mt-0.5 text-[0.5625rem] text-muted-foreground tabular-nums">
              {plainNumber.format(activeCell.tokens)} tokens
            </p>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[0.5625rem] text-muted-foreground/70">
        <span>{heatmap.caption}: {heatmap.startLabel} to {heatmap.endLabel}</span>
        <span className="tabular-nums">{plainNumber.format(records.length)} records</span>
      </div>
    </div>
  );
}

function Metric({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="min-w-0 rounded bg-white/[0.06] px-2 py-1.5">
      <p className="truncate text-[0.5625rem] font-medium text-muted-foreground/85">{label}</p>
      <p className="mt-0.5 truncate text-[0.75rem] font-semibold leading-none text-foreground tabular-nums" title={title ?? value}>
        {value}
      </p>
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded bg-white/[0.04] p-0.5" role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`rounded px-1.5 py-0.5 text-[0.625rem] font-medium ${
              active ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

interface UsageStats {
  requests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  failures: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  peakHour: number;
  favoriteModel: string;
}

function buildStats(records: UsageRecord[]): UsageStats {
  const dayKeys = new Set<string>();
  const modelTokens = new Map<string, number>();
  const hours = new Array<number>(24).fill(0);

  let totalTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let failures = 0;

  for (const record of records) {
    const date = recordDate(record);
    const total = tokenTotal(record);
    totalTokens += total;
    inputTokens += record.tokens.input_tokens;
    outputTokens += record.tokens.output_tokens;
    if (record.failed) failures += 1;
    dayKeys.add(dayKey(date));
    hours[date.getHours()] += total;
    modelTokens.set(record.model, (modelTokens.get(record.model) ?? 0) + total);
  }

  const sortedDays = [...dayKeys].sort();
  let longestStreak = 0;
  let streak = 0;
  let previous: Date | null = null;
  for (const key of sortedDays) {
    const current = parseDayKey(key);
    if (previous && daysBetween(previous, current) === 1) {
      streak += 1;
    } else {
      streak = 1;
    }
    longestStreak = Math.max(longestStreak, streak);
    previous = current;
  }

  let currentStreak = 0;
  const today = startOfDay(new Date());
  for (let cursor = today; dayKeys.has(dayKey(cursor)); cursor = addDays(cursor, -1)) {
    currentStreak += 1;
  }

  const peakHour = hours.reduce((best, value, hour) => (value > hours[best] ? hour : best), 0);
  const favoriteModel = [...modelTokens.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

  return {
    requests: records.length,
    totalTokens,
    inputTokens,
    outputTokens,
    failures,
    activeDays: dayKeys.size,
    currentStreak,
    longestStreak,
    peakHour: hours[peakHour] > 0 ? peakHour : -1,
    favoriteModel,
  };
}

function aggregateModels(records: UsageRecord[]) {
  const models = new Map<string, {
    name: string;
    provider: string;
    requests: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
  }>();

  for (const record of records) {
    const existing = models.get(record.model) ?? {
      name: record.model,
      provider: record.provider,
      requests: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
    };
    existing.requests += 1;
    existing.totalTokens += tokenTotal(record);
    existing.inputTokens += record.tokens.input_tokens;
    existing.outputTokens += record.tokens.output_tokens;
    if (!existing.provider && record.provider) {
      existing.provider = record.provider;
    }
    models.set(record.model, existing);
  }

  return [...models.values()].sort((a, b) => b.totalTokens - a.totalTokens);
}

function filterByRange(records: UsageRecord[], range: RangeId): UsageRecord[] {
  if (range === 'all') return records;
  const days = range === '30d' ? 30 : 7;
  const min = startOfDay(addDays(new Date(), -(days - 1))).getTime();
  return records.filter((record) => recordDate(record).getTime() >= min);
}

function buildHeatmap(records: UsageRecord[], range: RangeId) {
  const days = range === '7d' ? 14 : range === '30d' ? 35 : 182;
  const end = startOfDay(new Date());
  const start = addDays(end, -(days - 1));
  const leading = start.getDay();
  const totalCells = Math.ceil((leading + days) / 7) * 7;
  const daily = new Map<string, number>();

  for (const record of records) {
    const key = dayKey(recordDate(record));
    daily.set(key, (daily.get(key) ?? 0) + tokenTotal(record));
  }

  const cells: HeatmapCell[] = Array.from({ length: totalCells }, (_, index) => {
    const date = addDays(start, index - leading);
    const inRange = date >= start && date <= end;
    const key = dayKey(date);
    return {
      key,
      inRange,
      tokens: inRange ? daily.get(key) ?? 0 : 0,
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      fullLabel: date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      row: index % 7,
      column: Math.floor(index / 7),
    };
  });

  return {
    columns: totalCells / 7,
    cells,
    caption: range === 'all' ? 'Last 26 weeks' : range === '30d' ? 'Last 30 days' : 'Last 7 days',
    startLabel: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    endLabel: end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };
}

function heatClass(cell: { inRange: boolean; tokens: number }, maxTokens: number): string {
  if (!cell.inRange) return 'bg-transparent';
  if (cell.tokens <= 0) return 'bg-white/[0.07]';
  const ratio = cell.tokens / maxTokens;
  if (ratio > 0.75) return 'bg-sky-400';
  if (ratio > 0.45) return 'bg-blue-500';
  if (ratio > 0.2) return 'bg-blue-700';
  return 'bg-blue-900';
}

function tokenTotal(record: UsageRecord): number {
  return record.tokens.total_tokens || record.tokens.input_tokens + record.tokens.output_tokens + record.tokens.reasoning_tokens;
}

function formatTokenCount(value: number): string {
  if (value < 10000) return plainNumber.format(value);
  return compactNumber.format(value);
}

function formatHour(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric' });
}

function formatShortTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function recordDate(record: UsageRecord): Date {
  const parsed = Date.parse(record.timestamp);
  return Number.isNaN(parsed) ? new Date() : new Date(parsed);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(a: Date, b: Date): number {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / dayMs);
}
