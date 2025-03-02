
import { CronJob } from 'cron';
import { push } from '../modules/push_message.js';
import { evaluate } from '../api/index.js';
import { logger } from './log.js';
import path from "path";
import fs from "fs-extra";

export const evaluateCronJob = new CronJob(
  process.env.CRON_EVAL || "0 0 * * 6", // cronTime
  evaluateJob, // onTick
  null, // onComplete
  false, // start
  process.env.TZ // timeZone
);

export const databaseBackupCronJob = new CronJob(
  process.env.CRON_Backup || "0 0 * * *", // cronTime
  backupDatabaseJob, // onTick
  null, // onComplete
  false, // start
  process.env.TZ // timeZone
);

//evaluate on On start
setTimeout(evaluate, 10000)

function evaluateJob() {
  try {
    logger.info("Cron: evaluateJob startet.");
    evaluate()
  } catch (error) {
    const msg = 'SUMA: Fehler in CronJob "evaluateJob": ' + error.message;
    logger.error(msg);
    logger.debug(error.stack);
    push.error(msg);
  }
}


const SUMA_DB = process.env.SUMA_DB;
const SUMA_DB_BACKUPDIR = process.env.SUMA_DB_BACKUP;;

// Backup-Funktion
// Kopiere die Datei SUMA.db in ein Verzeichnis backups, wenn das Verzeichnis backups leer ist 
// oder wenn SUMA.db neuer ist als jede Datei im Verzeichnis backups
async function backupDatabaseJob() {
  try {
    logger.info("SUMA: backupDatabaseJob startet.");
    // Prüfen, ob Datei SUMA_DB existiert
    try {
      fs.accessSync(SUMA_DB, fs.constants.F_OK);
    } catch (err) {
      logger.error(`SUMA: Die Datenbank-Datei ${SUMA_DB} wurde nicht gefunden. Abbruch.`);
      return;
    }
    // Backup-Verzeichnis erstellen, falls nicht vorhanden
    fs.ensureDirSync(SUMA_DB_BACKUPDIR);

    // Backup-Dateien auflisten
    const backupFiles = await fs.readdir(SUMA_DB_BACKUPDIR);
    let shouldBackup = false;

    if (backupFiles.length === 0) {
      shouldBackup = true;
    } else {
      // Neueste Backup-Datei ermitteln
      if (backupFiles.length > 0) {
        const latestBackupFile = backupFiles.sort().reverse()[0];
        const latestBackupPath = path.join(SUMA_DB_BACKUPDIR, latestBackupFile);
        const sourceStat = await fs.stat(SUMA_DB);
        const backupStat = await fs.stat(latestBackupPath);

        if (sourceStat.mtime > backupStat.mtime) {
          shouldBackup = true;
        }
      }
    }

    if (shouldBackup) {
      const backupPath = path.join(SUMA_DB_BACKUPDIR, `${path.basename(SUMA_DB)}_${Date.now()}`);
      await fs.copyFile(SUMA_DB, backupPath);
      logger.debug(`SUMA: Datenbank-Backup ausgeführt.`);
      push.info(`SUMA: Datenbank-Backup ausgeführt.`);
      cleanupBackupFiles();
    } else {
      logger.debug("Kein Datenbank-Backup erforderlich.");
    }
  } catch (error) {
    const msg = 'SUMA: Fehler in CronJob "backupDatabaseJob": ' + error.message;
    logger.error(msg);
    logger.debug(error.stack);
    push.error(msg);
  }
}

//Backup-Verzeichnis aufräumen
//Solange es mindestens 3 Backups, werden die ältesten Backups gelöscht löschen, wenn diese älter als 7 Tage sind
async function cleanupBackupFiles() {
  // BackupDateien finden und nach Änderungsdatum sortieren
  const backupFiles = fs.readdirSync(SUMA_DB_BACKUPDIR);
  if (backupFiles.length <= 3) {
    logger.debug("SUMA: Keine alten Backup-Dateien gelöscht.");
    return;
  }
  // Anzahl der zu löschenden Dateien berechnen
  const filesToDelete = backupFiles.length - 3;
  let deletedCount = 0;

  //Alte Backup-Dateien löschen
  for (const file of backupFiles) {
    if (deletedCount >= filesToDelete) break;

    const stats = fs.statSync(file);
    const fileAgeInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (fileAgeInDays > 7) {
      fs.removeSync(file);
      logger.debug(`SUMA: Alte Backup-Datei gelöscht: ${file}`);
      deletedCount++;
    }
  }

  logger.info(deletedCount > 0 ? 
    `SUMA: Alte Backup-Dateien aufgeräumt! Löschungen: ${deletedCount}` :
    "SUMA: Keine alten Backup-Dateien gelöscht.");
}
