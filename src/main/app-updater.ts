import { app } from 'electron';
import https from 'https';
import { appLogger } from './app-logger';

const REPO = 'githubesson/clankerproxy';

function log(msg: string) {
  appLogger.log(`[app-updater] ${msg}`);
}

export interface AppReleaseInfo {
  version: string;
  releaseUrl: string;
  publishedAt: string;
}

let cached: AppReleaseInfo | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function fetchJSON(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ClankerProxy/1.0', Accept: 'application/vnd.github+json' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJSON(res.headers.location).then(resolve, reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`GitHub API ${res.statusCode}`));
          return;
        }
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(e); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseSemver(v: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

// Returns true if `a` is strictly greater than `b`. Pre-release suffixes are
// ignored (treated as the same base version) — good enough for "is there a
// newer tagged release than what I'm running".
function isNewer(a: string, b: string): boolean {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return false;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return true;
    if (pa[i] < pb[i]) return false;
  }
  return false;
}

/**
 * Check GitHub for a newer release of clankerproxy itself. Returns the release
 * info if an update is available, otherwise null. In dev (unpackaged) we skip
 * because `app.getVersion()` reflects package.json which lags tags.
 */
export async function checkForAppUpdate(): Promise<AppReleaseInfo | null> {
  if (!app.isPackaged) return null;

  const release = await fetchJSON(`https://api.github.com/repos/${REPO}/releases/latest`);
  const latest: AppReleaseInfo = {
    version: String(release.tag_name || '').replace(/^v/, ''),
    releaseUrl: release.html_url,
    publishedAt: release.published_at,
  };
  if (!latest.version) return null;

  const current = app.getVersion();
  if (isNewer(latest.version, current)) {
    cached = latest;
    return latest;
  }
  cached = null;
  return null;
}

export function getCachedAppUpdate(): AppReleaseInfo | null {
  return cached;
}

/**
 * One-shot check at startup; purely informational (logs only). The Dashboard
 * surfaces availability via the `app:checkForUpdate` IPC.
 */
export async function checkForAppUpdateOnStartup(): Promise<void> {
  if (!app.isPackaged) return;
  try {
    const update = await checkForAppUpdate();
    if (update) {
      log(`Startup check: new app version available (${update.version}, current ${app.getVersion()}).`);
    } else {
      log(`Startup check: app is up to date (${app.getVersion()}).`);
    }
  } catch (err) {
    log(`Startup check failed: ${err}`);
  }
}

export function startAppUpdaterPolling(): void {
  stopAppUpdaterPolling();
  if (!app.isPackaged) return;
  const hour = 60 * 60 * 1000;
  timer = setInterval(() => {
    checkForAppUpdate().catch((err) => log(`Poll failed: ${err}`));
  }, hour);
}

export function stopAppUpdaterPolling(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
