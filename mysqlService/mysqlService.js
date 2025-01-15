const mysql = require("mysql");
const dbConfig = require("./dbConfig");

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 执行数据库查询操作的函数（使用参数化查询优化）
/**
 * 执行数据库查询操作的函数
 * @param {string} sql - SQL 查询语句
 * @param {Array} values - 查询参数
 * @returns {Promise} - 包含查询结果的 Promise 对象
 */
function query(sql, values) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        // 使用参数化查询（预处理语句）
        connection.query(sql, values, (queryErr, results, fields) => {
          // 释放连接回连接池
          connection.release();
          if (queryErr) {
            reject(queryErr);
          } else {
            resolve(results);
          }
        });
      }
    });
  });
}

// 执行数据库插入操作的函数（使用参数化查询优化，返回插入后的自增ID）
/**
 * 执行数据库插入操作的函数
 * @param {string} sql - SQL 插入语句
 * @param {Array} values - 插入参数
 * @returns {Promise} - 包含插入结果（插入的自增ID）的 Promise 对象
 */
function insert(sql, values) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        // 使用参数化查询（预处理语句）
        connection.query(sql, values, (queryErr, results) => {
          connection.release();
          if (queryErr) {
            reject(queryErr);
          } else {
            resolve(results.insertId);
          }
        });
      }
    });
  });
}

// 执行数据库更新操作的函数（使用参数化查询优化）
/**
 * 执行数据库更新操作的函数
 * @param {string} sql - SQL 更新语句
 * @param {Array} values - 更新参数
 * @returns {Promise} - 包含更新结果（受影响的行数）的 Promise 对象
 */
function update(sql, values) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        // 使用参数化查询（预处理语句）
        connection.query(sql, values, (queryErr, results) => {
          connection.release();
          if (queryErr) {
            reject(queryErr);
          } else {
            resolve(results.affectedRows);
          }
        });
      }
    });
  });
}

// 执行数据库删除操作的函数（使用参数化查询优化）
/**
 * 执行数据库删除操作的函数
 * @param {string} sql - SQL 删除语句
 * @param {Array} values - 删除参数
 * @returns {Promise} - 包含删除结果（受影响的行数）的 Promise 对象
 */
function deleteData(sql, values) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        // 使用参数化查询（预处理语句）
        connection.query(sql, values, (queryErr, results) => {
          connection.release();
          if (queryErr) {
            reject(queryErr);
          } else {
            resolve(results.affectedRows);
          }
        });
      }
    });
  });
}

// 通用的创建表函数
/**
 * 通用的创建表函数
 * @param {string} tableName - 要创建的表名
 * @param {string} createTableSql - 创建表的 SQL 语句
 * @returns {Promise} - 指示创建表操作是否成功的 Promise 对象
 */
async function createTable(tableName, createTableSql) {
  try {
    // 检查表是否已经存在
    const checkTableSql = `SHOW TABLES LIKE '${tableName}'`;
    const existingTables = await query(checkTableSql);
    if (existingTables.length === 0) {
      await query(createTableSql);
      console.log(`${tableName} 表创建成功`);
    } else {
      console.log(`${tableName} 表已存在`);
    }
    return true;
  } catch (error) {
    console.error(`创建 ${tableName} 表时出现错误:`, error.message);
    return false;
  }
}

// 执行数据库插入操作的函数（使用参数化查询优化，返回插入后的自增ID）
function insert(sql, values) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        // 使用参数化查询（预处理语句）
        connection.query(sql, values, (queryErr, results) => {
          connection.release();
          if (queryErr) {
            reject(queryErr);
          } else {
            resolve(results.insertId);
          }
        });
      }
    });
  });
}

// 执行数据库更新操作的函数（使用参数化查询优化）
function update(sql, values) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        // 使用参数化查询（预处理语句）
        connection.query(sql, values, (queryErr, results) => {
          connection.release();
          if (queryErr) {
            reject(queryErr);
          } else {
            resolve(results.affectedRows);
          }
        });
      }
    });
  });
}

// 执行数据库删除操作的函数（使用参数化查询优化）
function deleteData(sql, values) {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
      } else {
        // 使用参数化查询（预处理语句）
        connection.query(sql, values, (queryErr, results) => {
          connection.release();
          if (queryErr) {
            reject(queryErr);
          } else {
            resolve(results.affectedRows);
          }
        });
      }
    });
  });
}

// 通用的创建表函数
/**
 * 通用的创建表函数
 * @param {string} tableName - 要创建的表名
 * @param {string} createTableSql - 创建表的 SQL 语句
 * @returns {Promise} - 指示创建表操作是否成功的 Promise 对象
 */
async function createTable(tableName, createTableSql) {
  try {
    // 检查表是否已经存在
    const checkTableSql = `SHOW TABLES LIKE '${tableName}'`;
    const existingTables = await query(checkTableSql);
    if (existingTables.length === 0) {
      await query(createTableSql);
      console.log(`${tableName} 表创建成功`);
    } else {
      console.log(`${tableName} 表已存在`);
    }
    return true;
  } catch (error) {
    console.error(`创建 ${tableName} 表时出现错误:`, error.message);
    return false;
  }
}

module.exports = {
  query,
  insert,
  update,
  deleteData,
  createTable,
};
