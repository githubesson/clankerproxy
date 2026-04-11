import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { getBinaryPath, isBinaryInstalled, downloadBinary } from './binary-manager';
import { ManagementClient } from './management-client';
import { store } from './store';

export type ProxyState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export class ProxyManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private _state: ProxyState = 'stopped';
  private _client: ManagementClient | null = null;
  private logBuffer: string[] = [];
  private maxLogLines = 5000;
  private password: string = '';

  get state(): ProxyState {
    return this._state;
  }

  get client(): ManagementClient | null {
    return this._client;
  }

  get port(): number {
    return store.get('port');
  }

  get logs(): string[] {
    return this.logBuffer;
  }

  private setState(state: ProxyState) {
    this._state = state;
    this.emit('state-change', state);
  }

  private getConfigDir(): string {
    const dir = join(app.getPath('userData'), 'config');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  private getConfigPath(): string {
    return join(this.getConfigDir(), 'config.yaml');
  }

  private ensureConfig(): string {
    const configPath = this.getConfigPath();
    if (!existsSync(configPath)) {
      // Try to copy from CLIProxyAPIPlus example config
      const examplePaths = [
        join(app.getAppPath(), 'CLIProxyAPIPlus', 'config.example.yaml'),
        join(process.cwd(), 'CLIProxyAPIPlus', 'config.example.yaml'),
      ];
      let copied = false;
      for (const exPath of examplePaths) {
        if (existsSync(exPath)) {
          copyFileSync(exPath, configPath);
          copied = true;
          break;
        }
      }
      if (!copied) {
        // Create a minimal config
        const minimalConfig = [
          "host: '127.0.0.1'",
          `port: ${this.port}`,
          "remote-management:",
          `  secret-key: '${this.password}'`,
          "api-keys:",
          "  - 'change-me'",
          "debug: false",
          "auth-dir: '~/.cli-proxy-api'",
          "",
        ].join('\n');
        writeFileSync(configPath, minimalConfig, 'utf-8');
      }
    }
    return configPath;
  }

  /** Inject our session password as the management secret-key in config.yaml */
  private injectSecretKey(configPath: string): void {
    let yaml = readFileSync(configPath, 'utf-8');

    // Replace existing secret-key line, or add remote-management block
    const secretKeyRegex = /^(\s*)secret-key\s*:.*/m;
    if (secretKeyRegex.test(yaml)) {
      yaml = yaml.replace(secretKeyRegex, `$1secret-key: '${this.password}'`);
    } else if (/^remote-management\s*:/m.test(yaml)) {
      // remote-management exists but no secret-key — add it
      yaml = yaml.replace(
        /^(remote-management\s*:.*)/m,
        `$1\n  secret-key: '${this.password}'`
      );
    } else {
      // No remote-management block at all — prepend one
      yaml = `remote-management:\n  secret-key: '${this.password}'\n${yaml}`;
    }

    writeFileSync(configPath, yaml, 'utf-8');
  }

  async start(): Promise<void> {
    if (this._state === 'running' || this._state === 'starting') return;

    if (!isBinaryInstalled()) {
      this.appendLogs(['Binary not found, downloading latest...']);
      await downloadBinary();
      this.appendLogs(['Binary downloaded successfully']);
    }

    this.setState('starting');
    this.logBuffer = [];

    const binaryPath = getBinaryPath();

    // Generate per-session management password and inject into config
    this.password = `clanker-${process.pid}-${Date.now()}`;
    const configPath = this.ensureConfig();
    this.injectSecretKey(configPath);

    this._client = new ManagementClient(this.port, this.password);

    this.process = spawn(binaryPath, ['--config', configPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      this.appendLogs(lines);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean);
      this.appendLogs(lines);
    });

    this.process.on('exit', (code) => {
      this.process = null;
      this._client = null;
      if (this._state !== 'stopping') {
        this.setState('error');
        this.appendLogs([`Process exited with code ${code}`]);
      } else {
        this.setState('stopped');
      }
    });

    this.process.on('error', (err) => {
      this.process = null;
      this._client = null;
      this.setState('error');
      this.appendLogs([`Process error: ${err.message}`]);
    });

    // Poll for readiness with exponential backoff (matching TUI pattern)
    let backoff = 100;
    for (let i = 0; i < 30; i++) {
      if (this.state !== 'starting') return; // cancelled
      const ready = await this._client.healthCheck();
      if (ready) {
        this.setState('running');
        return;
      }
      await new Promise((r) => setTimeout(r, backoff));
      if (backoff < 1000) backoff = Math.floor(backoff * 1.5);
    }

    // Timed out
    this.stop();
    throw new Error('Proxy failed to start within timeout');
  }

  async stop(): Promise<void> {
    if (!this.process) {
      this.setState('stopped');
      return;
    }

    this.setState('stopping');

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.process?.kill('SIGKILL');
      }, 5000);

      this.process!.once('exit', () => {
        clearTimeout(timeout);
        this.process = null;
        this._client = null;
        this.setState('stopped');
        resolve();
      });

      if (process.platform === 'win32') {
        this.process!.kill();
      } else {
        this.process!.kill('SIGTERM');
      }
    });
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  private appendLogs(lines: string[]) {
    this.logBuffer.push(...lines);
    if (this.logBuffer.length > this.maxLogLines) {
      this.logBuffer = this.logBuffer.slice(-this.maxLogLines);
    }
    this.emit('log', lines);
  }
}
