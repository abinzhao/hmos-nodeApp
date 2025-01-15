const { createTable } = require("./mysqlService");
// 创建用户表的函数
async function createUserTable() {
  const tableName = "users";
  const createTableSql = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nickname VARCHAR(255),
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  return createTable(tableName, createTableSql);
}

// 创建应用数据表
async function createAppTable() {
  const tableName = "applications";
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      app_icon VARCHAR(255),
      app_name VARCHAR(255) NOT NULL,
      app_description TEXT,
      app_screenshot VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      app_category JSON,
      app_version VARCHAR(50)
    )
  `;
  return createTable(tableName, createTableSql);
}

// 创建应用留言表
async function createAppMessageTable() {
  const tableName = "app_messages";
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      app_id INT,
      user_id INT,
      message_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (app_id) REFERENCES applications(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `;
  return createTable(tableName, createTableSql);
}

// 导出创建表的函数
async function onCreateTables() {
  await createUserTable();
  await createAppTable();
  await createAppMessageTable();
}

module.exports = onCreateTables;
