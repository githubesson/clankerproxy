import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { appendFile, mkdir, writeFile } from 'fs/promises';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createConnection, Socket } from 'net';
import { join } from 'path';
import { app } from 'electron';
import { appLogger } from './app-logger';
import type { UsageRecord, UsageTokenStats } from '../shared/usage';

type RespError = { kind: 'error'; message: string };
type RespValue = string | number | null | RespError | RespValue[];
type ParseResult = { value: RespValue; nextOffset: number };

const USAGE_DIR = 'usage';
const USAGE_FILE = 'usage-events.jsonl';

export class UsageRecorder extends EventEmitter {
  private records: UsageRecord[] = [];
  private recordIds = new Set<string>();
  private socket: Socket | null = null;
  private buffer = Buffer.alloc(0);
  private stopped = true;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelayMs = 500;
  private port = 0;
  private password = '';
  private writeQueue: Promise<void> = Promise.resolve();
  private readonly filePath: string;

  constructor() {
    super();
    const dir = join(app.getPath('userData'), USAGE_DIR);
    this.filePath = join(dir, USAGE_FILE);
    this.loadFromDisk(dir);
  }

  start(port: number, password: string): void {
    if (!port || !password) {
      return;
    }

    this.stop();
    this.port = port;
    this.password = password;
    this.stopped = false;
    this.reconnectDelayMs = 500;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.buffer = Buffer.alloc(0);
  }

  getRecords(): UsageRecord[] {
    return [...this.records];
  }

  async clear(): Promise<void> {
    this.records = [];
    this.recordIds.clear();
    this.writeQueue = this.writeQueue
      .then(() => writeFile(this.filePath, '', 'utf8'))
      .catch((err) => {
        appLogger.log(`[usage] Failed to clear usage database: ${String(err)}`);
      });
    await this.writeQueue;
    this.emit('cleared');
  }

  private loadFromDisk(dir: string): void {
    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      if (!existsSync(this.filePath)) {
        writeFileSync(this.filePath, '', 'utf8');
        return;
      }

      const file = readFileSync(this.filePath, 'utf8');
      for (const line of file.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const record = normalizeUsageRecord(JSON.parse(trimmed));
          if (this.recordIds.has(record.id)) continue;
          this.recordIds.add(record.id);
          this.records.push(record);
        } catch {
          // Ignore a bad line so one partial write does not hide the rest.
        }
      }
      this.records.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    } catch (err) {
      appLogger.log(`[usage] Failed to load usage database: ${String(err)}`);
    }
  }

  private connect(): void {
    if (this.stopped) return;

    const socket = createConnection({ host: '127.0.0.1', port: this.port });
    this.socket = socket;

    socket.on('connect', () => {
      this.reconnectDelayMs = 500;
      socket.write(encodeRespCommand('AUTH', this.password));
    });

    socket.on('data', (chunk: Buffer) => this.handleData(chunk));
    socket.on('error', (err) => {
      if (!this.stopped && this.socket === socket) {
        appLogger.log(`[usage] Subscriber error: ${err.message}`);
      }
    });
    socket.on('close', () => {
      const isCurrentSocket = this.socket === socket;
      if (isCurrentSocket) {
        this.socket = null;
      }
      if (!this.stopped && isCurrentSocket) {
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.stopped) return;
    const delay = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(10000, Math.round(this.reconnectDelayMs * 1.6));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length > 0) {
      const parsed = parseRespValue(this.buffer, 0);
      if (!parsed) break;
      this.buffer = this.buffer.subarray(parsed.nextOffset);
      this.handleRespValue(parsed.value);
    }
  }

  private handleRespValue(value: RespValue): void {
    if (isRespError(value)) {
      appLogger.log(`[usage] Subscriber rejected: ${value.message}`);
      return;
    }

    if (typeof value === 'string' && value.toUpperCase() === 'OK') {
      this.socket?.write(encodeRespCommand('SUBSCRIBE', 'usage'));
      return;
    }

    if (!Array.isArray(value) || value.length < 3) {
      return;
    }

    const kind = stringValue(value[0]).toLowerCase();
    if (kind !== 'message') {
      return;
    }

    const channel = stringValue(value[1]).toLowerCase();
    if (channel !== 'usage') {
      return;
    }

    const payload = stringValue(value[2]);
    if (!payload) return;

    try {
      const record = normalizeUsageRecord(JSON.parse(payload));
      this.persistRecord(record);
    } catch (err) {
      appLogger.log(`[usage] Failed to parse usage record: ${String(err)}`);
    }
  }

  private persistRecord(record: UsageRecord): void {
    if (this.recordIds.has(record.id)) return;

    this.recordIds.add(record.id);
    this.records.push(record);
    this.records.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    this.emit('record', record);

    const line = JSON.stringify(record) + '\n';
    this.writeQueue = this.writeQueue
      .then(async () => {
        await mkdir(join(app.getPath('userData'), USAGE_DIR), { recursive: true });
        await appendFile(this.filePath, line, 'utf8');
      })
      .catch((err) => {
        appLogger.log(`[usage] Failed to append usage record: ${String(err)}`);
      });
  }
}

