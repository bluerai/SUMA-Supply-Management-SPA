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
    id   INTEGER   PRIMARY KEY ON CONFLICT ROLLBACK AUTOINCREMENT UNIQUE NOT NULL,
    name TEXT (16) NOT NULL UNIQUE,
    prio INTEGER   DEFAULT (0) 
);
CREATE TABLE IF NOT EXISTS product (
    id          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
    category_id INTEGER REFERENCES category (id) ON DELETE RESTRICT,
    name        TEXT    NOT NULL,
    notes       TEXT,
    sum         INTEGER,
    color       TEXT,
    entry_list  TEXT,
    moddate     INTEGER DEFAULT (strftime('%s') ),
    pre_alert   INTEGER NOT NULL DEFAULT (30),
    state       INTEGER DEFAULT (100) 
);
CREATE TRIGGER IF NOT EXISTS update_moddate
         AFTER UPDATE
            ON product
          WHEN OLD.name IS NOT NEW.name OR
               OLD.pre_alert IS NOT NEW.pre_alert OR
               OLD.notes IS NOT NEW.notes OR
               OLD.entry_list IS NOT NEW.entry_list OR
               OLD.category_id IS NOT NEW.category_id
BEGIN
    UPDATE product
       SET moddate = strftime('%s') 
     WHERE id = OLD.id;
