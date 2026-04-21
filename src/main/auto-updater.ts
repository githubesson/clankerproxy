import { store } from './store';
import { checkForUpdate, downloadBinary, isBinaryInstalled } from './binary-manager';
import { appLogger } from './app-logger';

let timer: ReturnType<typeof setInterval> | null = null;
type AfterBinaryUpdate = (version: string) => Promise<void>;

function log(msg: string) {
  appLogger.log(`[auto-updater] ${msg}`);
}

async function performUpdate(afterBinaryUpdate?: AfterBinaryUpdate): Promise<void> {
  if (!isBinaryInstalled()) return;

  log('Checking for updates...');
  try {
    const update = await checkForUpdate();
    if (update) {
      log(`New version available: ${update.version}, downloading...`);
      await downloadBinary(update);

      if (afterBinaryUpdate) {
        await afterBinaryUpdate(update.version);
      }

      log(`Updated to ${update.version}`);
    } else {
      log('Already on latest version');
    }
  } catch (err) {
    log(`Update check failed: ${err}`);
  }
}

/**
 * One-shot non-downloading check at app startup. Runs regardless of the
 * `autoUpdateBinary` pref so stale binaries don't silently hide newer models
 * and features from the user - the renderer surfaces the availability via the
 * `binary:checkForUpdate` IPC. This purely logs; downloading is gated by the
 * user's opt-in `autoUpdateBinary` pref (handled by startAutoUpdater).
 */
export async function checkForUpdateOnStartup(): Promise<void> {
  if (!isBinaryInstalled()) return;

  try {
    const update = await checkForUpdate();
    if (update) {
      log(`Startup check: new version available (${update.version}). Installed binary will be offered an update in the Dashboard.`);
    } else {
      log('Startup check: binary is up to date.');
    }
  } catch (err) {
    log(`Startup check failed: ${err}`);
  }
}

export function startAutoUpdater(afterBinaryUpdate?: AfterBinaryUpdate): void {
  stopAutoUpdater();

  if (!store.get('autoUpdateBinary')) return;

  const minutes = store.get('autoUpdateIntervalMinutes') || 30;
  const ms = minutes * 60 * 1000;

  log(`Enabled, checking every ${minutes} minutes`);

  void performUpdate(afterBinaryUpdate);
  timer = setInterval(() => {
    void performUpdate(afterBinaryUpdate);
  }, ms);
}

export function stopAutoUpdater(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function restartAutoUpdater(afterBinaryUpdate?: AfterBinaryUpdate): void {
  startAutoUpdater(afterBinaryUpdate);
}
