'use strict'

import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import crypto from 'crypto'
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

  const token = req.headers.authorization?.split(' ')[1]

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

export function protect(request, response, next) {
  if (request.path === '/') {
    return next();
  }

  const token = request.headers.authorization?.split(' ')[1];
  logger.silly("Protected path: " + request.path + "; " + token);

  if (!token) {
    console.log("No Token !!!");
    return response.status(401).json({ error: 'No Authorisation' });
  }

  jwt.verify(token, JWT_KEY, (err, decoded) => {
    if (err || !Object.keys(JWT.credentials).includes(decoded.username)) {
      logger.debug("protect: No Authorisation!");
      response.status(401).json({ error: 'No Authorisation' });

    } else {
      logger.debug("protect: Authorisation ok!");
      request.userId = decoded.username;
      next();
    }
  })
}

function generateSecureRandomString(length = 32) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let result = '';
  randomValues.forEach(value => {
    result += characters.charAt(value % charactersLength);
  });

  return result;
}