END;
    `);
    logger.info(`A new SUMA database was successfully created and opened at "${databasefile}".`);
  }
});

/* 
PRAGMA foreign_keys = 0;

CREATE TABLE sqlitestudio_temp_table AS SELECT *
  FROM category;

DROP TABLE category;

CREATE TABLE category(
    id   INTEGER   PRIMARY KEY ON CONFLICT ROLLBACK AUTOINCREMENT
                   UNIQUE
                   NOT NULL,
    name TEXT(16) NOT NULL
                   UNIQUE,
    prio INTEGER   DEFAULT(0),
    auto INTEGER
  );

INSERT INTO category(
    id,
    name,
    prio
  )
                     SELECT id,
  name,
  prio
                       FROM sqlitestudio_temp_table;

DROP TABLE sqlitestudio_temp_table;

PRAGMA foreign_keys = 1;

 */
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
  const selectAllCategoriesStmt = database.prepare(`SELECT id, name, prio FROM category ORDER BY prio DESC, LOWER(name) ASC`);
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

  const sqlStmt = (category.prio == 2) ?
    `SELECT id, name, sum, color, state, entry_list FROM product WHERE state IS NOT NULL ORDER BY state ASC LIMIT 10` :
    `SELECT id, name, sum, color, state, entry_list FROM product WHERE category_id = ${categoryId} ORDER BY LOWER(name) ASC`;

  const selectProductsStmt = database.prepare(sqlStmt);

  let products = selectProductsStmt.all().map(product => ({
    ...product,
    entry_list: JSON.parse(product.entry_list),
    next_date: getNextDate(JSON.parse(product.entry_list))
  }));

  if (!prodsort || prodsort === 'relevance') {
    products.sort((a, b) =>
      (a.state ?? 999) - (b.state ?? 999) ||
      expDate(a.entry_list[0]).localeCompare(expDate(b.entry_list[0]))
    );

  } else if (prodsort === 'date') {
    products.sort((prod1, prod2) => { return expDate(prod1.entry_list[0]).localeCompare(expDate(prod2.entry_list[0])); });
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

const expDate = (entry) => (!entry || !entry.year || !entry.month) ? "9999/99" : `${entry.year}/${entry.month}/${entry.day}`;

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

export const toggleCategoryStar = (categoryId, prioToggle) => {
  const countProductsStmt = database.prepare(`SELECT count(*) as count FROM product WHERE category_id = ${categoryId}`);
  const productCount = countProductsStmt.get();
  prioToggle = (productCount.count > 0) ? 2 : 3;

  const toggleStmt = database.prepare(`UPDATE category SET prio = (prio + 1) % ${prioToggle} WHERE id = ?;`);
  const { changes } = toggleStmt.run(categoryId);
  logger.debug(`toggleCategoryStar: category ${categoryId} toggled - rows changed=${changes}`);
  return { category: oneCategory(categoryId) };
};

export const createProduct = (categoryId, itemName, preAlert, notes) => {
  const insertStmt = database.prepare(`INSERT INTO product (name, category_id, entry_list, pre_alert, notes) VALUES (?, ?, ?, ?, ?)`);
  const { lastInsertRowid } = insertStmt.run(itemName, categoryId, "[]", preAlert, notes);
  logger.debug(`createProduct: item ${lastInsertRowid} created`);
  return lastInsertRowid;
};


export const getProduct = (id) => {
  const selectByIdStmt = database.prepare(`SELECT id, name, sum, color, state, entry_list, pre_alert, notes, datetime(moddate,'unixepoch','localtime') as timestamp FROM product WHERE id=?`);
  const item = selectByIdStmt.get(id);
  item.entry_list = JSON.parse(item.entry_list);
  item.entry_list = item.entry_list || [];
  if (item.entry_list.length > 0) {
    const entry = item.entry_list[0];
    item.next_date = ((isNaN(entry.day)) ? "" : entry.day + ".") + entry.month + "." + entry.year;
  }
  return item;
};

export const getAllProducts = () => {
  const selectAllStmt = database.prepare(`SELECT id, name, sum, color, state,entry_list, pre_alert, notes, datetime(moddate,'unixepoch','localtime') as timestamp FROM product ORDER BY LOWER(name) ASC`);
  const data = selectAllStmt.all().map(item => ({
    ...item,
    entry_list: item.entry_list ? JSON.parse(item.entry_list) : [],
    next_date: getNextDate(JSON.parse(item.entry_list))
  }));
  logger.debug(`getAllProducts: data.length=${data.length}`);
  return data;
};

export const updateProduct = (id, name, pre_alert, notes) => {
  const updateStmt = database.prepare(`UPDATE product SET name = ?, pre_alert = ?, notes = ? WHERE id = ?`);
  const { changes } = updateStmt.run(name, pre_alert, notes, id);
  logger.debug(`updateProduct: item ${id} updated - rows changed=${changes}`);

  const item = evalProduct(getProduct(id));
  const selectByIdStmt = database.prepare(`SELECT datetime(moddate,'unixepoch','localtime') as timestamp FROM product WHERE id=?`);
  item.timestamp = selectByIdStmt.get(id).timestamp;

  return item
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

  const selectByIdStmt = database.prepare(`SELECT id, name, sum, color, state, entry_list, pre_alert, notes, datetime(moddate,'unixepoch','localtime') as timestamp FROM product WHERE id=?`);
  const item = selectByIdStmt.get(data.id);
  item.entry_list = JSON.parse(item.entry_list);
  logger.silly(`updateEntry: selected item=${JSON.stringify(item)}`);

  const index = item.entry_list.findIndex(e =>
    e.year === data.year &&
    e.month === data.month &&
    (e.day === data.day || (isNaN(e.day) && isNaN(data.day)))
  );

  const entry = item.entry_list[index];

  if (entry) {
    entry.count = parseInt(entry.count) + parseInt(data.count);
    if (entry.count < 0) return null;
    if (entry.count === 0) item.entry_list.splice(index, 1);
  } else {
    if (data.count > 0) {
      item.entry_list.push({ year: `${data.year}`, month: `${data.month}`, day: `${data.day}`, count: `${data.count}` });
      item.entry_list.sort((a, b) => parseInt(a.year) - parseInt(b.year) || parseInt(a.month) - parseInt(b.month) || parseInt(a.day) - parseInt(b.day));
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
  const old_state = item.state

  const minDays = 5 * item.pre_alert;
  item.days_left = minDays;

  item.state = null;
  item.color = 'lightgrey';

  if (item.entry_list && item.entry_list.length > 0) {
    item.entry_list.forEach(entry => {
      const curDate = new Date(); curDate.setHours(0, 0, 0, 0);
      const mhdDate = new Date(entry.year, entry.month - 1, (isNaN(entry.day) ? 1 : entry.day), 0, 0, 0, 0);

      entry.days_left = Math.max(0, Math.ceil((mhdDate.getTime() - curDate.getTime()) / oneDay));

      item.days_left = Math.min(item.days_left, entry.days_left);
      if (entry.days_left === item.pre_alert) {
        push.warn(`Das Mindesthaltbarkeitsdatum für ${item.sum} Einheit(en) des Produkts "${item.name}" wird in ${entry.color} Tagen überschritten!`, "SUMA evaluate");
      }
    });

    item.state = Math.ceil(item.days_left / minDays * 100)
    item.color = stateToColor(item.state);
  }

  if (item.state !== old_state) {
    const updateStmt = database.prepare(`UPDATE product SET color = ?, state = ? WHERE id = ?`);
    const { changes } = updateStmt.run(item.color, item.state, item.id);
    logger.silly(`evalProduct: tate + color saved - rows changed=${changes}`);
  }

  item.next_date = getNextDate(item.entry_list);

  return item;
};

const stateToColor = (state) => { //state = 0..100
  let r, g, b = 0;

  if (state <= 40) {
    r = 230;
    g = Math.round((state / 40) * 230);
  } else {
    r = Math.round(230 - ((state - 40) / 60) * 230);
    g = 230;
  }
  return `rgb(${r},${g},${b})`;
};

const getNextDate = (entry_list) => {
  if (entry_list && entry_list.length > 0) {
    const entry = entry_list[0];
    return ((isNaN(entry.day)) ? "" : entry.day + ".") + entry.month + "." + entry.year;
  }
  return "";
}