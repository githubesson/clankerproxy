import http from 'http';

export class ManagementClient {
  private baseURL: string;
  private secretKey: string;

  constructor(port: number, secretKey: string) {
    this.baseURL = `http://127.0.0.1:${port}`;
    this.secretKey = secretKey;
  }

  private request(method: string, path: string, body?: string): Promise<{ data: string; status: number }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseURL);
      const req = http.request(url, { method, timeout: 10000 }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({ data: Buffer.concat(chunks).toString(), status: res.statusCode ?? 0 });
        });
        res.on('error', reject);
      });
      req.on('error', reject);
      if (this.secretKey) {
        req.setHeader('Authorization', `Bearer ${this.secretKey}`);
      }
      if (body) {
        req.setHeader('Content-Type', 'application/json');
        req.write(body);
      }
      req.end();
    });
  }

  private async get(path: string): Promise<any> {
    const { data, status } = await this.request('GET', path);
    if (status >= 400) throw new Error(`HTTP ${status}: ${data}`);
    return JSON.parse(data);
  }

  private async getText(path: string): Promise<string> {
    const { data, status } = await this.request('GET', path);
    if (status >= 400) throw new Error(`HTTP ${status}: ${data}`);
    return data;
  }

  private async put(path: string, body?: string): Promise<any> {
    const { data, status } = await this.request('PUT', path, body);
    if (status >= 400) throw new Error(`HTTP ${status}: ${data}`);
    return data ? JSON.parse(data) : null;
  }

  private async putText(path: string, body: string): Promise<void> {
    const { data, status } = await this.request('PUT', path, body);
    if (status >= 400) throw new Error(`HTTP ${status}: ${data}`);
  }

  private async patch(path: string, body: string): Promise<any> {
    const { data, status } = await this.request('PATCH', path, body);
    if (status >= 400) throw new Error(`HTTP ${status}: ${data}`);
    return data ? JSON.parse(data) : null;
  }

  private async delete(path: string): Promise<void> {
    const { data, status } = await this.request('DELETE', path);
    if (status >= 400) throw new Error(`HTTP ${status}: ${data}`);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/v0/management/config');
      return true;
    } catch {
      return false;
    }
  }

  // Config
  async getConfig(): Promise<Record<string, any>> {
    return this.get('/v0/management/config');
  }

  async getConfigYAML(): Promise<string> {
    return this.getText('/v0/management/config.yaml');
  }

  async putConfigYAML(yaml: string): Promise<void> {
    return this.putText('/v0/management/config.yaml', yaml);
  }

  // API Keys
  async getAPIKeys(): Promise<string[]> {
    const result = await this.get('/v0/management/api-keys');
    return result['api-keys'] ?? [];
  }

  async addAPIKey(key: string): Promise<void> {
    await this.patch('/v0/management/api-keys', JSON.stringify({ old: "", new: key }));
  }

  async deleteAPIKey(index: number): Promise<void> {
    await this.delete(`/v0/management/api-keys?index=${index}`);
  }

  // Provider Keys
  async getProviderKeys(provider: string): Promise<any[]> {
    const result = await this.get(`/v0/management/${provider}`);
    return result[provider] ?? [];
  }

  async patchProviderKeys(provider: string, body: any): Promise<void> {
    await this.patch(`/v0/management/${provider}`, JSON.stringify(body));
  }

  async putProviderKeys(provider: string, entries: any[]): Promise<void> {
    await this.putText(`/v0/management/${provider}`, JSON.stringify(entries));
  }

  async deleteProviderKey(provider: string, index: number): Promise<void> {
    await this.delete(`/v0/management/${provider}?index=${index}`);
  }

  // Auth Files
  async getAuthFiles(): Promise<any[]> {
    const result = await this.get('/v0/management/auth-files');
    return result.files ?? [];
  }

  async deleteAuthFile(name: string): Promise<void> {
    await this.delete(`/v0/management/auth-files?name=${encodeURIComponent(name)}`);
  }

  async toggleAuthFile(name: string, disabled: boolean): Promise<void> {
    await this.patch('/v0/management/auth-files/status', JSON.stringify({ name, disabled }));
  }

  async patchAuthFileFields(name: string, fields: Record<string, any>): Promise<void> {
    await this.patch('/v0/management/auth-files/fields', JSON.stringify({ ...fields, name }));
  }

  // OAuth
  async startOAuth(provider: string): Promise<{ url: string; state: string }> {
    return this.get(`/v0/management/${provider}-auth-url?is_webui=true`);
  }

  async getAuthStatus(state: string): Promise<{ status: string; error?: string }> {
    return this.get(`/v0/management/get-auth-status?state=${encodeURIComponent(state)}`);
  }

  // Logs
  async getLogs(after: number = 0, limit: number = 100): Promise<{ lines: string[]; latestTimestamp: number }> {
    const params = new URLSearchParams();
    if (after > 0) params.set('after', String(after));
    if (limit > 0) params.set('limit', String(limit));
    const query = params.toString();
    const result = await this.get(`/v0/management/logs${query ? '?' + query : ''}`);
    return {
      lines: result.lines ?? [],
      latestTimestamp: result['latest-timestamp'] ?? after,
    };
  }

  // Usage
  async getUsage(): Promise<Record<string, any>> {
    return this.get('/v0/management/usage');
  }

  // Models
  async getModelDefinitions(channel: string): Promise<{ channel: string; models: any[] }> {
    return this.get(`/v0/management/model-definitions/${encodeURIComponent(channel)}`);
  }

  // Individual config field updates
  async updateConfigField(field: string, value: any): Promise<void> {
    await this.putText(`/v0/management/${field}`, JSON.stringify({ value }));
  }
}
