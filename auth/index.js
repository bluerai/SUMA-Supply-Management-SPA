'use strict'

import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import { join } from 'path';
import { logger } from '../modules/log.js';

export let JWT = {};
const authfile = join(process.env.SUMA_CONFIG, "jwt.json");
try {
  if (fs.existsSync(authfile)) {
    JWT = fs.readJsonSync(authfile)
    logger.info("Authorisation by jwt token");
  } else {
    logger.warn("No access Authorisation!");
  }
} catch (error) {
  logger.error(error);
  logger.warn("No access authorisation!");
}

export const JWT_KEY = JWT.key;

//==== Actions ==================================================

export function verifyAction(req, res) {

  const token = req.headers['authorization'];
  if (!token || token == "null") {
    return res.render(import.meta.dirname + '/views/login', function (error, html) {
      if (error) { logger.error(error); logger.debug(error.stack); return }
      logger.info("/verify: No token");
      res.status(401).json({ error: 'No token', html: html });
    })
  }

  jwt.verify(token, JWT_KEY, (err, decoded) => {
    if (err || !Object.keys(JWT.credentials).includes(decoded.username)) {
      res.render(import.meta.dirname + '/views/login', function (error, html) {
        if (error) { logger.error(error); logger.debug(error.stack); return }
        logger.info("/verify: Invalid token");
        res.status(401).json({ error: 'Invalid token', html: html });
      })

    } else {
      logger.info("/verify: " + decoded.username + ", issued at: " + decoded.iat + ", expire at: " + decoded.exp);
      res.status(200).json({ message: 'Token is valid', user: decoded });
    }
  })
};

export function loginAction(req, res) {
  const { username, password } = req.body;

  if ((username) && (username.length >= 3) && (password) && (password.length >= 12)
    && JWT.credentials[username] == password) {
    const token = jwt.sign({ username }, JWT_KEY, { expiresIn: JWT.duration });
    res.status(200).json({ token: token });

  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

export function protect(res, token, funct) {
  jwt.verify(token, JWT_KEY, (err, decoded) => {
    if (err || !Object.keys(JWT.credentials).includes(decoded.username)) {
      logger.debug("protect: No Authorisation!");
      res.status(401).json({ error: 'No Authorisation' });
    } else {
      logger.debug("protect: Authorisation ok!");
      funct();
    }
  })
}
