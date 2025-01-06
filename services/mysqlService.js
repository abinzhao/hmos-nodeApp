const mysql = require("mysql");
const dbConfig = require("./dbConfig");

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 执行数据库查询操作的函数（使用参数化查询优化）
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

module.exports = {
  query,
  insert,
  update,
  deleteData,
};
