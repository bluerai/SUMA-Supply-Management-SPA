
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs-extra';
import { logger } from '../log.js'

const SUPMA_DB = process.env.SUPMA_DB;
let database;

fs.pathExists(SUPMA_DB, (err, exists) => {
  database = new DatabaseSync(SUPMA_DB, { open: true });
  if (exists) {
    if (!database) {
      logger.info('Could not connect to SUPMA database at "' + SUPMA_DB + '".');
      process.exit(1);
    } else {
      logger.info('Connected to SUPMA database at "' + SUPMA_DB + '".');
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
    logger.info('A new SUPMA database was successfully created and opened at "' + SUPMA_DB + '".'); 
  }
})

export function connectDb() {  // open database 
  try {
    database.open();
    return "SUPMA connectDb: DB opened";
  } catch (error) {
    return "SUPMA connectDb: " + error;
  }
}

export function unconnectDb() {  // close database 
  try {
    database.close();
    return ("SUPMA unconnectDb: DB closed", 1);
  } catch (error) {
    return "SUPMA unconnectDb: " + error;
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
    const result = createCategory('SUPMA');
    result.products = [];
    return result;
  }
  
  categoryId = categoryId || categories[0].id;
  const category = oneCategory(categoryId);
  logger.debug("getProducts: category=" + JSON.stringify(category));

  const selectProductsStmt = database.prepare(`SELECT id FROM product where category_id = ? order by name asc`);
  const products = selectProductsStmt.all(categoryId);

  return { "category": category, "products": products };
};

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
    if (item.entry_list) item.entry_list = JSON.parse(item.entry_list);
  }
  logger.debug("getAllProducts: data.length=" + data.length);
  return data;
};


export function renameProduct(id, name) {
  const updateNameStmt = database.prepare(`UPDATE product SET name = ? WHERE id = ?`);
  const { changes } = updateNameStmt.run(name, id);
  logger.debug("renameProduct: item renamed - rows changed=" + changes);

  const selectByIdStmt = database.prepare(`SELECT datetime(moddate,'unixepoch','localtime') as timestamp FROM product where id=?`);
  return selectByIdStmt.get(id).timestamp;
}

export function deleteProduct(id) {
  const deleteStmt = database.prepare(`DELETE FROM product WHERE id = ?`);
  const { changes } = deleteStmt.run(id);
  logger.debug("deleteProduct: item " + id + " deleted - rows deleted=" + changes);
}

export function updateEntry(itemId, year, month, count) {
  logger.debug("updateEntry: itemId=" + itemId + ", year" + year + ", month=" + month + ", count=" + count);

  const selectByIdStmt = database.prepare(`SELECT id, name, sum, state, entry_list, datetime(moddate,'unixepoch','localtime') as timestamp FROM product where id=?`);
  const item = selectByIdStmt.get(itemId);
  item.entry_list = JSON.parse(item.entry_list);

  const index = item.entry_list.findIndex((e) => { return e.year === year && e.month === month; });
  const entry = item.entry_list[index];

  if (entry) {
    entry.count = parseInt(entry.count) + parseInt(count);
    if (entry.count < 0) {
      //Fehler
      return null;
    }
    if (entry.count === 0) item.entry_list.splice(index, 1);

  } else {
    if (count > 0) {
      item.entry_list.push({ "year": "" + year, "month": "" + month, "count": "" + count });
      item.entry_list.sort(function (a, b) {
        if (a.year !== b.year) { return parseInt(a.year) - parseInt(b.year) } else { return parseInt(a.month) - parseInt(b.month) }
      });
    } else {
      //Fehler
      return null;
    }
  }

  item.sum = 0;
  item.entry_list.map(entry => item.sum += parseInt(entry.count));

  const updateStmt = database.prepare(`UPDATE product SET sum = ?, entry_list = ? WHERE id = ?`);
  const { changes } = updateStmt.run(item.sum, JSON.stringify(item.entry_list), item.id);
  logger.debug("updateEntry: item sum, item entry_list saved - rows changed=" + changes);

  evalProduct(item);
}

export function evalProduct(item) {
  let anyEntryChanged = false;
  item.entry_list.map(entry => {
    const oldEntryState = entry.state;
    entry.state = evalEntry(entry);
    if ((entry.state !== oldEntryState) && entry.state !== "green") {
      pushover('SUPMA für ' + item.sum + ' Einheit(en) des Produkts "' + item.name + "' im Monat " + entry.year + "/" + entry.month + " überschritten!",
        "Warnung", 0, "pushover");
    }
    anyEntryChanged = anyEntryChanged || (entry.state !== oldEntryState);
  });

  let itemChanged = false;
  if (anyEntryChanged) {
    const oldItemState = item.state;
    item.entry_list.map(entry => {
      logger.debug("evalProduct entry=" + JSON.stringify(entry));
      if (entry.state === "red") item.state = "red";
      else if (entry.state === "yellow" && entry.state === "green") item.state = "yellow";
      else item.state = "green";
    });
    itemChanged = (item.state !== oldItemState);
  }
  logger.debug("evalProduct: item.id=" + item.id + ", item.state=" + item.state);
  if (itemChanged) {
    const updateStmt = database.prepare(`UPDATE product SET state = ? WHERE id = ?`);
    const { changes } = updateStmt.run(item.state, item.id);
    logger.debug("evalProduct: item state saved - rows changed=" + changes);
  }
  return itemChanged;
}

function evalEntry(entry) {
  const diffDays = Math.round((new Date(entry.year, entry.month, 1).getTime() - new Date().getTime()) / oneDay);
  if (diffDays < 30) return "red";
  if (diffDays < 0) return "yellow";
  return "green";
}
