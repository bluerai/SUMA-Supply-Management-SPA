'use strict';

import { DatabaseSync } from 'node:sqlite';
import fs from 'fs-extra';
import { logger } from '../modules/log.js';
import { push } from '../modules/pushover.js';

const databasefile = process.env.SUMA_DB;
let database;

fs.pathExists(databasefile, (err, exists) => {
  database = new DatabaseSync(databasefile, { open: true });
  if (exists) {
    if (!database) {
      logger.info(`Could not connect to SUMA database at "${databasefile}".`);
      process.exit(1);
    } else {
      logger.info(`Connected to SUMA database at "${databasefile}".`);
    }
  } else {
    database.exec(`
      CREATE TABLE IF NOT EXISTS category (
        id   INTEGER PRIMARY KEY ON CONFLICT ROLLBACK AUTOINCREMENT UNIQUE NOT NULL,
        name TEXT (16) NOT NULL UNIQUE,
        prio INTEGER DEFAULT (0) 
      );
      CREATE TABLE IF NOT EXISTS product (
        id          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
        category_id INTEGER REFERENCES category (id) ON DELETE RESTRICT,
        name        TEXT    NOT NULL,
        notes       TEXT,
        sum         INTEGER,
        state       TEXT,
        entry_list  TEXT,
        moddate     INTEGER DEFAULT (strftime('%s')) 
      );
    `);
    logger.info(`A new SUMA database was successfully created and opened at "${databasefile}".`);
  }
});

export function connectDb() {
  try {
    database.open();
    return { state: "open", msg: "SUMA connectDb: DB opened" };
  } catch (error) {
    return { state: "error", msg: `SUMA connectDb: ${error}` };
  }
}

export function unconnectDb() {
  try {
    database.close();
    return { state: "closed", msg: "SUMA unconnectDb: DB closed" };
  } catch (error) {
    return { state: "error", msg: `SUMA unconnectDb: ${error}` };
  }
}

const oneDay = 24 * 60 * 60 * 1000;

const oneCategory = (id) => {
  const getCategoryStmt = database.prepare(`SELECT id, name, prio FROM category WHERE id = ?`);
  return getCategoryStmt.get(id);
};

export const allCategories = () => {
  const selectAllCategoriesStmt = database.prepare(`SELECT id, name, prio FROM category ORDER BY prio DESC, name ASC`);
  return selectAllCategoriesStmt.all();
};

export const getCategory = (categoryId, prodsort) => {
  const categories = allCategories();

  if (categories.length === 0) {
    const result = createCategory('SUMA');
    result.products = [];
    return result;
  }

  categoryId = categoryId || categories[0].id;
  const category = oneCategory(categoryId);
  logger.debug(`getCategory: category=${JSON.stringify(category)}`);

  const selectProductsStmt = database.prepare(`SELECT id, name, sum, state, entry_list FROM product WHERE category_id = ? ORDER BY name ASC`);

  const products = selectProductsStmt.all(categoryId).map(product => ({
    ...product,
    entry_list: JSON.parse(product.entry_list)
  }));

  if (!prodsort || prodsort === 'date') {
    products.sort((prod1, prod2) => {
      const date1 = expDate(prod1.entry_list[0]);
      const date2 = expDate(prod2.entry_list[0]);
      return date1.localeCompare(date2);
    });
  }

  return { category, products };
};

export const getNextCategory = (categoryId) => {
  const categories = allCategories();
  const num = categories.findIndex(category => category.id === categoryId) + 1;
  return num < categories.length ? getCategory(categories[num].id) : null;
};

export const getPrevCategory = (categoryId) => {
  const categories = allCategories();
  const num = categories.findIndex(category => category.id === categoryId) - 1;
  return num >= 0 ? getCategory(categories[num].id) : null;
};

const expDate = (entry) => (!entry || !entry.year || !entry.month) ? "9999/99" : `${entry.year}/${entry.month}`;

export const createCategory = (itemName) => {
  const insertStmt = database.prepare(`INSERT INTO category (name) VALUES (?)`);
  const { lastInsertRowid } = insertStmt.run(itemName);
  logger.debug(`createCategory: category ${lastInsertRowid} created`);
  return { category: oneCategory(lastInsertRowid) };
};

export const renameCategory = (id, name) => {
  const updateNameStmt = database.prepare(`UPDATE category SET name = ? WHERE id = ?`);
  const { changes } = updateNameStmt.run(name, id);
  logger.debug(`renameCategory: item renamed - rows changed=${changes}`);
  return { category: oneCategory(id) };
};

export const deleteCategory = (id) => {
  const deleteStmt = database.prepare(`DELETE FROM category WHERE id = ?`);
  const { changes } = deleteStmt.run(id);
  logger.debug(`deleteCategory: category ${id} deleted - rows deleted=${changes}`);
};

export const toggleCategoryStar = (categoryId) => {
  const toggleStmt = database.prepare(`UPDATE category SET prio = CASE WHEN prio = 0 THEN 1 ELSE 0 END WHERE id = ?`);
  const { changes } = toggleStmt.run(categoryId);
  logger.debug(`toggleCategoryStar: category ${categoryId} toggled - rows changed=${changes}`);
  return { category: oneCategory(categoryId) };
};

