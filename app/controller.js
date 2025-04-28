'use strict';

import pug from 'pug';
import { logger } from '../modules/log.js';
import packagejson from '../package.json' with { type: 'json' };

import {
  getCategory, getNextCategory, getPrevCategory, getProduct, allCategories,
  createCategory, renameCategory, deleteCategory, toggleCategoryStar,
  createProduct, renameProduct, moveProductToCategory, deleteProduct,
  updateEntry
} from './model.js';

const appInfo = {
  version: packagejson.name.toUpperCase() + ", Version " + packagejson.version,
  author: packagejson.license + " - " + packagejson.author
};

logger.info(appInfo.version + " - " + appInfo.author);

// Helper functions ==========================================================
const responseCategory = (response, data) => {
  if (!data) return response.status(204).json({});
  logger.debug("getCategoryAction: data=" + JSON.stringify(data));
  response.locals.categoryId = data.category.id;

  //response.locals.products_html = pug.renderFile(import.meta.dirname + '/views/all_product_heads.pug', { products: data.products });

  response.render(import.meta.dirname + '/views/page', data, (error, html) => {
    if (error) {
      logger.error(error);
      logger.debug(error.stack);
      return;
    }
    logger.debug("Category_list: html.length=" + html.length);
    response.status(200).json({ categoryId: response.locals.categoryId, html: html, appInfo });
  });
};

const errorHandler = (error, actionName, response) => {
  const message = "SUMA: Fehler in '" + actionName + "': " + error.message;
  logger.error(message);
  if (error.stack) logger.debug(error.stack);
  if (response) {
    response.status(500).json({ message: message });
  }
};

const renderView = (response, viewPath, data, callback) => {
  response.render(viewPath, data, (error, html) => {
    if (error) {
      errorHandler(error, 'renderView', response);
    } else {
      callback(html);
    }
  });
};

// Actions ===================================================================
export async function startAction(request, response) {
  try {
    logger.info("startAction: request.url=" + request.url.substr(0, 32));
    response.render(import.meta.dirname + '/views/start');
  } catch (error) {
    errorHandler(error, 'startAction', response);
  }
}

export async function getCategoryAction(request, response) {
  try {
    logger.debug("getCategoryAction: request.url=" + request.url.substr(0, 32));
    const data = getCategory((request.params.id) && parseInt(request.params.id, 10));
    responseCategory(response, data);
  } catch (error) {
    errorHandler(error, 'getCategoryAction', response);
  }
}

export async function getNextCategoryAction(request, response) {
  try {
    logger.debug("getNextCategoryAction: request.url=" + request.url.substr(0, 32));
    const data = getNextCategory((request.params.id) && parseInt(request.params.id, 10));
    responseCategory(response, data);
  } catch (error) {
    errorHandler(error, 'getNextCategoryAction', response);
  }
}

export async function getPrevCategoryAction(request, response) {
  try {
    logger.debug("getPrevCategoryAction: request.url=" + request.url.substr(0, 32));
    const data = getPrevCategory((request.params.id) && parseInt(request.params.id, 10));
    responseCategory(response, data);
  } catch (error) {
    errorHandler(error, 'getPrevCategoryAction', response);
  }
}

export async function getCategoryListAction(request, response) {
  try {
    logger.debug("getCategoryListAction: request.url=" + request.url.substr(0, 32));
    const func = request.params.func;
    renderView(response, import.meta.dirname + '/views/category_list', { allCategories: allCategories(), func: func }, (html) => {
      logger.debug("Category_list: html.length=" + html.length);
      response.status(200).json({ category: response.locals.category, html: html });
    });
  } catch (error) {
    errorHandler(error, 'getCategoryListAction', response);
  }
}

export async function getAllHeadsAction(request, response) {
  try {
    logger.debug("getAllHeadsAction: request.url=" + request.url.substr(0, 32));
    const categoryId = (request.params.id) && parseInt(request.params.id, 10) || 0;
    const prodsort = request.params.sort.trim() || 'date';
    const category = getCategory(categoryId, prodsort);
    logger.silly("getAllHeadsAction: category=" + JSON.stringify(category));

    renderView(response, import.meta.dirname + '/views/all_product_heads', { products: category.products }, (html) => {
      logger.debug("getAllHeadsAction: html.length=" + html.length);
      logger.silly("getAllHeadsAction: html=" + html);
      response.json({ html });
    });
  } catch (error) {
    errorHandler(error, 'getAllHeadsAction', response);
  }
}

export async function getDetailsAction(request, response) {
  try {
    logger.debug("getDetailsAction: request.params=" + request.url.substr(0, 32));
    const curItemId = (request.params.id) && parseInt(request.params.id, 10) || 0;
    const item = getProduct(curItemId);
    logger.silly("getDetailsAction: item=" + JSON.stringify(item));

    renderView(response, import.meta.dirname + '/views/product_details', { item: item }, (html) => {
      logger.debug("getDetailsAction: html.length=" + html.length);
      response.json({ html });
    });
  } catch (error) {
    errorHandler(error, 'getDetailsAction', response);
  }
}

