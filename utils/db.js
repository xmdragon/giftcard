const mysql = require('mysql2/promise');
const { getDbConfig } = require('./db-init');

const pool = mysql.createPool({
  ...getDbConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function getOne(sql, params) {
  const results = await query(sql, params);
  return results.length > 0 ? results[0] : null;
}

async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  
  try {
    const [result] = await pool.execute(sql, values);
    return result;
  } catch (error) {
    console.error(`Failed to insert data into ${table}:`, error);
    throw error;
  }
}

async function update(table, data, condition) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  const setClause = keys.map(key => `${key} = ?`).join(', ');
  const whereClause = typeof condition === 'string' ? condition : Object.keys(condition).map(key => `${key} = ?`).join(' AND ');
  
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  
  const params = values.concat(typeof condition === 'string' ? [] : Object.values(condition));
  
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch (error) {
    console.error(`Failed to update ${table}:`, error);
    throw error;
  }
}

async function remove(table, condition) {
  const whereClause = typeof condition === 'string' ? condition : Object.keys(condition).map(key => `${key} = ?`).join(' AND ');
  const params = typeof condition === 'string' ? [] : Object.values(condition);
  
  const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
  
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch (error) {
    console.error(`Failed to delete data from ${table}:`, error);
    throw error;
  }
}

async function transaction(callback) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('Transaction execution failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  query,
  getOne,
  insert,
  update,
  remove,
  transaction,
  execute: async (sql, params) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
  }
};