export const createProduct = (categoryId, itemName) => {
  const insertStmt = database.prepare(`INSERT INTO product (name, category_id, entry_list) VALUES (?, ?, ?)`);
  const { lastInsertRowid } = insertStmt.run(itemName, categoryId, "[]");
  logger.debug(`createProduct: item ${lastInsertRowid} created`);
  return lastInsertRowid;
};

export const getProduct = (id) => {
  const selectByIdStmt = database.prepare(`SELECT id, name, sum, state, entry_list, datetime(moddate,'unixepoch','localtime') as timestamp FROM product WHERE id=?`);
  const item = selectByIdStmt.get(id);
  item.entry_list = JSON.parse(item.entry_list);
  return item;
};

export const getAllProducts = () => {
  const selectAllStmt = database.prepare(`SELECT id, name, sum, state, entry_list, datetime(moddate,'unixepoch','localtime') as timestamp FROM product ORDER BY name ASC`);
  const data = selectAllStmt.all().map(item => ({
    ...item,
    entry_list: item.entry_list ? JSON.parse(item.entry_list) : []
  }));
  logger.debug(`getAllProducts: data.length=${data.length}`);
  return data;
};

export const renameProduct = (id, name) => {
  const updateNameStmt = database.prepare(`UPDATE product SET name = ? WHERE id = ?`);
  const { changes } = updateNameStmt.run(name, id);
  logger.debug(`renameProduct: item ${id} renamed - rows changed=${changes}`);

  const selectByIdStmt = database.prepare(`SELECT datetime(moddate,'unixepoch','localtime') as timestamp FROM product WHERE id=?`);
  return selectByIdStmt.get(id).timestamp;
};

export const moveProductToCategory = (prodId, catId) => {
  const updateStmt = database.prepare(`UPDATE product SET category_id = ? WHERE id = ? AND EXISTS (SELECT 1 FROM category WHERE id = ?)`);
  const { changes } = updateStmt.run(catId, prodId, catId);
  logger.debug(`moveProductToCategory: item ${prodId} moved to category ${catId} - rows changed=${changes}`);
  return changes ? getCategory(catId) : null;
};

export const deleteProduct = (id) => {
  const deleteStmt = database.prepare(`DELETE FROM product WHERE id = ?`);
  const { changes } = deleteStmt.run(id);
  logger.debug(`deleteProduct: item ${id} deleted - rows deleted=${changes}`);
};

export const updateEntry = (data) => {
  logger.debug(`updateEntry: data=${JSON.stringify(data)}`);

  const selectByIdStmt = database.prepare(`SELECT id, name, sum, state, entry_list, datetime(moddate,'unixepoch','localtime') as timestamp FROM product WHERE id=?`);
  const item = selectByIdStmt.get(data.id);
  item.entry_list = JSON.parse(item.entry_list);
  logger.debug(`updateEntry: selected item=${JSON.stringify(item)}`);

  const index = item.entry_list.findIndex(e => e.year === data.year && e.month === data.month);
  const entry = item.entry_list[index];

  if (entry) {
    entry.count = parseInt(entry.count) + parseInt(data.count);
    if (entry.count < 0) return null;
    if (entry.count === 0) item.entry_list.splice(index, 1);
  } else {
    if (data.count > 0) {
      item.entry_list.push({ year: `${data.year}`, month: `${data.month}`, count: `${data.count}` });
      item.entry_list.sort((a, b) => parseInt(a.year) - parseInt(b.year) || parseInt(a.month) - parseInt(b.month));
    } else {
      return null;
    }
  }

  item.sum = item.entry_list.reduce((sum, entry) => sum + parseInt(entry.count), 0);

  const updateStmt = database.prepare(`UPDATE product SET sum = ?, entry_list = ? WHERE id = ?`);
  const { changes } = updateStmt.run(item.sum, JSON.stringify(item.entry_list), item.id);
  logger.debug(`updateEntry: item sum, item entry_list saved - rows changed=${changes}`);

  return evalProduct(item);
};

export const evalProduct = (item) => {
  let minDays = 150;
  item.entry_list.forEach(entry => {
    const curDate = new Date(); curDate.setHours(0, 0, 0, 0);
    const mhdDate = new Date(entry.year, entry.month - 1, 1, 0, 0, 0, 0);

    entry.state = Math.ceil((mhdDate.getTime() - curDate.getTime()) / oneDay);

    minDays = Math.min(minDays, entry.state);
    if (entry.state === 30) {
      push.warn(`Das Mindesthaltbarkeitsdatum für ${item.sum} Einheit(en) des Produkts "${item.name}" wird in ${entry.state} Tagen überschritten!`, "SUMA evaluate");
    }
  });
  item.state = wertZuFarbe(minDays / 1.5);
  logger.silly(`evalProduct: item.id=${item.id}, item.state=${item.state}`);

  const updateStmt = database.prepare(`UPDATE product SET state = ? WHERE id = ?`);
  const { changes } = updateStmt.run(item.state, item.id);
  logger.silly(`evalProduct: item state saved - rows changed=${changes}`);

  return item;
};

const wertZuFarbe = (wert) => {
  wert = Math.max(0, Math.min(100, wert));
  let r, g, b = 0;

  if (wert <= 40) {
    r = 230;
    g = Math.round((wert / 40) * 230);
  } else {
    r = Math.round(230 - ((wert - 40) / 60) * 230);
    g = 230;
  }
  return `rgb(${r},${g},${b})`;
};