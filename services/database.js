const mysql = require('mysql2/promise');

let pool = null;
let worldPool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'password',
      database: 'acore_auth',
      waitForConnections: true,
      connectionLimit: 2,
    });
  }
  return pool;
}

async function getRealmlist() {
  const [rows] = await getPool().query(
    'SELECT id, name, address, localAddress, localSubnetMask, port FROM realmlist'
  );
  return rows;
}

async function updateRealm(id, fields) {
  const allowed = ['name', 'address', 'localAddress', 'localSubnetMask', 'port'];
  const sets = [];
  const values = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`\`${key}\` = ?`);
      values.push(fields[key]);
    }
  }

  if (sets.length === 0) return false;
  values.push(id);

  await getPool().query(
    `UPDATE realmlist SET ${sets.join(', ')} WHERE id = ?`,
    values
  );
  return true;
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (worldPool) {
    await worldPool.end();
    worldPool = null;
  }
}

// ── World Database Pool ─────────────────────────────────────────────────────
function getWorldPool() {
  if (!worldPool) {
    worldPool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'password',
      database: 'acore_world',
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return worldPool;
}

// ── Item CRUD Operations ─────────────────────────────────────────────────────
async function getItems({ search = '', page = 1, pageSize = 20, sortBy = 'entry', sortOrder = 'ASC' } = {}) {
  const validSortColumns = ['entry', 'name', 'Quality', 'ItemLevel', 'RequiredLevel', 'class', 'subclass'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'entry';
  const sortDir = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const offset = (page - 1) * pageSize;

  let whereClause = '';
  let params = [];

  if (search) {
    // Check if search is numeric for entry ID search
    if (/^\d+$/.test(search)) {
      whereClause = 'WHERE entry = ? OR name LIKE ?';
      params = [parseInt(search, 10), `%${search}%`];
    } else {
      whereClause = 'WHERE name LIKE ?';
      params = [`%${search}%`];
    }
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM item_template ${whereClause}`;
  const [countResult] = await getWorldPool().query(countQuery, params);
  const total = countResult[0].total;

  // Get paginated items with essential columns
  const itemsQuery = `
    SELECT entry, name, displayid, Quality, Flags, InventoryType, MaxCount,
           ItemLevel, RequiredLevel, class, subclass, BuyPrice, SellPrice,
           stackable, bonding, Material, Sheath, Description
    FROM item_template
    ${whereClause}
    ORDER BY \`${sortColumn}\` ${sortDir}
    LIMIT ? OFFSET ?
  `;
  const [rows] = await getWorldPool().query(itemsQuery, [...params, pageSize, offset]);

  return {
    items: rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

async function getItemByEntry(entry) {
  const [rows] = await getWorldPool().query(
    'SELECT * FROM item_template WHERE entry = ?',
    [entry]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function createItem(itemData) {
  const {
    entry, name, displayid, Quality, Flags, InventoryType, MaxCount,
    ItemLevel, RequiredLevel, class: itemClass, subclass, BuyPrice, SellPrice,
    stackable, bonding, Material, Sheath, Description,
    // Additional common fields
    spellid_1, spelltrigger_1, spellppmRate_1, spellcharges_1,
    spellid_2, spelltrigger_2, spellppmRate_2, spellcharges_2,
    spellid_3, spelltrigger_3, spellppmRate_3, spellcharges_3,
    spellid_4, spelltrigger_4, spellppmRate_4, spellcharges_4,
    spellid_5, spelltrigger_5, spellppmRate_5, spellcharges_5,
    StatsCount, stat_type1, stat_value1, stat_type2, stat_value2,
    stat_type3, stat_value3, stat_type4, stat_value4, stat_type5, stat_value5,
    stat_type6, stat_value6, stat_type7, stat_value7, stat_type8, stat_value8,
    stat_type9, stat_value9, stat_type10, stat_value10,
    dmg_min1, dmg_max1, dmg_type1, dmg_min2, dmg_max2, dmg_type2,
    armor, holy_res, fire_res, nature_res, frost_res, shadow_res, arcane_res,
    delay, ammo_type, RangedModRange, startquest, lockid,
    RandomProperty, RandomSuffix, itemset, MaxDurability, Zone, BagFamily,
    ScriptName, DisenchantID, FoodType, minMoneyLoot, maxMoneyLoot,
    Duration, ItemLimitCategoryId, HolidayId
  } = itemData;

  const result = await getWorldPool().query(
    `INSERT INTO item_template (
      entry, name, displayid, Quality, Flags, InventoryType, MaxCount,
      ItemLevel, RequiredLevel, \`class\`, subclass, BuyPrice, SellPrice,
      stackable, bonding, Material, Sheath, Description,
      spellid_1, spelltrigger_1, spellppmRate_1, spellcharges_1,
      spellid_2, spelltrigger_2, spellppmRate_2, spellcharges_2,
      spellid_3, spelltrigger_3, spellppmRate_3, spellcharges_3,
      spellid_4, spelltrigger_4, spellppmRate_4, spellcharges_4,
      spellid_5, spelltrigger_5, spellppmRate_5, spellcharges_5,
      StatsCount, stat_type1, stat_value1, stat_type2, stat_value2,
      stat_type3, stat_value3, stat_type4, stat_value4, stat_type5, stat_value5,
      stat_type6, stat_value6, stat_type7, stat_value7, stat_type8, stat_value8,
      stat_type9, stat_value9, stat_type10, stat_value10,
      dmg_min1, dmg_max1, dmg_type1, dmg_min2, dmg_max2, dmg_type2,
      armor, holy_res, fire_res, nature_res, frost_res, shadow_res, arcane_res,
      delay, ammo_type, RangedModRange, startquest, lockid,
      RandomProperty, RandomSuffix, itemset, MaxDurability, Zone, BagFamily,
      ScriptName, DisenchantID, FoodType, minMoneyLoot, maxMoneyLoot,
      Duration, ItemLimitCategoryId, HolidayId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry, name, displayid, Quality, Flags, InventoryType, MaxCount,
      ItemLevel, RequiredLevel, itemClass, subclass, BuyPrice, SellPrice,
      stackable, bonding, Material, Sheath, Description,
      spellid_1 || 0, spelltrigger_1 || 0, spellppmRate_1 || 0, spellcharges_1 || 0,
      spellid_2 || 0, spelltrigger_2 || 0, spellppmRate_2 || 0, spellcharges_2 || 0,
      spellid_3 || 0, spelltrigger_3 || 0, spellppmRate_3 || 0, spellcharges_3 || 0,
      spellid_4 || 0, spelltrigger_4 || 0, spellppmRate_4 || 0, spellcharges_4 || 0,
      spellid_5 || 0, spelltrigger_5 || 0, spellppmRate_5 || 0, spellcharges_5 || 0,
      StatsCount || 0,
      stat_type1 || 0, stat_value1 || 0, stat_type2 || 0, stat_value2 || 0,
      stat_type3 || 0, stat_value3 || 0, stat_type4 || 0, stat_value4 || 0,
      stat_type5 || 0, stat_value5 || 0, stat_type6 || 0, stat_value6 || 0,
      stat_type7 || 0, stat_value7 || 0, stat_type8 || 0, stat_value8 || 0,
      stat_type9 || 0, stat_value9 || 0, stat_type10 || 0, stat_value10 || 0,
      dmg_min1 || 0, dmg_max1 || 0, dmg_type1 || 0, dmg_min2 || 0, dmg_max2 || 0, dmg_type2 || 0,
      armor || 0, holy_res || 0, fire_res || 0, nature_res || 0, frost_res || 0, shadow_res || 0, arcane_res || 0,
      delay || 0, ammo_type || 0, RangedModRange || 0, startquest || 0, lockid || 0,
      RandomProperty || 0, RandomSuffix || 0, itemset || 0, MaxDurability || 0, Zone || 0, BagFamily || 0,
      ScriptName || '', DisenchantID || 0, FoodType || 0, minMoneyLoot || 0, maxMoneyLoot || 0,
      Duration || 0, ItemLimitCategoryId || 0, HolidayId || 0
    ]
  );

  return result[0].insertId;
}

async function updateItem(entry, fields) {
  // Define allowed fields for update to prevent SQL injection
  const allowed = [
    'name', 'displayid', 'Quality', 'Flags', 'InventoryType', 'MaxCount',
    'ItemLevel', 'RequiredLevel', 'class', 'subclass', 'BuyPrice', 'SellPrice',
    'stackable', 'bonding', 'Material', 'Sheath', 'Description',
    'spellid_1', 'spelltrigger_1', 'spellppmRate_1', 'spellcharges_1',
    'spellid_2', 'spelltrigger_2', 'spellppmRate_2', 'spellcharges_2',
    'spellid_3', 'spelltrigger_3', 'spellppmRate_3', 'spellcharges_3',
    'spellid_4', 'spelltrigger_4', 'spellppmRate_4', 'spellcharges_4',
    'spellid_5', 'spelltrigger_5', 'spellppmRate_5', 'spellcharges_5',
    'StatsCount', 'stat_type1', 'stat_value1', 'stat_type2', 'stat_value2',
    'stat_type3', 'stat_value3', 'stat_type4', 'stat_value4', 'stat_type5', 'stat_value5',
    'stat_type6', 'stat_value6', 'stat_type7', 'stat_value7', 'stat_type8', 'stat_value8',
    'stat_type9', 'stat_value9', 'stat_type10', 'stat_value10',
    'dmg_min1', 'dmg_max1', 'dmg_type1', 'dmg_min2', 'dmg_max2', 'dmg_type2',
    'armor', 'holy_res', 'fire_res', 'nature_res', 'frost_res', 'shadow_res', 'arcane_res',
    'delay', 'ammo_type', 'RangedModRange', 'startquest', 'lockid',
    'RandomProperty', 'RandomSuffix', 'itemset', 'MaxDurability', 'Zone', 'BagFamily',
    'ScriptName', 'DisenchantID', 'FoodType', 'minMoneyLoot', 'maxMoneyLoot',
    'Duration', 'ItemLimitCategoryId', 'HolidayId'
  ];

  const sets = [];
  const values = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`\`${key}\` = ?`);
      values.push(fields[key]);
    }
  }

  if (sets.length === 0) return false;
  values.push(entry);

  await getWorldPool().query(
    `UPDATE item_template SET ${sets.join(', ')} WHERE entry = ?`,
    values
  );
  return true;
}

async function deleteItem(entry) {
  const [result] = await getWorldPool().query(
    'DELETE FROM item_template WHERE entry = ?',
    [entry]
  );
  return result.affectedRows > 0;
}

module.exports = { getRealmlist, updateRealm, close, getItems, getItemByEntry, createItem, updateItem, deleteItem };
