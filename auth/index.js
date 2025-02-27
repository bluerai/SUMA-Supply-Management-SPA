import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import { logger } from '../modules/log.js';

export const AUTH = process.env.AUTH || "NONE";

let jwt_data = {};
try {
  if (fs.existsSync(process.env.JWTFILE))
    jwt_data = fs.readJsonSync(process.env.JWTFILE)
} catch (error) { logger.error(error); }

const JWT = (AUTH === "JWT") ? jwt_data : {};

export const JWT_KEY = JWT.key;

logger.info("Authorisation by " + AUTH)

//==== Actions ==================================================

export function verifyAction(req, res) {
  logger.info('/verify');
  const token = req.headers['authorization'];
  if (AUTH == "NONE") {
    logger.warn("Access granted without authentication!");
    return res.status(200).json({ message: 'access granted without authentication', user: {} });
  }
  if (!token) {
    return res.render(import.meta.dirname + '/views/login', function (error, html) {

      if (error) { logger.error(error); logger.debug(error.stack); return }

      logger.isLevelEnabled('debug') && logger.debug("verify: No token - html.length=" + html.length);

      res.status(401).json({ error: 'No token', html: html });
    })
  }
  jwt.verify(token, JWT_KEY, (err, decoded) => {
    if (err) {
      res.render(import.meta.dirname + '/views/login', function (error, html) {
        if (error) { logger.error(error); logger.debug(error.stack); return }

        logger.isLevelEnabled('debug') && logger.debug("verify: Invalid token - html.length=" + html.length);

        res.status(401).json({ error: 'Invalid token', html: html });
      })

    } else {
      logger.debug("verify: Valid token - loginuser=" + decoded.loginname + ", issued at: " + decoded.iat + ", expire at: " + decoded.exp);

      res.status(200).json({ message: 'Token is valid', user: decoded });
    }
  })
};


export function loginAction(req, res) {
  const { loginname, key } = req.body;
  logger.info("/login: " + loginname);

  if (JWT.credentials[loginname] == key) {
    const token = jwt.sign({ loginname }, JWT_KEY, { expiresIn: JWT.duration });
    res.status(200).json({ token: token });

  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
};
