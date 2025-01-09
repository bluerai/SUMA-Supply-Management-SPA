import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../log.js'

import {
  getCategory, getData, createItem, getItem, createCategory, updateItemEntry, renameItem, deleteItem, deleteCategory,
  evalItem, connectDb, unconnectDb } from './model.js';

const PUSHOVER_URL = process.env.PUSHOVER_URL;
const PUSHOVER_TOKEN = process.env.PUSHOVER_TOKEN;
const PUSHOVER_USER = process.env.PUSHOVER_USER;

export async function startAction(request, response) {
  logger.info("startAction: request.url=" + JSON.stringify(request.url));
  try {
    const data = getCategory();
    logger.debug("startAction: data=" + JSON.stringify(data));
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/start', { data })
  }
  catch (error) { errorHandler(error, 'startAction', response) }
}

export async function categoryAction(request, response) {
  logger.info("categoryAction: request.params=" + JSON.stringify(request.params));
  try {
    const categoryId = parseInt(request.params.id);
    let data = getCategory(categoryId);
    logger.debug("categoryAction: data=" + JSON.stringify(data));
    response.send(data);
  }
  catch (error) { errorHandler(error, 'categoryAction', response) }
}

export async function getHeadAction(request, response) {
  logger.info("getHeadAction: request.params=" + JSON.stringify(request.params));
  try {
    const itemId = (request.params.id) && parseInt(request.params.id, 10) || 0;
    let item = getItem(itemId);
    logger.debug("getHeadAction: item=" + JSON.stringify(item));
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/itemHead', { item: item }, function (error, html) {
      if (error) {
        logger.info(error);
      } else {
        logger.debug("getHeadAction: html.length=" + html.length);
        response.send({ html });
      }
    })
  }
  catch (error) { errorHandler(error, 'getHeadAction', response) }
}

export async function getDetailsAction(request, response) {
  logger.info("getDetailsAction: request.params=" + JSON.stringify(request.params));
  try {
    const curItemId = (request.params.id) && parseInt(request.params.id, 10) || 0;
    let item = getItem(curItemId);
    //logger.info("getDetailsAction: item=" + JSON.stringify(item));
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/itemDetails', { item: item }, function (error, html) {
      if (error) {
        console.logger.info(error);
      } else {
        //logger.info("getDetailsAction: html.length=" + html.length);
        response.send({ html });
      }
    })
  }
  catch (error) { errorHandler(error, 'getDetailsAction', response) }
}

export async function updateAction(request, response) {
  logger.info("updateAction");
  try {
    let body = '';
    request.on('readable', () => {
      const temp = request.read();
      body += temp !== null ? temp : '';
    });
    request.on('end', () => {
      let data = JSON.parse(body);
      updateItemEntry(data.id, data.year, data.month, data.count);
      const item = getItem(data.id)

      if (item) {
        response.locals.sum = item.sum;
        response.render(dirname(fileURLToPath(import.meta.url)) + '/views/itemDetails', { item: item }, function (error, html) {
          if (error) {
            console.logger.info(error);
          } else {
            //logger.info("getDetailsAction: html.length=" + html.length);
            response.send({ html: html, sum: response.locals.sum });
          }
        })
      } else {
        response.writeHead(400, "Unzulässige Eingabe", { 'content-type': 'text/html' });
        response.end();
      }
    });
  }
  catch (error) { errorHandler(error, 'updateAction', response) }
}

export async function renameAction(request, response) {
  logger.info("renameAction: request.params=" + JSON.stringify(request.params));
  try {
    const id = (request.params.id) && parseInt(request.params.id, 10);
    let name = decodeURI(request.params.nam);
    name = (!name || name.trim() === "") ? "Produkt" : name.trim();
    if (id) {
      const timestamp = renameItem(id, name);
      response.send({ name, timestamp });
    }
  }
  catch (error) { errorHandler(error, 'renameAction', response) }
}

export async function newProductAction(request, response) {
  logger.info("newProductAction: request.params=" + JSON.stringify(request.params));
  try {
    const itemName = (!request.params.nam || request.params.nam.trim() === "") ? "Produkt" : decodeURI(request.params.nam).trim();
    const categoryId = (request.params.catid) && parseInt(request.params.catid, 10);
    const newItemId = createItem(categoryId, itemName);
    logger.info("newProductAction: itemId=" + newItemId);
    const item = getItem(newItemId);

    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/itemHead', { item: item }, function (error, html) {
      if (error) {
        console.logger.info(error);
      } else {
        logger.info("newProductAction: html.length=" + html.length);

        response.send({ html });
      }
    })
  }
  catch (error) { errorHandler(error, 'newProductAction', response) }
}


