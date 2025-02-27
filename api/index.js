import { Router } from 'express';

import { push } from '../modules/push_message.js';
import { AUTH, JWT_KEY } from '../auth/index.js';
import { logger } from '../modules/log.js';
import { getAllProducts, connectDb, unconnectDb, evalProduct } from '../app/model.js';


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
apiRouter.get('/connectdb/', dbAction);
apiRouter.get('/unconnectdb/', dbAction);


//==== Actions ================================================================

export function evalAction(request, response) {
  try {
    response.json(evaluate());
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
    response.json({ healthy: true, count });
    logger.debug("Still healthy! Number of Products: " + count);
  }
  catch (error) {
    errorHandler(error, 'healthAction');
    response.json({ healthy: false, error: error.message });
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

export function evaluate() {
  connectDb();
  let data = getAllProducts();
  let changeCount = 0;
  for (let item of data) {
    (item.entry_list) && (evalProduct(item)) && changeCount++;
  }
  const msg = "SUMA: " + data.length + " Produkte wurden überprüft. " +
    ((changeCount > 1) ? (changeCount + " Produkte haben") : (((changeCount === 1) ? "Ein" : "Kein") + " Produkt hat")) +
    " einen neuen Status erhalten.";
  push.info(msg, "SUMA evaluate");
  logger.info(msg);
  return { state: true, msg: msg };
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