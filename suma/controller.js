import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../log.js';
import { push } from '../push_message.js';

import {
  getCategory, getProduct, getAllProducts, allCategories,
  createCategory, renameCategory, deleteCategory, toggleCategoryStar,
  createProduct, renameProduct, deleteProduct,
  updateEntry, evalProduct, connectDb, unconnectDb
} from './model.js';


export async function startAction(request, response) {
  logger.info("startAction: request.url=" + JSON.stringify(request.url));
  try {
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/start')
  }
  catch (error) { errorHandler(error, 'startAction', response) }
}

export async function getCategoryListAction(request, response) {
  logger.info("getCategoryListAction: request.params=" + JSON.stringify(request.params));
  try {
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/category_list', { allCategories: allCategories() }, function (error, html) {
      if (error) { logger.error(error); logger.debug(error.stack); return }
      logger.debug("Category_list: html.length=" + html.length);
      response.status(200).send({ category: response.locals.category, html: html });
    })
  }
  catch (error) { errorHandler(error, 'renameCategoryAction', response) }
}

export async function getCategoryAction(request, response) {
  logger.info("getCategoryAction: request.params=" + JSON.stringify(request.params));
  try {
    const categoryId = (request.params.id) && parseInt(request.params.id, 10);
    const data = getCategory(categoryId);

    logger.info("getCategoryAction: categoryId=" + data.category.id);
    logger.debug("getCategoryAction: data=" + JSON.stringify(data));
    
    response.locals.categoryId = data.category.id;
    response.locals.products = data.products;
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/category_head', data.category, function (error, html) {
      if (error) { logger.error(error); logger.debug(error.stack); return }
      logger.debug("Category_list: html.length=" + html.length);
      response.status(200).send({ html: html, products: response.locals.products, categoryId: response.locals.categoryId });
    })
  }
  catch (error) { errorHandler(error, 'getCategoryAction', response) }

}

export async function getHeadAction(request, response) {
  logger.info("getHeadAction: request.params=" + JSON.stringify(request.params));
  try {
    const itemId = (request.params.id) && parseInt(request.params.id, 10) || 0;
    let item = getProduct(itemId);
    logger.debug("getHeadAction: item=" + JSON.stringify(item));
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/product_head', { item: item }, function (error, html) {
      if (error) {
        logger.info(error);
      } else {
        logger.debug("getHeadAction: html.length=" + html.length);
        logger.silly("getHeadAction: html=" + html);
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
    let item = getProduct(curItemId);
    logger.debug("getDetailsAction: item=" + JSON.stringify(item));
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/product_details', { item: item }, function (error, html) {
      if (error) {
        errorHandler(error, 'getDetailsAction', response)
      } else {
        logger.debug("getDetailsAction: html.length=" + html.length);
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
      updateEntry(data.id, data.year, data.month, data.count);
      const item = getProduct(data.id)

      if (item) {
        response.locals.sum = item.sum;
        response.render(dirname(fileURLToPath(import.meta.url)) + '/views/product_details', { item: item }, function (error, html) {
          if (error) {
            errorHandler(error, 'updateAction render', response)
          } else {
            //logger.info("updateAction: html.length=" + html.length);
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

export async function renameCategoryAction(request, response) {
  logger.info("renameCategoryAction: request.params=" + JSON.stringify(request.params));
  try {
    const categoryName = (!request.params.nam || request.params.nam.trim() === "") ? "Produkt" : decodeURI(request.params.nam).trim();
    const categoryId = (request.params.id) && parseInt(request.params.id, 10);
    const data = renameCategory(categoryId, categoryName);

    logger.info("renameCategoryAction: id=" + data.category.id);
    logger.debug("renameCategoryAction: data=" + JSON.stringify(data));
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/category_head', data.category, function (error, html) {
      if (error) { logger.error(error); logger.debug(error.stack); return }
      logger.debug("Category_list: html=" + html);
      logger.debug("Category_head: html.length=" + html.length);
      response.status(200).send({ html: html });
    })
  }
  catch (error) { errorHandler(error, 'renameCategoryAction', response) }
}

export async function createCategoryAction(request, response) {
  logger.info("createCategoryAction: request.params=" + JSON.stringify(request.params));
  try {
    const categoryName = (!request.params.nam || request.params.nam.trim() === "") ? "Produkt" : decodeURI(request.params.nam).trim();
    const data = createCategory(categoryName);

    logger.info("createCategoryAction: categoryId=" + data.category.id);
    logger.debug("createCategoryAction: data=" + JSON.stringify(data));

    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/category_head', data.category, function (error, html) {
      if (error) { logger.error(error); logger.debug(error.stack); return }
      logger.debug("Category_list: html.length=" + html.length);
      response.status(200).send({ html: html });
    })
  }
  catch (error) { errorHandler(error, 'createCategoryAction', response) }
}

export async function deleteCategoryAction(request, response) {  //TODO
  logger.info("deleteCategoryAction: request.params=" + JSON.stringify(request.params));
  try {
    const id = (request.params.id) && parseInt(request.params.id, 10);
    deleteCategory(id);

    const data = getCategory();

    if (!data) { response.status(200).send({ html: "", products: [] }); return; }

    logger.info("deleteCategoryAction: categoryId=" + data.category.id);
    logger.debug("deleteCategoryAction: data=" + JSON.stringify(data));
    response.locals.products = data.products;
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/category_head', data.category, function (error, html) {
      if (error) { logger.error(error); logger.debug(error.stack); return }
      logger.debug("Category_list: html.length=" + html.length);
      response.status(200).send({ html: html, products: response.locals.products });

    })
  }
  catch (error) { errorHandler(error, 'deleteCategoryAction', response) }
}

export async function toggleCategoryStarAction(request, response) {
  logger.info("toggleCategoryStarAction" + JSON.stringify(request.params));
  try {
    const categoryId = parseInt(request.params.id);
    let data = toggleCategoryStar(categoryId);

    logger.info("toggleCategoryStarAction: id=" + data.category.id);
    logger.debug("toggleCategoryStarAction: data=" + JSON.stringify(data));
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/category_head', data.category, function (error, html) {
      if (error) { logger.error(error); logger.debug(error.stack); return }
      logger.debug("Category_head: html.length=" + html.length);
      response.status(200).send({ html: html });
    })
  }
  catch (error) { errorHandler(error, 'toggleCategoryStarAction', response) }
}

