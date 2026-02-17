const mysql = require('mysql2/promise');

let pool = null;

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
}

module.exports = { getRealmlist, updateRealm, close };
