import express from 'express';
import https from 'https';
import fs from 'fs-extra';
import jwt from 'jsonwebtoken';

import { router } from './app/index.js';
import { logger } from './log.js'

const app = express(); 

const JWT_DATA = fs.readJsonSync(process.env.JWTFILE);
export const JWT_KEY = JWT_DATA.key;

const HTTPS_PORT = parseInt(process.env.HTTPS_PORT) || 443;

app.set('view engine', 'pug');

app.use(express.static(import.meta.dirname  + '/public'));

app.use(express.urlencoded({extended: false}));

app.use(express.json());

app.get('/verify', (req, res) => {
  logger.debug('/verify');
  const token = req.headers['authorization'];
  if (!token) {
    return res.render(import.meta.dirname + '/app/views/login', function (error, html) {

      if (error) { logger.error(error); logger.debug(error.stack); return }

      logger.isLevelEnabled('debug') && logger.debug("verify: No token - html.length=" + html.length);

      res.status(401).json({ error: 'No token', html: html });
    })
  }

  jwt.verify(token, JWT_KEY, (err, decoded) => {
    if (err) {
      res.render(import.meta.dirname + '/app/views/login', function (error, html) {
        if (error) { logger.error(error); logger.debug(error.stack); return }

        logger.isLevelEnabled('debug') && logger.debug("verify: Invalid token - html.length=" + html.length);

        res.status(401).json({ error: 'Invalid token', html: html });
      })

    } else {
      logger.debug("verify: Valid token - loginuser=" + decoded.loginname + ", expire in: " + decoded.exp);
      
      res.status(200).json({ message: 'Token is valid', user: decoded });
    }
  })
});

// Login route
app.post('/login', (req, res) => {
  const { loginname, key } = req.body;
  logger.debug("/login: " + loginname);

  if (JWT_DATA.credentials[loginname] == key) {
    const token = jwt.sign({ loginname }, JWT_KEY, { expiresIn: JWT_DATA.duration });
    res.status(200).json({ token: token });

  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.use('/app', router);

const options = {
  key: fs.readFileSync(process.env.KEYFILE),
  cert: fs.readFileSync(process.env.CERTFILE),
};
https.createServer(options, app).listen(HTTPS_PORT, () => {
  logger.info('Https-Server is listening to Port ' + HTTPS_PORT);
});
