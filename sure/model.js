
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs-extra';
import { logger } from '../log.js'

const SURE_DB = process.env.SURE_DB;
let DB;

fs.pathExists(SURE_DB, (err, exists) => {
  if (err) { logger.info(err) }
  else {
    DB = new DatabaseSync(SURE_DB, { open: true });
    if (exists) {
      DB = new DatabaseSync(SURE_DB, { open: true });
      if (!DB) {
        logger.info('Could not connect to SURE database at "' + SURE_DB + '".');
        process.exit(1);
      } else {
        logger.info('Connected to SURE database at "' + SURE_DB + '".');
      }
    } else {
 /*      DB.exec(`
CREATE TABLE IF NOT EXISTS product(
  id         INTEGER NOT NULL
                       PRIMARY KEY AUTOINCREMENT
                       UNIQUE,
  name       TEXT    NOT NULL,
  sum        INTEGER,
  state      TEXT,
  entry_list TEXT,
  moddate    INTEGER DEFAULT(strftime('%s'))
);
   `);
      DB.exec(`
CREATE TRIGGER update_moddate
         AFTER UPDATE
            ON product
BEGIN
    UPDATE product
       SET moddate = strftime('%s') 
     WHERE id = NEW.id;
END;
    `);
      logger.info('A new SURE database was successfully created and opened at "' + SURE_DB + '".'); */
    }
  }
})

export function connectDb() {  // open database 
  try {
    DB.open();
    logger.info("connectDb: DB opened", 1);
    return { state: true, msg: "SURE Database connected." }
  } catch (error) {
    //DB already open
    //logger.error(error)
    return { state: false, msg: error.message };
  }
}

export function unconnectDb() {  // close database 
  try {
    DB.close();
    logger.info("unconnectDb: DB closed", 1);
    return { state: true, msg: "SURE Database closed" }
  } catch (error) {
    logger.error(error)
    return { state: false, msg: error.message };
  }
}

const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

export function getData() {
  try {
    const selectAllStmt = DB.prepare(`SELECT id, name, sum, state, entry_list, datetime(moddate,'unixepoch','localtime') as timestamp FROM product order by name asc`);
    const data = selectAllStmt.all();
    for (let item of data) {
      if (item.entry_list) item.entry_list = JSON.parse(item.entry_list);
    }
    logger.info("getData: data.length=" + data.length);
    return data;

  } catch (error) {
    logger.error(error); return {}
  }
};

export function getProducts(categoryId) {
  try {
    const selectAllCategoriesStmt = DB.prepare(`SELECT id, name, sort_index FROM category order by sort_index asc`);
    const categories = selectAllCategoriesStmt.all();

    categoryId = categoryId || categories[0].id;
    const category = categories.find(cat => cat.id === categoryId);
    logger.debug("getProducts: category=" + JSON.stringify(category));

    const selectProductsStmt = DB.prepare(`SELECT id FROM product where category_id = ? order by name asc`);
    const products = selectProductsStmt.all(categoryId);


    return { "category": category, "products": products, "allCategories": categories};

  } catch (error) {
    logger.error(error); return {x: "xxx"}
  }
};

export function getItem(id) {
  try {
    const selectByIdStmt = DB.prepare(`SELECT id, name, sum, state, entry_list, datetime(moddate,'unixepoch','localtime') as timestamp FROM product where id=?`);
    const item = selectByIdStmt.get(id);
    item.entry_list = JSON.parse(item.entry_list);
    return item;

  } catch (error) {
    logger.info("getItem: item " + id + " could not be retrieved.");
    logger.error(error); throw error
  }
}

export function createItem(itemName) {
  try {
    const insertStmt = DB.prepare(`INSERT INTO product (name, entry_list) VALUES (?, ?)`);
    //logger.info("createItem: item: " + itemName);
    const { lastInsertRowid } = insertStmt.run(itemName, "[]");
    logger.info("createItem: item " + lastInsertRowid + " created");
    return lastInsertRowid;

  } catch (error) {
    logger.info("createItem: item '" + itemName + "' could not be created.");
    logger.error(error); throw error
  }
}

export function deleteItem(id) {
  try {
    const deleteStmt = DB.prepare(`DELETE FROM product WHERE id = ?`);
    const { changes } = deleteStmt.run(id);
    logger.info("deleteItem: item " + id + " deleted - rows deleted=" + changes);

  } catch (error) {
    logger.info("deleteItem: item " + id + " could not be deleted.");
    logger.error(error); throw error
  }
}

export function updateItemEntry(itemId, year, month, count) {
  logger.info("updateItemEntry: itemId=" + itemId + ", year" + year + ", month=" + month + ", count=" + count);
  try {
    const selectByIdStmt = DB.prepare(`SELECT id, name, sum, state, entry_list, datetime(moddate,'unixepoch','localtime') as timestamp FROM product where id=?`);
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

    const updateStmt = DB.prepare(`UPDATE product SET sum = ?, entry_list = ? WHERE id = ?`);
    const { changes } = updateStmt.run(item.sum, JSON.stringify(item.entry_list), item.id);
    logger.info("updateItemEntry: item sum, item entry_list saved - rows changed=" + changes);

    evalItem(item);

  } catch (error) {
    logger.info("updateItemEntry: item " + itemId + " could not be updated."); logger.error(error); throw error
  }
}

export function renameItem(id, name) {
  logger.info("renameItem: item=" + name)
  try {
    const updateNameStmt = DB.prepare(`UPDATE product SET name = ? WHERE id = ?`);
    const { changes } = updateNameStmt.run(name, id);
    logger.info("renameItem: item renamed - rows changed=" + changes);

    const selectByIdStmt = DB.prepare(`SELECT datetime(moddate,'unixepoch','localtime') as timestamp FROM product where id=?`);
    return selectByIdStmt.get(id).timestamp;

  } catch (error) {
    logger.info("updatedbItem: item " + id + " could not be renamed."); logger.error(error); throw error
  }
}

export function evalItem(item) {
  //logger.info("evalItem: item=" + JSON.stringify(item));
  let anyEntryChanged = false;

  item.entry_list.map(entry => {
    const oldEntryState = entry.state;
    entry.state = evalEntry(entry);
    if ((entry.state !== oldEntryState) && entry.state !== "green") {
      pushover('SURE für ' + item.sum + ' Einheit(en) des Produkts "' + item.name + "' im Monat " + entry.year + "/" + entry.month + " überschritten!",
        "Warnung", 0, "pushover");
    }
    anyEntryChanged = anyEntryChanged || (entry.state !== oldEntryState);
  });

  let itemChanged = false;
  if (anyEntryChanged) {
    const oldItemState = item.state;
    item.entry_list.map(entry => {
      logger.info("evalItem entry=" + JSON.stringify(entry));
      if (entry.state === "red") item.state = "red";
      else if (entry.state === "yellow" && entry.state === "green") item.state = "yellow";
      else item.state = "green";
    });
    itemChanged = (item.state !== oldItemState);
  }
  logger.info("evalItem: item.id=" + item.id + ", item.state=" + item.state);
  if (itemChanged) {
    const updateStmt = DB.prepare(`UPDATE product SET state = ? WHERE id = ?`);
    const { changes } = updateStmt.run(item.state, item.id);
    logger.info("evalItem: item state saved - rows changed=" + changes);
  }
  return itemChanged;
}

function evalEntry(entry) {
  const diffDays = Math.round((new Date(entry.year, entry.month, 1).getTime() - new Date().getTime()) / oneDay);
  if (diffDays < 30) return "red";
  if (diffDays < 0) return "yellow";
  return "green";
}