export async function newCategoryAction(request, response) {
  logger.info("newCategoryAction: request.params=" + JSON.stringify(request.params));
  try {
    const categoryName = (!request.params.nam || request.params.nam.trim() === "") ? "Produkt" : decodeURI(request.params.nam).trim();
    const categoryId = (request.params.id) && parseInt(request.params.id, 10);
    if (categoryId) {
      //TODO  updateCategory(categoryId, categoryName);
      logger.info("newCategoryAction: update id=" + categoryId);
      response.writeHead(200, 'Category "' + categoryId + " successfully updated.", { 'content-type': 'text/html' });
      response.end();
    } else {
      const categoryId = createCategory(categoryName);
      logger.info("newCategoryAction: created id=" + categoryId);
      let data = getCategory(categoryId);
      logger.debug("newCategoryAction: data=" + JSON.stringify(data));
      response.status(201).send(data);
    }
  }
  catch (error) { errorHandler(error, 'newCategoryAction', response) } 
}


export async function deleteProductAction(request, response) {  //TODO
  logger.info("deleteProductAction: request.params=" + JSON.stringify(request.params));
  try {
    const id = (request.params.id) && parseInt(request.params.id, 10);
    deleteItem(id);
    response.writeHead(200, "Änderungen gesichert.", { 'content-type': 'text/html' });
    response.end();
  }
  catch (error) { errorHandler(error, 'deleteProductAction', response) }
}


export async function deleteCategoryAction(request, response) {  //TODO
  logger.info("deleteCategoryAction: request.params=" + JSON.stringify(request.params));
  try {
    const id = (request.params.id) && parseInt(request.params.id, 10);
    deleteCategory(id);
    response.writeHead(200, "Änderungen gesichert.", { 'content-type': 'text/html' });
    response.end();
  }
  catch (error) { errorHandler(error, 'deleteCategoryAction', response) }
}

export function evalAction(request, response) {
  try {
    connectDb();
    let data = getData();
    //logger.info("evalAction: data=" + JSON.stringify(data));

    let changeCount = 0;
    for (let item of data) {
      (item.entry_list) && (evalItem(item)) && changeCount++;
    }
    const msg = "SURE: " + data.length + " Produkte wurden überprüft. " +
      ((changeCount > 1) ? (changeCount + " Produkte haben") : (((changeCount === 1) ? "Ein" : "Kein") + " Produkt hat")) +
      " einen neuen Status erhalten.";
    logger.info(msg);
    pushover(msg, "Hinweis", -1, "pushover");
    response.json({ state: true, msg: msg });
  }
  catch (error) {
    console.error(error);
    const msg = "SURE: Interner Server-Fehler in 'evalAction': " + error.message;
    logger.info(msg, 2);
    pushover(msg, "Warnung", 0, "pushover");
    response.json({ state: false, msg: msg });
  }
}

export async function dbAction(request, response) {
  try {
    //logger.info("dbAction: request.url=" + request.url);
    const result = (request.url === "/unconnectdb") ? unconnectDb() : connectDb();
    response.json(result);
  }
  catch (error) { errorHandler(error, 'dbAction') }
}

async function pushover(msg, title, prio, sound) {
  try {
    if (!PUSHOVER_URL || !PUSHOVER_TOKEN || !PUSHOVER_USER) {
      logger.info("pushover: No pushover url or no credentials supplied.", 0)
      return;
    }
    const headers = { "Content-Type": "application/json" };
    const body = JSON.stringify({
      token: PUSHOVER_TOKEN,
      user: PUSHOVER_USER,
      title: title,
      priority: prio,
      sound: sound,
      message: msg,
    });
    const response = await fetch(PUSHOVER_URL, {
      method: "POST", headers, body
    });
    if (!response.ok) {
      throw new Error("Sending Pushover message failed: " + response.status, 2);
    }
    const data = await response.json();
    logger.info("Pushover message successfully sent: " + JSON.stringify(data), 0);
  } catch (error) { console(error) }
}

export async function healthAction(request, response) {
  logger.info("healthAction");
  try {
    const count = getData().length;
    response.json({ healthy: true, count });
  }
  catch (error) {
    errorHandler(error, 'healthAction');
    response.json({ healthy: false, error: error.message });
  }
}

function errorHandler(error, actionName, response) {
  const message = "Cassis: Interner Server-Fehler in '" + actionName + "': " + error.message;
  logger.error(message);
  if (response) {
    response.writeHead(500, message, { 'content-type': 'text/html' });
    response.end();
  }
}
