import { EventEmitter } from 'events';
import { appendFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

class AppLogger extends EventEmitter {
  private buffer: string[] = [];
  private maxLines = 5000;
  private logFile: string;

  constructor() {
    super();
    this.logFile = join(app.getPath('userData'), 'clankerproxy.log');
  }

  log(msg: string) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    try { appendFileSync(this.logFile, line + '\n'); } catch {}
    console.log(msg);
    this.buffer.push(line);
    if (this.buffer.length > this.maxLines) {
      this.buffer = this.buffer.slice(-this.maxLines);
    }
    this.emit('log', [line]);
  }

  getLogs(): string[] {
    return this.buffer;
  }
}

export const appLogger = new AppLogger();
