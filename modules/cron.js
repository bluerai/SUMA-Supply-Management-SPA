'use strict'

import { CronJob } from 'cron';
import { push } from '../modules/pushover.js';
import { evaluate, databaseBackup } from '../api/index.js';
import { log } from './log.js';

const createCronJob = (cronTime, onTick) => {
  if (!cronTime) {
    // Provide a no-op stub to avoid crashing when the environment isn't configured.
    return {
      start: () => { },
      stop: () => { },
      nextDate: () => null,
    };
  }
  return new CronJob(cronTime, onTick, null, false, process.env.TZ);
};

export const evaluateCronJob = createCronJob(process.env.CRON_EVAL, evaluateJob);
export const databaseBackupCronJob = createCronJob(process.env.CRON_BACKUP, backupDatabaseJob);

function evaluateJob() {
  try {
    log("Cron: evaluateJob startet.");
    evaluate();
  } catch (error) {
    const msg = 'Fehler in CronJob "evaluateJob": ' + error.message;
    log.error("SUMA error:" + msg);
    log.debug(error.stack);
    push.error(msg);
  }
}

async function backupDatabaseJob() {
  try {
    log("SUMA: backupDatabaseJob startet.");

    databaseBackup();

  } catch (error) {
    const msg = 'Fehler in CronJob "backupDatabaseJob": ' + error.message;
    log.error("SUMA error: " + msg);
    log.debug(error.stack);
    push.error(msg);
  }
}
