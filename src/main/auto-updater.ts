import { store } from './store';
import { checkForUpdate, downloadBinary, isBinaryInstalled } from './binary-manager';
import { appLogger } from './app-logger';

let timer: ReturnType<typeof setInterval> | null = null;

function log(msg: string) {
  appLogger.log(`[auto-updater] ${msg}`);
}

async function performUpdate(): Promise<void> {
  if (!isBinaryInstalled()) return;

  log('Checking for updates...');
  try {
    const update = await checkForUpdate();
    if (update) {
      log(`New version available: ${update.version}, downloading...`);
      await downloadBinary(update);
      log(`Updated to ${update.version}`);
    } else {
      log('Already on latest version');
    }
  } catch (err) {
    log(`Update check failed: ${err}`);
  }
}

export function startAutoUpdater(): void {
  stopAutoUpdater();

  if (!store.get('autoUpdateBinary')) return;

  const minutes = store.get('autoUpdateIntervalMinutes') || 30;
  const ms = minutes * 60 * 1000;

  log(`Enabled, checking every ${minutes} minutes`);

  performUpdate();
  timer = setInterval(performUpdate, ms);
}

export function stopAutoUpdater(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function restartAutoUpdater(): void {
  startAutoUpdater();
}
