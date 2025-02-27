
import { CronJob } from 'cron';
import { push } from '../modules/push_message.js';
import { evaluate } from '../api/index.js';
import { logger } from './log.js'

export const evaluateCronJob = new CronJob(
  process.env.CRON_EVAL || "0 0 * * 6", // cronTime
  evaluateJob, // onTick
  null, // onComplete
  false, // start
  process.env.TZ // timeZone
);

function evaluateJob() {
  try {
    logger.info("Cron: evaluateJob started");
    evaluate()
  } catch (error) {
    const msg = 'SUMA: Fehler in CronJob "evaluateJob": ' + error.message;
    logger.error(msg);
    logger.debug(error.stack);
    push.error(msg);
  }
}