export async function updateAction(request, response) {
  try {
    const data = request.body;
    const item = updateEntry(data);
    logger.silly("updateAction: item=" + JSON.stringify(item));

    if (item) {
      response.locals.item = item;
      renderView(response, import.meta.dirname + '/views/product_details', { item: item }, (html) => {
        response.json({ product: response.locals.item, html: html });
      });
    } else {
      response.status(400).json({ message: "Unzulässige Eingabe" });
    }
  } catch (error) {
    errorHandler(error, 'updateAction', response);
  }
}

export async function renameCategoryAction(request, response) {
  try {
    logger.debug("renameCategoryAction: request.params=" + request.url.substr(0, 32));

    const categoryName = (!request.params.nam) ? "Produkt" : request.params.nam.trim();
    const categoryId = (request.params.id) && parseInt(request.params.id, 10);
    const data = renameCategory(categoryId, categoryName);

    logger.debug("renameCategoryAction: id=" + data.category.id);
    logger.silly("renameCategoryAction: data=" + JSON.stringify(data));
    renderView(response, import.meta.dirname + '/views/category_head', data.category, (html) => {
      logger.debug("Category_head: html.length=" + html.length);
      response.status(200).json({ html });
    });
  } catch (error) {
    errorHandler(error, 'renameCategoryAction', response);
  }
}

export async function createCategoryAction(request, response) {
  try {
    logger.debug("createCategoryAction: request.params=" + request.url.substr(0, 32));
    const categoryName = (!request.params.nam) ? "Produkt" : request.params.nam.trim();
    const data = createCategory(categoryName);

    logger.debug("createCategoryAction: categoryId=" + data.category.id);
    logger.silly("createCategoryAction: data=" + JSON.stringify(data));
    response.locals.categoryId = data.category.id;
    renderView(response, import.meta.dirname + '/views/category_head', data.category, (html) => {
      logger.debug("Category_list: html.length=" + html.length);
      response.status(200).json({ categoryId: response.locals.categoryId, html: html });
    });
  } catch (error) {
    errorHandler(error, 'createCategoryAction', response);
  }
}

export async function deleteCategoryAction(request, response) {
  try {
    logger.info("deleteCategoryAction");
    logger.debug("deleteCategoryAction: request.params=" + request.url.substr(0, 32));
    const id = (request.params.id) && parseInt(request.params.id, 10);
    deleteCategory(id);

    const data = getCategory();
    responseCategory(response, data);

  } catch (error) {
    errorHandler(error, 'deleteCategoryAction', response);
  }
}

export async function toggleCategoryStarAction(request, response) {
  try {
    logger.info("toggleCategoryStarAction");
    logger.debug("toggleCategoryStarAction" + request.url.substr(0, 32));
    const categoryId = parseInt(request.params.id);
    const data = toggleCategoryStar(categoryId);

    logger.debug("toggleCategoryStarAction: id=" + data.category.id);
    logger.silly("toggleCategoryStarAction: data=" + JSON.stringify(data));
    renderView(response, import.meta.dirname + '/views/category_head', data.category, (html) => {
      logger.debug("Category_head: html.length=" + html.length);
      response.status(200).json({ html });
    });
  } catch (error) {
    errorHandler(error, 'toggleCategoryStarAction', response);
  }
}

export async function renameProductAction(request, response) {
  try {
    logger.debug("renameAction: request.params=" + request.url.substr(0, 32));
    const id = (request.params.id) && parseInt(request.params.id, 10);
    let name = request.params.nam;
    name = (!name || name.trim() === "") ? "Produkt" : name.trim();
    if (id) {
      const timestamp = renameProduct(id, name);
      response.json({ name, timestamp });
    }
  } catch (error) {
    errorHandler(error, 'renameAction', response);
  }
}

export async function moveProductAction(request, response) {
  try {
    logger.debug("moveProductAction: request.params=" + request.url.substr(0, 32));
    const prodId = (request.params.prodid) && parseInt(request.params.prodid, 10);
    const catId = (request.params.catid) && parseInt(request.params.catid, 10);

    responseCategory(response, moveProductToCategory(prodId, catId));
  } catch (error) {
    errorHandler(error, 'moveProductAction', response);
  }
}

export async function createProductAction(request, response) {
  try {
    logger.debug("createProductAction: request.params=" + request.url.substr(0, 32));
    const itemName = (!request.params.nam) ? "Produkt" : request.params.nam.trim();
    const categoryId = (request.params.catid) && parseInt(request.params.catid, 10);
    const newItemId = createProduct(categoryId, itemName);

    logger.debug("createProductAction: id=" + newItemId);
    const item = getProduct(newItemId);
    renderView(response, import.meta.dirname + '/views/product_head', { item: item }, (html) => {
      response.json({ html });
    });
  } catch (error) {
    errorHandler(error, 'productAction', response);
  }
}

export async function deleteProductAction(request, response) {
  try {
    logger.info("deleteProductAction");
    logger.debug("deleteProductAction: request.params=" + request.url.substr(0, 32));
    const id = (request.params.id) && parseInt(request.params.id, 10);
    deleteProduct(id);
    response.status(200).json({ message: "Änderungen gesichert." });
  } catch (error) {
    errorHandler(error, 'deleteProductAction', response);
  }
}