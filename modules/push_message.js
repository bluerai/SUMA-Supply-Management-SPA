'use strict'

import fs from 'fs-extra';
import { logger } from './log.js'
import { join } from 'path'; 

const messagingfile = join(process.env.SUMA_CONFIG, "pushover.json");

class PushMessage {
  constructor(credentials) {
    this.cred = credentials
  }
  "name" = "none";
  "valid";
  error(msg) { };
  warn(msg) { };
  info(msg) { };
  _send(msg, title, prio, sound) { };
}

let Push = new PushMessage({});

if (messagingfile) {

  class Pushover extends PushMessage {
    constructor(credentials) {
      super(credentials);
      this.valid = (credentials.url && credentials.user && credentials.token);
    }
    "name" = "Pushover";

    error(msg, title) {
      (this.valid) && this._send(msg, title || "Fehler", 0, "intermission");
    }

    warn(msg, title) {
      (this.valid) && this._send(msg, title || "Warnung", 0, "none");
    }

    info(msg, title) {
      (this.valid) && this._send(msg, title || "Hinweis", 0, "none");
    }

    note(msg, title) {
      (this.valid) && this._send(msg, title || "Hinweis", -1, "none");
    }

    async _send(msg, title, prio, sound) {
      const headers = { "Content-Type": "application/json" };
      const body = JSON.stringify({
        "token": this.cred.token,
        "user": this.cred.user,
        "title": title,
        "priority": prio,
        "sound": sound,
        "message": msg,
      });
      const response = await fetch(this.cred.url, {
        method: "POST", headers, body
      });

      if (response.ok) {
        const data = await response.json();
        logger.debug("Pushover message successfully sent: " + JSON.stringify(data));

      } else
        logger.error("Pushover: response.statusText " + " (#" + response.status + ")");
    }
  }

  let cred = {};
  try {
    if (fs.existsSync(messagingfile))
      cred = fs.readJsonSync(messagingfile);
  } catch (error) {
    logger.error(error);
  }
  Push = new Pushover(cred);

  Push = (Push.valid) ? Push : new PushMessage({});
}

logger.info("Messaging by " + Push.name)
export const push = Push;

