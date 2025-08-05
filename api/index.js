//apiRouter

import { Router } from 'express';

import { push } from '../modules/pushover.js';
import { logger } from '../modules/log.js';
import { getAllProducts, connectDb, unconnectDb, evalProduct } from '../app/model.js';

import { join, basename } from "path";
import fs from "fs-extra";

export const apiRouter = Router();

apiRouter.get('/eval/', evalAction);
apiRouter.get('/health/', healthAction);
apiRouter.get('/backup/', backupAction);
apiRouter.get('/connectdb/', dbAction);
apiRouter.get('/unconnectdb/', dbAction);


//==== Actions ================================================================

export function evalAction(request, response) {
  try {
    response.json(evaluate());
  }
  catch (error) {
    const msg = "Interner Fehler in 'evalAction': " + error.message;
    logger.error("SUMA Error: " + msg);
    logger.debug(error.stack);
    push.syserror(msg);
    response.json({ state: false, msg: "SUMA Error: " + msg });
  }
}

//evaluate ca. 10 sec nach Start
setTimeout(() => { evaluate(true) }, 10000)

export function evaluate() {
  let msg = "Evaluate: ";
  try {
    connectDb();
    let data = getAllProducts();
    let changeCount = 0;
    for (let item of data) {
      if (item.sum > 0) {
        const old_state = item.state;
        item = evalProduct(item);
        if (item.state !== old_state) changeCount++;
      }
    }
    msg += "Der Status von " + changeCount + " von " + data.length + " Produkten wurde aktualisiert. ";
    logger.info(msg);
    if (changeCount > 0) push.sysinfo(msg);
    return { state: true, msg: "SUMA: " + msg };
  } catch (err) {
    msg += `Fehler beim Evaluieren der Produkte: ${err}`
    logger.error("SUMA Error: " + msg);
    push.syserror(msg);
    return ({ "state": false, "msg": "SUMA Error: " + msg });
  }
}

export async function healthAction(request, response) {
  try {
    logger.isLevelEnabled('debug') && logger.debug("healthAction");
    const count = getAllProducts().length;

    logger.debug(request.protocol + "-Server still healthy!");
    response.json({ healthy: true, count });
  }
  catch (error) {
    const message = "SUMA: Error on " + request.protocol + "-Server: " + error.message;
    logger.error(message);
    if (error.stack) logger.debug(error.stack);
    if (response) {
      response.json({ healthy: false, error: error.message });
    }
  }
}

export async function dbAction(request, response) {
  try {
    let result;
    switch (request.url) {
      case "/unconnectdb": result = unconnectDb(); break;
      case "/connectdb": result = connectDb(); break;
      default: result = { state: "error", msg: "Cannot GET /app" + request.url };
    }
    logger.isLevelEnabled('debug') && logger.debug(JSON.stringify(result));
    response.json(result);

  }
  catch (error) { errorHandler(error, 'dbAction') }
}


export function backupAction(request, response) {
  try {
    logger.info("backupAction");
    response.json(databaseBackup());
  }
  catch (error) {
    const msg = "Interner Fehler in 'databaseBackup': " + error.message;
    logger.error("SUMA Error: " + msg);
    PushManager.syserror(msg)
    response.json({ state: false, msg: msg });
  }
}

const databasefile = process.env.SUMA_DB;
const backupdir = process.env.SUMA_BACKUP;

// Backup-Funktion
// Kopiere die Datei SUMA.db in ein Verzeichnis backups, wenn das Verzeichnis backups leer ist 
// oder wenn SUMA.db neuer ist als jede Datei im Verzeichnis backups
export function databaseBackup() {
  let msg = "Backup: ";
  try {
    logger.info("databaseBackup");
    // Prüfen, ob Datei SUMA_DB existiert und lesbar ist
    fs.accessSync(databasefile, fs.constants.F_OK);
    // Backup-Verzeichnis erstellen, falls nicht vorhanden
    fs.ensureDirSync(backupdir);

    // Backup-Dateien auflisten
    const backupFiles = fs.readdirSync(backupdir);
    let shouldBackup = false;

    if (backupFiles.length === 0) {
      shouldBackup = true;
    } else {
      // Neueste Backup-Datei ermitteln
      if (backupFiles.length > 0) {
        const latestBackupFile = backupFiles.sort().reverse()[0];
        const latestBackupPath = join(backupdir, latestBackupFile);
        const sourceStat = fs.statSync(databasefile);
        const backupStat = fs.statSync(latestBackupPath);

        if (sourceStat.mtime > backupStat.mtime) {
          shouldBackup = true;
        }
      }
    }

    if (shouldBackup) {
      const backupPath = join(backupdir, `${basename(databasefile)}_${Date.now()}`);
      fs.copyFileSync(databasefile, backupPath);
      msg += `Backup der SUMA-Datenbank erzeugt.`;
      push.info(msg);
      cleanupBackupFiles();
    } else {
      msg += "Kein Datenbank-Backup erforderlich."
      push.sysinfo(msg);
    }
    logger.debug(msg);
    return ({ "state": true, "msg": "SUMA: " + msg });

  } catch (err) {
    msg += `Fehler beim Backup der Datenbank-Datei ${databasefile}: err`
    logger.error("SUMA Error: " + msg);
    push.syserror(msg);
    return ({ "state": false, "msg": "SUMA: " + msg });
  }
}

//Backup-Verzeichnis aufräumen
//Solange es mindestens 3 Backups gibt, werden die ältesten Backups gelöscht löschen, wenn diese älter als 7 Tage sind
function cleanupBackupFiles() {
  let msg = "Cleanup: ";
  try {
    // BackupDateien finden und nach Änderungsdatum sortieren
    const backupFiles = fs.readdirSync(backupdir);
    if (backupFiles.length <= 3) {
      msg += "Keine alten Backup-Dateien gelöscht.";
    } else {
      // Anzahl der zu löschenden Dateien berechnen
      const filesToDelete = backupFiles.length - 3;
      let deletedCount = 0;

      //Alte Backup-Dateien löschen
      for (const file of backupFiles) {
        const filepath = join(backupdir, file);
        if (deletedCount >= filesToDelete) break;

        const stats = fs.statSync(filepath);
        const fileAgeInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);

        if (fileAgeInDays > 7) {
          fs.removeSync(filepath);
          logger.silly(`SUMA: ${msg}Alte Backup-Datei gelöscht: ${filepath}`);
          deletedCount++;
        }
      }
      msg = deletedCount > 0 ?
        `Alte Backup-Dateien aufgeräumt! Löschungen: ${deletedCount}` :
        "Keine alten Backup-Dateien gelöscht.";
    }
    logger.debug("SUMA: " + msg);
    push.sysinfo(msg);
    return ({ "state": true, "msg": "SUMA: " + msg });

  } catch (err) {
    msg += `Fehler beim Cleanup der Datenbank-Backups: ${err}`
    logger.error("SUMA: " + msg);
    push.syserror(msg);
    return ({ "state": false, "msg": "SUMA Error: " + msg });
  }
}
