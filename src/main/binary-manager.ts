import { app } from 'electron';
import { existsSync, mkdirSync, chmodSync } from 'fs';
import { join } from 'path';
import { store } from './store';
import https from 'https';
import http from 'http';

const REPO = 'router-for-me/CLIProxyAPIPlus';
const BINARY_NAME = process.platform === 'win32' ? 'cli-proxy-api-plus.exe' : 'cli-proxy-api-plus';

function getBinDir(): string {
  const dir = join(app.getPath('userData'), 'bin');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export function getBinaryPath(): string {
  return join(getBinDir(), BINARY_NAME);
}

export function isBinaryInstalled(): boolean {
  return existsSync(getBinaryPath());
}

function getPlatformArch(): { os: string; arch: string } {
  const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'darwin' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  return { os, arch };
}

function getArchiveExt(): string {
  return process.platform === 'win32' ? 'zip' : 'tar.gz';
}

function fetch(url: string): Promise<{ data: Buffer; statusCode: number; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'ClankerProxy/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetch(res.headers.location).then(resolve, reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve({ data: Buffer.concat(chunks), statusCode: res.statusCode ?? 0, headers: res.headers as Record<string, string | string[] | undefined> }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export interface ReleaseInfo {
  version: string;
  downloadUrl: string;
  publishedAt: string;
}

export async function getLatestRelease(): Promise<ReleaseInfo> {
  const { data } = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
  const release = JSON.parse(data.toString());
  const { os, arch } = getPlatformArch();
  const ext = getArchiveExt();
  const pattern = `${os}_${arch}`;

  const asset = release.assets?.find((a: { name: string }) =>
    a.name.includes(pattern) && a.name.endsWith(ext)
  );

  if (!asset) {
    throw new Error(`No release asset found for ${os}/${arch} (${ext})`);
  }

  return {
    version: release.tag_name,
    downloadUrl: asset.browser_download_url,
    publishedAt: release.published_at,
  };
}

export async function checkForUpdate(): Promise<ReleaseInfo | null> {
  const currentVersion = store.get('binaryVersion');
  if (!currentVersion) return null;
  const latest = await getLatestRelease();
  if (latest.version !== currentVersion) return latest;
  return null;
}

async function extractZip(zipBuffer: Buffer, destDir: string): Promise<void> {
  // Use Node's built-in zip support via a temp file approach
  const { execSync } = await import('child_process');
  const { writeFileSync, unlinkSync } = await import('fs');
  const tmpZip = join(destDir, '_download.zip');
  writeFileSync(tmpZip, zipBuffer);

  if (process.platform === 'win32') {
    execSync(`powershell -Command "Expand-Archive -Force -Path '${tmpZip}' -DestinationPath '${destDir}'"`, { timeout: 60000 });
  } else {
    execSync(`unzip -o "${tmpZip}" -d "${destDir}"`, { timeout: 60000 });
  }
  unlinkSync(tmpZip);
}

async function extractTarGz(buffer: Buffer, destDir: string): Promise<void> {
  const { execSync } = await import('child_process');
  const { writeFileSync, unlinkSync } = await import('fs');
  const tmpFile = join(destDir, '_download.tar.gz');
  writeFileSync(tmpFile, buffer);
  execSync(`tar -xzf "${tmpFile}" -C "${destDir}"`, { timeout: 60000 });
  unlinkSync(tmpFile);
}

export async function downloadBinary(release?: ReleaseInfo): Promise<string> {
  if (!release) {
    release = await getLatestRelease();
  }

  const binDir = getBinDir();
  const { data } = await fetch(release.downloadUrl);

  if (process.platform === 'win32') {
    await extractZip(data, binDir);
  } else {
    await extractTarGz(data, binDir);
  }

  // The archive extracts files into the bin dir. Find and move the binary if nested.
  const binaryPath = getBinaryPath();
  const { readdirSync, renameSync, statSync } = await import('fs');

  // goreleaser archives have the binary at the top level of the archive
  // but sometimes inside a subdirectory. Search for it.
  function findBinary(dir: string): string | null {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isFile() && (entry === BINARY_NAME || entry === 'cli-proxy-api-plus' || entry === 'cli-proxy-api-plus.exe')) {
        return full;
      }
      if (stat.isDirectory() && !entry.startsWith('_')) {
        const found = findBinary(full);
        if (found) return found;
      }
    }
    return null;
  }

  const found = findBinary(binDir);
  if (found && found !== binaryPath) {
    renameSync(found, binaryPath);
  }

  if (process.platform !== 'win32') {
    chmodSync(binaryPath, 0o755);
  }

  store.set('binaryVersion', release.version);
  return binaryPath;
}
