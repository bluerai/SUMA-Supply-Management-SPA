'use strict'

import { DatabaseSync } from 'node:sqlite';
import fs from 'fs-extra';
import { logger } from '../modules/log.js'
import { push } from '../modules/pushover.js';

const databasefile = process.env.SUMA_DB;
let database;

fs.pathExists(databasefile, (err, exists) => {
  database = new DatabaseSync(databasefile, { open: true });
  if (exists) {
    if (!database) {
      logger.info('Could not connect to SUMA database at "' + databasefile + '".');
      process.exit(1);
    } else {
      logger.info('Connected to SUMA database at "' + databasefile + '".');
    }
  } else {
    database.exec(`CREATE TABLE IF NOT EXISTS category (
    id   INTEGER   PRIMARY KEY ON CONFLICT ROLLBACK AUTOINCREMENT UNIQUE NOT NULL,
    name TEXT (16) NOT NULL UNIQUE,
    prio INTEGER   DEFAULT (0) 
);
`);
    database.exec(`CREATE TABLE IF NOT EXISTS product (
    id          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
    category_id INTEGER REFERENCES category (id) ON DELETE RESTRICT,
    name        TEXT    NOT NULL,
    notes       TEXT,
    sum         INTEGER,
    state       TEXT,
    entry_list  TEXT,
    moddate     INTEGER DEFAULT (strftime('%s') ) 
);
`);
    /* not used:
    DB.exec(`CREATE TABLE IF NOT EXISTS entry (
    id                     PRIMARY KEY,
    product_id INTEGER     REFERENCES product (id) ON DELETE RESTRICT
                           NOT NULL,
    year       INTEGER (4) NOT NULL ON CONFLICT FAIL,
    month      INTEGER (2) NOT NULL ON CONFLICT FAIL,
    count      INTEGER     NOT NULL,
    moddate    INTEGER     DEFAULT (strftime('%s') ) 
);
`); */
    logger.info('A new SUMA database was successfully created and opened at "' + databasefile + '".');
  }
})

export function connectDb() {  // open database 
  try {
    database.open();
    return { state: "open", msg: "SUMA connectDb: DB opened" };
  } catch (error) {
    return { state: "error", msg: "SUMA connectDb: " + error };
  }
}

export function unconnectDb() {  // close database 
  try {
    database.close();
    return { state: "closed", msg: "SUMA unconnectDb: DB closed" };
  } catch (error) {
    return { state: "error", msg: "SUMA unconnectDb: " + error };
  }
}

const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds


function oneCategory(id) {
  const getCategoryStmt = database.prepare(`SELECT id, name, prio FROM category where id = ?`);
  return getCategoryStmt.get(id);
}

export function allCategories() {
  const selectAllCategoriesStmt = database.prepare(`SELECT id, name, prio FROM category order by prio desc, name asc `);
  return selectAllCategoriesStmt.all();
}

export function getCategory(categoryId) {
  const categories = allCategories();

  if (categories.length === 0) {
    const result = createCategory('SUMA');
    result.products = [];
    return result;
  }

  categoryId = categoryId || categories[0].id;
  const category = oneCategory(categoryId);
  logger.debug("getCategory: category=" + JSON.stringify(category));

  const selectProductsStmt = database.prepare(`SELECT id, name, sum, state, entry_list FROM product where category_id = ? order by name asc`);
  const products = selectProductsStmt.all(categoryId);

  for (const item of products) {
    item.entry_list = JSON.parse(item.entry_list);
  }

  products.sort((prod1, prod2) => {
    const date1 = expDate(prod1.entry_list[0]);
    const date2 = expDate(prod2.entry_list[0]);
    if (date1 < date2) return -1;
    if (date1 > date2) return 1;
    return 0;
  })
  return { "category": category, "products": products };
};

export function getNextCategory(categoryId) {
  const categories = allCategories();
  const num = categories.findIndex((category) => category.id === categoryId) + 1;
  if (num >= categories.length) return null;
  return getCategory(categories[num].id);
};

export function getPrevCategory(categoryId) {
  const categories = allCategories();
  const num = categories.findIndex((category) => category.id === categoryId) - 1;
  if (num < 0) return null;
  return getCategory(categories[num].id);
};

function expDate(entry) {
  if (!entry || (!entry.year) || (!entry.month)) return "9999/99";
  return entry.year + "/" + entry.month;
}

export function createCategory(itemName) {
  const insertStmt = database.prepare(`INSERT INTO category (name) VALUES (?)`);
  const { lastInsertRowid } = insertStmt.run(itemName);
  logger.debug("createCategory: category " + lastInsertRowid + " created");
  return { category: oneCategory(lastInsertRowid) }
}

export function renameCategory(id, name) {
  const updateNameStmt = database.prepare(`UPDATE category SET name = ? WHERE id = ?`);
  const { changes } = updateNameStmt.run(name, id);
  logger.debug("renameCategorie: item renamed - rows changed=" + changes);
  return { category: oneCategory(id) }
}

export function deleteCategory(id) {
  const deleteStmt = database.prepare(`DELETE FROM category WHERE id = ?`);
  const { changes } = deleteStmt.run(id);
  logger.debug("deleteCategory: category " + id + " deleted - rows deleted=" + changes);
}

