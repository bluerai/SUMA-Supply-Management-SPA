'use strict'

import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import argon2 from 'argon2';
import crypto from 'crypto';
import { join } from 'path';
import { logger } from '../modules/log.js';

export let JWT = {};
const authfile = join(process.env.SUMA_CONFIG, "jwt.json");
try {
  if (fs.existsSync(authfile)) {
    JWT = fs.readJsonSync(authfile)
    logger.info("Authorisation by jwt token");
  } else {
    JWT.key = generateSecureRandomString(32);
    JWT.duration = "30d";
    fs.writeJsonSync(authfile, JWT);
    logger.warn("New JWT file saved: " + authfile);
  }
} catch (error) {
  logger.error(error);
  logger.warn("No access authorisation!");
}

export const JWT_KEY = JWT.key;

const usersFile = join(process.env.SUMA_CONFIG, "users.json");

//==== Actions ==================================================

export function verifyAction(req, res) {

  const token = req.headers.authorization?.split(' ')[1]

  if (!token || token == "null") {
    return res.render(join(import.meta.dirname, 'views', 'login'), function (error, html) {
      if (error) { logger.error(error); logger.debug(error.stack); return }
      logger.info("/verify: No token");
      res.status(401).json({ error: 'No token', html: html });
    })
  }

  jwt.verify(token, JWT_KEY, (err, decoded) => {
    if (err) {
      res.render(join(import.meta.dirname, 'views', 'login'), function (error, html) {
        if (error) { logger.error(error); logger.debug(error.stack); return }
        logger.info("/verify: Invalid token");
        res.status(401).json({ error: 'Invalid token', html: html });
      })

    } else {
      logger.info("/verify: " + decoded.username + ", expire at: " + new Date(decoded.exp * 1000).toLocaleString());
      res.status(200).json({ message: 'Token is valid', user: decoded });
    }
  })
};

export function loginAction(req, res) {
  try {

    const { username, password } = req.body;

    if (!username || username.length < 3 || !password || password.length < 12) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    let users = {};
    try {
      if (fs.existsSync(usersFile)) {
        users = fs.readJsonSync(usersFile);
      }
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!users[username]) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (users[username].startsWith("$argon2id$")) {  //bereits gehasht
      argon2.verify(users[username], username + ":" + password)
        .then(match => {
          if (match) {
            const token = jwt.sign({ username }, JWT_KEY, { expiresIn: JWT.duration });
            res.status(200).json({ token: token });
          } else {
            res.status(401).json({ error: 'Invalid credentials' });
          }
        })
    } else { //erstmalige Benutzung - wird geprüft und gehasht
      if (password === users[username]) {
        const token = jwt.sign({ username }, JWT_KEY, { expiresIn: JWT.duration });
        savePasswordAsHash(username, password, users);
        return res.status(200).json({ token: token });
      }
    }

  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Internal server error' });
  };
};

function savePasswordAsHash(username, password, users) {
  argon2.hash(username + ":" + password)
    .then(hash => {
      users[username] = hash;
      fs.writeJsonSync(usersFile, users);
      logger.info(`User ${username}: Password hashed`);
      return true;
    })
}


export function protect(request, response, next) {
  if ((request.path.startsWith('/cover/')) ||
    (request.path.startsWith('/file/')) ||
    request.path === '/') {
    return next();
  }
  const token = request.headers.authorization?.split(' ')[1];
  logger.silly("Protected path: " + request.path + "; " + token);

  if (!token) {
    logger.debug("No Token !!!");
    if (verifySignature) { return next(); }
    return response.status(401).json({ error: 'No Authorisation' });
  }

  jwt.verify(token, JWT_KEY, (err, decoded) => {
    if (err) {
      logger.debug("protect: No Authorisation!");
      response.status(401).json({ error: 'No Authorisation' });

    } else {
      logger.debug("protect: Authorisation ok! - " + decoded.username + ", expires at: " + new Date(decoded.exp * 1000).toLocaleString());
      request.userId = decoded.username;
      next();
    }
  })
}

// Funktion zum Erstellen einer Signature
export const createSignature = (identifier, expiresIn) => {
  const expiration = Date.now() + expiresIn * 1000; // Gültigkeitsdauer in Millisekunden

  const signature = crypto
    .createHmac('sha256', JWT_KEY)
    .update(`${identifier}:${expiration}`)
    .digest('hex');

  return `?expires=${expiration}&signature=${signature}`;
};

// Funktion zum Überprüfen einer Signature
export const verifySignature = (req) => {

  const { expires, signature } = req.query;
  const identifier = parseInt(req.params.id, 10);

  if (!expires || !signature) { return false; }

  const expectedSignature = crypto
    .createHmac('sha256', JWT_KEY)
    .update(`${identifier}:${expires}`)
    .digest('hex');

  logger.silly("verifySignature: Book " + identifier + " expires at: " + new Date(Math.round((expires / 1000) * 1000)).toLocaleString());
  return signature === expectedSignature && Date.now() < parseInt(expires, 10);
};


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
