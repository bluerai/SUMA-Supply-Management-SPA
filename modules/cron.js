'use strict'

import { CronJob } from 'cron';
import { push } from '../modules/push_message.js';
import { evaluate, databaseBackup } from '../api/index.js';
import { logger } from './log.js';

export const evaluateCronJob = new CronJob(
  process.env.CRON_EVAL, // cronTime
  evaluateJob, // onTick
  null, // onComplete
  false, // start
  process.env.TZ // timeZone
);

export const databaseBackupCronJob = new CronJob(
  process.env.CRON_BACKUP, // cronTime
  backupDatabaseJob, // onTick
  null, // onComplete
  false, // start
  process.env.TZ // timeZone
);

function evaluateJob() {
  try {
    logger.info("Cron: evaluateJob startet.");
    evaluate();
  } catch (error) {
    const msg = 'SUMA: Fehler in CronJob "evaluateJob": ' + error.message;
    logger.error(msg);
    logger.debug(error.stack);
    push.error(msg);
  }
}

async function backupDatabaseJob() {
  try {
    logger.info("SUMA: backupDatabaseJob startet.");

    databaseBackup();

  } catch (error) {
    const msg = 'SUMA: Fehler in CronJob "backupDatabaseJob": ' + error.message;
    logger.error(msg);
    logger.debug(error.stack);
    push.error(msg);
  }
}
