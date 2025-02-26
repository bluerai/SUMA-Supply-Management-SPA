import express from 'express';
import https from 'https';
import fs from 'fs-extra';

import { router } from './app/index.js';
import { logger } from './log.js'

const app = express();

const HTTPS_PORT = parseInt(process.env.HTTPS_PORT) || 443;

app.set('view engine', 'pug');

app.use(express.static(import.meta.dirname  + '/public'));

app.use(express.urlencoded({extended: false}));

app.use(express.json());

app.use('/app', router);

app.use((request, response) => response.redirect('/app'));

const options = {
  key: fs.readFileSync(process.env.KEYFILE),
  cert: fs.readFileSync(process.env.CERTFILE),
};
https.createServer(options, app).listen(HTTPS_PORT, () => {
  logger.info('Https-Server is listening to Port ' + HTTPS_PORT);
});
