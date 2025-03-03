//apiRouter

import { Router } from 'express';

import { push } from '../modules/push_message.js';
import { logger } from '../modules/log.js';
import { getAllProducts, connectDb, unconnectDb, evalProduct } from '../app/model.js';

import path from "path";
import fs from "fs-extra";

export const apiRouter = Router();

apiRouter.use((req, res, next) => {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (isPrivateIP(clientIP)) {
    logger.debug(`LAN access from: ${clientIP}`);
    return next();
  } else {
    logger.warn(`WAN access from ip ${clientIP} blocked`);
    return res.status(403).json({ message: "No access." });
  }
});

apiRouter.get('/eval/', evalAction);
apiRouter.get('/health/', healthAction);
apiRouter.get('/backup/', backupAction);
apiRouter.get('/connectdb/', dbAction);
apiRouter.get('/unconnectdb/', dbAction);


//==== Actions ================================================================

export function evalAction(request, response) {
  try {
    response.json(evaluate(false));
  }
  catch (error) {
    const msg = "SUMA: Interner Fehler in 'evalAction': " + error.message;
    logger.error(msg);
    logger.debug(error.stack);
    push.error(msg);
    response.json({ state: false, msg: msg });
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
    const msg = "SUMA: Interner Fehler in 'databaseBackup': " + error.message;
    logger.error(msg);
    response.json({ state: false, msg: msg });
  }
}

//evaluate 10 sec nach Start
//setTimeout(() => { evaluate(true) }, 10000)

export function evaluate(forced) {
  connectDb();
  let data = getAllProducts();
  let changeCount = 0;
  for (let item of data) {
    (item.entry_list) && (evalProduct(item, forced)) && changeCount++;
  }
  const msg = "SUMA: " + data.length + " Produkte überprüft. " +
    ((changeCount > 1) ? (changeCount + " Produkte haben") : (((changeCount === 1) ? "Ein" : "Kein") + " Produkt hat")) +
    " einen neuen Status erhalten.";
  logger.info(msg);
  return { state: true, msg: msg };
}


const databasefile = process.env.SUMA_DB;
const backupdir = process.env.SUMA_BACKUP;

// Backup-Funktion
// Kopiere die Datei SUMA.db in ein Verzeichnis backups, wenn das Verzeichnis backups leer ist 
// oder wenn SUMA.db neuer ist als jede Datei im Verzeichnis backups
export function databaseBackup() {
  // Prüfen, ob Datei SUMA_DB existiert
  try {
    logger.info("databaseBackup");
    fs.accessSync(databasefile, fs.constants.F_OK);
  } catch (err) {
    const msg = `SUMA: Die Datenbank-Datei ${databasefile} wurde nicht gefunden. Abbruch.`
    logger.error(msg);
    return ({ "state": true, "msg": msg});
  }
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
      const latestBackupPath = path.join(backupdir, latestBackupFile);
      const sourceStat = fs.statSync(databasefile);
      const backupStat = fs.statSync(latestBackupPath);

      if (sourceStat.mtime > backupStat.mtime) {
        shouldBackup = true;
      }
    }
  }

  if (shouldBackup) {
    const backupPath = path.join(backupdir, `${path.basename(databasefile)}_${Date.now()}`);
    fs.copyFileSync(databasefile, backupPath);
    cleanupBackupFiles();
    const msg = `SUMA: Datenbank-Backup erstellt.`
    logger.debug(msg);
    return ({ "state": true, "msg": msg});
  } else {
    logger.debug("SUMA: Kein Datenbank-Backup erforderlich.");
    return ({ "state": true, "msg": "SUMA: Kein Datenbank-Backup erforderlich." });
  }
}

//Backup-Verzeichnis aufräumen
//Solange es mindestens 3 Backups, werden die ältesten Backups gelöscht löschen, wenn diese älter als 7 Tage sind
async function cleanupBackupFiles() {
  // BackupDateien finden und nach Änderungsdatum sortieren
  const backupFiles = fs.readdirSync(backupdir);
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

  const msg = deletedCount > 0 ?
    `SUMA: Alte Backup-Dateien aufgeräumt! Löschungen: ${deletedCount}` :
    "SUMA: Keine alten Backup-Dateien gelöscht.";
  logger.info(msg);
  return;
}

//==== Actions end ================================================================

const isPrivateIP = (ip) => {
  if (!ip) return false;

  // IPv4 private Netzwerke
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1]))/.test(ip)) {
    return true;
  }

  // IPv6 private Netzwerke
  if (/^(::1|fc00:|fd00:|fe80:)/.test(ip)) {
    return true;
  }

  // IPv4-Mapped IPv6 (::ffff:192.168.x.x)
  if (ip.startsWith("::ffff:")) {
    const ipv4Part = ip.split(":").pop();
    return isPrivateIP(ipv4Part);
  }

  return false;
};