export function toggleCategoryStar(categoryId) {
  const toggleStmt = database.prepare(`UPDATE category SET prio = CASE WHEN prio = 0 THEN 1 ELSE 0 END WHERE id = ?`);
  const { changes } = toggleStmt.run(categoryId);
  logger.debug("toggleCategoryStar: category " + categoryId + " toggled - rows changed=" + changes);
  return { category: oneCategory(categoryId) }
}

export function createProduct(categoryId, itemName) {
  const insertStmt = database.prepare(`INSERT INTO product (name, category_id, entry_list) VALUES (?, ?, ?)`);
  const { lastInsertRowid } = insertStmt.run(itemName, categoryId, "[]");
  logger.debug("createProduct: item " + lastInsertRowid + " created");
  return lastInsertRowid;
}

export function getProduct(id) {
  const selectByIdStmt = database.prepare(`SELECT id, name, sum, state, entry_list, datetime(moddate,'unixepoch','localtime') as timestamp FROM product where id=?`);
  const item = selectByIdStmt.get(id);
  item.entry_list = JSON.parse(item.entry_list);
  return item;
}

export function getAllProducts() {
  const selectAllStmt = database.prepare(`SELECT id, name, sum, state, entry_list, datetime(moddate,'unixepoch','localtime') as timestamp FROM product order by name asc`);
  const data = selectAllStmt.all();
  for (let item of data) {
    if (item.entry_list) {
      item.entry_list = JSON.parse(item.entry_list);
    }
  }
  logger.debug("getAllProducts: data.length=" + data.length);
  return data;
}


export function renameProduct(id, name) {
  const updateNameStmt = database.prepare(`UPDATE product SET name = ? WHERE id = ?`);
  const { changes } = updateNameStmt.run(name, id);
  logger.debug("renameProduct: item " + id + " renamed - rows changed=" + changes);

  const selectByIdStmt = database.prepare(`SELECT datetime(moddate,'unixepoch','localtime') as timestamp FROM product where id=?`);
  return selectByIdStmt.get(id).timestamp;
}

export function deleteProduct(id) {
  const deleteStmt = database.prepare(`DELETE FROM product WHERE id = ?`);
  const { changes } = deleteStmt.run(id);
  logger.debug("deleteProduct: item " + id + " deleted - rows deleted=" + changes);
}

export function updateEntry(data) {
  logger.debug("updateEntry: data=" + JSON.stringify(data));

  const selectByIdStmt = database.prepare(`SELECT id, name, sum, state, entry_list, datetime(moddate,'unixepoch','localtime') as timestamp FROM product where id=?`);
  const item = selectByIdStmt.get(data.id);
  item.entry_list = JSON.parse(item.entry_list);
  //item.minExpDate = minExpirationDate(item.entry_list);
  logger.debug("updateEntry: selected item=" + JSON.stringify(item));

  const index = item.entry_list.findIndex((e) => { return e.year === data.year && e.month === data.month; });
  const entry = item.entry_list[index];

  if (entry) {
    entry.count = parseInt(entry.count) + parseInt(data.count);
    if (entry.count < 0) {
      //Fehler
      return null;
    }
    if (entry.count === 0) item.entry_list.splice(index, 1);

  } else {
    if (data.count > 0) {
      item.entry_list.push({ "year": "" + data.year, "month": "" + data.month, "count": "" + data.count });
      item.entry_list.sort(function (a, b) {
        if (a.year !== b.year) { return parseInt(a.year) - parseInt(b.year) } else { return parseInt(a.month) - parseInt(b.month) }
      });
    } else {
      //Fehler
      return null;
    }
  }

  item.sum = 0;
  for (const entry of item.entry_list) { item.sum += parseInt(entry.count) }

  const updateStmt = database.prepare(`UPDATE product SET sum = ?, entry_list = ? WHERE id = ?`);
  const { changes } = updateStmt.run(item.sum, JSON.stringify(item.entry_list), item.id);
  logger.debug("updateEntry: item sum, item entry_list saved - rows changed=" + changes);

  return evalProduct(item);
}

export function evalProduct(item) {
  let minDays = 150;
  for (const entry of item.entry_list) {
    entry.state = Math.round((new Date(entry.year, entry.month - 1, 1).getTime() - new Date().getTime()) / oneDay); //=Restlaufzeit
    minDays = Math.min(minDays, entry.state);
    if (entry.state === 30) {
      push.warn('Das Mindesthaltbarkeitsdatum für ' + item.sum + ' Einheit(en) des Produkts "' + item.name +
        '" wird in ' + entry.state + ' Tagen überschritten!', "SUMA evaluate");
    }
  };
  item.state = wertZuFarbe(minDays / 1.5);
  logger.silly("evalProduct: item.id=" + item.id + ", item.state=" + item.state);

  const updateStmt = database.prepare(`UPDATE product SET state = ? WHERE id = ?`);
  const { changes } = updateStmt.run(item.state, item.id);
  logger.silly("evalProduct: item state saved - rows changed=" + changes);

  return item;
}

function wertZuFarbe(wert) {
  wert = Math.max(0, Math.min(100, wert)); // Begrenzung auf 0-100
  let r, g, b = 0;

  if (wert <= 40) {
    r = 230;
    g = Math.round((wert / 40) * 230);
  } else {
    r = Math.round(230 - ((wert - 40) / 60) * 230);
    g = 230;
  }
  return `rgb(${r},${g},${b})`;
}