export async function renameProductAction(request, response) {
  logger.info("renameAction: request.params=" + JSON.stringify(request.params));
  try {
    const id = (request.params.id) && parseInt(request.params.id, 10);
    let name = decodeURI(request.params.nam);
    name = (!name || name.trim() === "") ? "Produkt" : name.trim();
    if (id) {
      const timestamp = renameProduct(id, name);
      response.send({ name, timestamp });
    }
  }
  catch (error) { errorHandler(error, 'renameAction', response) }
}

export async function createProductAction(request, response) {
  logger.info("createProductAction: request.params=" + JSON.stringify(request.params));
  try {
    const itemName = (!request.params.nam || request.params.nam.trim() === "") ? "Produkt" : decodeURI(request.params.nam).trim();
    const categoryId = (request.params.catid) && parseInt(request.params.catid, 10);
    const newItemId = createProduct(categoryId, itemName);

    logger.info("createProductAction: id=" + newItemId);
    const item = getProduct(newItemId);
    response.render(dirname(fileURLToPath(import.meta.url)) + '/views/product_head', { item: item }, function (error, html) {
      response.send({ html });
    });
  }
  catch (error) { errorHandler(error, 'productAction', response) }
}

export async function deleteProductAction(request, response) {
  logger.info("deleteProductAction: request.params=" + JSON.stringify(request.params));
  try {
    const id = (request.params.id) && parseInt(request.params.id, 10);
    deleteProduct(id);
    response.writeHead(200, "Änderungen gesichert.", { 'content-type': 'text/html' });
    response.end();
  }
  catch (error) { errorHandler(error, 'deleteProductAction', response) }
}

export function evalAction(request, response) {
  try {
    connectDb();
    let data = getAllProducts();
    let changeCount = 0;
    for (let item of data) {
      (item.entry_list) && (evalProduct(item)) && changeCount++;
    }
    const msg = "SUMA: " + data.length + " Produkte wurden überprüft. " +
      ((changeCount > 1) ? (changeCount + " Produkte haben") : (((changeCount === 1) ? "Ein" : "Kein") + " Produkt hat")) +
      " einen neuen Status erhalten.";
    logger.info(msg);
    push.info(msg);
    response.json({ state: true, msg: msg });
  }
  catch (error) {
    const msg = "SUMA: Interner Fehler in 'evalAction': " + error.message;
    logger.error(msg);
    logger.debug(getSystemErrorMap.stack);
    push.error(msg);
    response.json({ state: false, msg: msg });
  }
}

export async function dbAction(request, response) {
  try {
    const result = (request.url === "/unconnectdb") ? unconnectDb() : connectDb();
    logger.debug(result);
    response.json(result);
  }
  catch (error) { errorHandler(error, 'dbAction') }
}

export async function healthAction(request, response) {
  logger.debug("healthAction");
  try {
    const count = getAllProducts().length;
    response.json({ healthy: true, count });
  }
  catch (error) {
    errorHandler(error, 'healthAction');
    response.json({ healthy: false, error: error.message });
  }
}

function errorHandler(error, actionName, response) {
  const message = "SUMA: Interner Fehler in '" + actionName + "': " + error.message;
  logger.error(message);
  logger.debug(error.stack);
  if (response) {
    response.writeHead(500, message, { 'content-type': 'text/html' });
    response.end();
  }
}
