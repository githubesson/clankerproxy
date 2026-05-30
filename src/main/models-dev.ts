import https from 'https';

const MODELS_DEV_URL = 'https://models.dev/api.json';
const CACHE_TTL_MS = 10 * 60 * 1000;

let cache: { data: Record<string, any>; ts: number } | null = null;

function fetchText(url: string, redirectCount = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ClankerProxy/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (redirectCount >= 5) {
          reject(new Error('models.dev redirect limit exceeded'));
          return;
        }

        fetchText(res.headers.location, redirectCount + 1).then(resolve, reject);
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`models.dev API ${res.statusCode}`));
          return;
        }

        resolve(Buffer.concat(chunks).toString());
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

export async function fetchModelsDevCatalog({ force = false } = {}): Promise<Record<string, any>> {
  if (!force && cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.data;
  }

  const parsed = JSON.parse(await fetchText(MODELS_DEV_URL));
  cache = { data: parsed, ts: Date.now() };
  return parsed;
}