function normalizeUsageRecord(raw: any): UsageRecord {
  const tokens = normalizeTokens(raw?.tokens);
  const timestamp = normalizeTime(raw?.timestamp ?? raw?.received_at);
  const receivedAt = normalizeTime(raw?.received_at ?? new Date().toISOString());
  const requestId = text(raw?.request_id);
  const provider = text(raw?.provider) || 'unknown';
  const model = text(raw?.model) || 'unknown';
  const source = text(raw?.source);
  const authIndex = text(raw?.auth_index);
  const identity = [
    requestId,
    timestamp,
    provider,
    model,
    text(raw?.alias),
    text(raw?.endpoint),
    source,
    authIndex,
    number(raw?.latency_ms),
    tokens.input_tokens,
    tokens.output_tokens,
    tokens.reasoning_tokens,
    tokens.total_tokens,
    Boolean(raw?.failed),
  ].join('|');

  return {
    id: requestId ? `request:${requestId}` : `usage:${hash(identity)}`,
    received_at: receivedAt,
    timestamp,
    provider,
    model,
    alias: text(raw?.alias) || model,
    endpoint: text(raw?.endpoint),
    source,
    auth_type: text(raw?.auth_type),
    auth_index: authIndex,
    api_key_preview: previewSecret(text(raw?.api_key ?? raw?.api_key_preview)),
    request_id: requestId,
    reasoning_effort: text(raw?.reasoning_effort),
    service_tier: text(raw?.service_tier),
    latency_ms: number(raw?.latency_ms),
    ttft_ms: number(raw?.ttft_ms),
    tokens,
    failed: Boolean(raw?.failed),
    fail: {
      status_code: number(raw?.fail?.status_code),
      body: text(raw?.fail?.body),
    },
  };
}

function normalizeTokens(raw: any): UsageTokenStats {
  const input = number(raw?.input_tokens);
  const output = number(raw?.output_tokens);
  const reasoning = number(raw?.reasoning_tokens);
  const cached = number(raw?.cached_tokens);
  const cacheRead = number(raw?.cache_read_tokens);
  const cacheCreation = number(raw?.cache_creation_tokens);
  const total = number(raw?.total_tokens) || input + output + reasoning;

  return {
    input_tokens: input,
    output_tokens: output,
    reasoning_tokens: reasoning,
    cached_tokens: cached,
    cache_read_tokens: cacheRead,
    cache_creation_tokens: cacheCreation,
    total_tokens: total,
  };
}

function normalizeTime(value: unknown): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function stringValue(value: RespValue): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function number(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function hash(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 16);
}

function previewSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 10) return 'set';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function encodeRespCommand(...args: string[]): string {
  let out = `*${args.length}\r\n`;
  for (const arg of args) {
    const len = Buffer.byteLength(arg);
    out += `$${len}\r\n${arg}\r\n`;
  }
  return out;
}

function parseRespValue(buffer: Buffer, offset: number): ParseResult | null {
  if (offset >= buffer.length) return null;
  const prefix = String.fromCharCode(buffer[offset]);

  if (prefix === '+' || prefix === '-' || prefix === ':') {
    const lineEnd = buffer.indexOf('\r\n', offset + 1);
    if (lineEnd < 0) return null;
    const line = buffer.toString('utf8', offset + 1, lineEnd);
    const nextOffset = lineEnd + 2;
    if (prefix === '-') return { value: { kind: 'error', message: line }, nextOffset };
    if (prefix === ':') return { value: Number(line), nextOffset };
    return { value: line, nextOffset };
  }

  if (prefix === '$') {
    const lineEnd = buffer.indexOf('\r\n', offset + 1);
    if (lineEnd < 0) return null;
    const length = Number(buffer.toString('utf8', offset + 1, lineEnd));
    if (!Number.isFinite(length)) return null;
    const dataStart = lineEnd + 2;
    if (length < 0) return { value: null, nextOffset: dataStart };
    const dataEnd = dataStart + length;
    if (buffer.length < dataEnd + 2) return null;
    return {
      value: buffer.toString('utf8', dataStart, dataEnd),
      nextOffset: dataEnd + 2,
    };
  }

  if (prefix === '*') {
    const lineEnd = buffer.indexOf('\r\n', offset + 1);
    if (lineEnd < 0) return null;
    const length = Number(buffer.toString('utf8', offset + 1, lineEnd));
    if (!Number.isFinite(length)) return null;
    if (length < 0) return { value: null, nextOffset: lineEnd + 2 };

    const items: RespValue[] = [];
    let cursor = lineEnd + 2;
    for (let i = 0; i < length; i++) {
      const item = parseRespValue(buffer, cursor);
      if (!item) return null;
      items.push(item.value);
      cursor = item.nextOffset;
    }
    return { value: items, nextOffset: cursor };
  }

  return null;
}

function isRespError(value: RespValue): value is RespError {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && (value as RespError).kind === 'error');
}
