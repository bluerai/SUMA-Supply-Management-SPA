
import { logger } from './log.js'

class PushMessage {
  constructor(credentials) {
    this.cred = credentials
  }
  "name";
  "valid";
  warn(msg) { };
  info(msg) { };
  _send(msg, title, prio, sound) { };
}

class Pushover extends PushMessage {
  constructor(credentials) {
    super(credentials);
    this.valid = (credentials.url && credentials.user && credentials.token);
    this.valid || logger.warn("pushover: Uncomplete credentials supplied.");
  }

  "name" = "Pushover";

  error(msg) {
    (this.valid) && this._send(msg, "Warnung", -1, "pushover");
  }

  info(msg) {
    (this.valid) && this._send(msg, "Hinweis", 0, "pushover");
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
      logger.info("Pushover message successfully sent: " + JSON.stringify(data));

    } else
      logger.error("Pushover: response.statusText " + " (#" + response.status + ")");

  }
}

export const push = new Pushover({ "url": process.env.PUSHOVER_URL, "user": process.env.PUSHOVER_USER, "token": process.env.PUSHOVER_TOKEN });
