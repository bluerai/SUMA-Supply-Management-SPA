import express from 'express';
import https from 'https';
import fs from 'fs-extra';

import { appRouter } from './app/index.js';
import { apiRouter } from './api/index.js';
import { verifyAction, loginAction } from './auth/index.js';
import { logger } from './modules/log.js';
import { evaluateCronJob } from './modules/cron.js';

const app = express();

const PORT = parseInt(process.env.PORT) || 3000;

app.set('view engine', 'pug');

app.use(express.static(import.meta.dirname + '/public'));

app.use(express.urlencoded({ extended: false }));

app.use(express.json());

app.get('/verify', verifyAction);
app.post('/login', loginAction);

app.use('/app', appRouter);

app.use('/api', apiRouter);

app.use('/', (request, response) => response.redirect('/app'));

evaluateCronJob.start();

if (fs.existsSync(process.env.KEYFILE) && fs.existsSync(process.env.CERTFILE)) {

  //key + Cert vorhanden, also https, 
  const options = {
    key: fs.readFileSync(process.env.KEYFILE),
    cert: fs.readFileSync(process.env.CERTFILE),
  };
  const server = https.createServer(options, app).listen(PORT, () => {
    const address = server.address();
    logger.info(`Https-Server is listening to https://${getLocalIp()}:${PORT}`)
  });

} else {

  const server = app.listen(PORT, () => {
    const address = server.address();
    logger.warn(`No encrypted connection, as no HTTPS certificate is implemented.`);
    logger.info(`Http-Server is listening to http://${getLocalIp()}:${PORT}`)
  })
}

import os from 'os';

const getLocalIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback auf localhost
};