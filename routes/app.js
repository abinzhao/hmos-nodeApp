const express = require("express");
const router = express.Router();
const { query, insert, update, deleteData } = require("../mysqlService/mysqlService");
const { authenticateToken, generateToken, authenticateAdmin } = require("../middleware/auth");
// 新增应用数据的接口
router.post("/add-app", authenticateToken, async (req, res) => {
  try {
    const {
      app_icon,
      app_name,
      app_package_name,
      app_description,
      app_screenshot,
      app_category,
      app_version,
      app_file_url,
      publish_type
    } = req.body;
    if (!app_name || !app_package_name) {
      return res.status(400).json({ error: "应用名称和应用包名是必需的" });
    }
    const userId = req.user.id;
    const sql = `
      INSERT INTO applications (app_icon, app_name, app_package_name, app_description, app_screenshot, app_category, app_version, app_file_url, user_id, publish_type)
      VALUES (?,?,?,?,?,?,?,?, ?, ?)
    `;
    const values = [
      app_icon,
      app_name,
      app_package_name,
      app_description,
      app_screenshot,
      app_category,
      app_version,
      app_file_url,
      userId,
      publish_type
    ];
    const insertId = await insert(sql, values);
    res.json({ message: "应用数据添加成功", insertId });
  } catch (error) {
    res.status(500).json({ error: "添加应用数据时出现错误", details: error.message });
  }
});

// 更新应用数据的接口
router.post("/admin/update-app", authenticateAdmin, async (req, res) => {
  try {
    const {
      id,
      app_icon,
      app_name,
      app_package_name,
      app_description,
      app_screenshot,
      app_category,
      app_version,
      app_file_url,
      publish_type,
      application_status,
    } = req.body;
    if (!id) {
      return res.status(400).json({ error: "应用ID是必需的" });
    }

    // 检查应用是否存在且属于当前用户
    const checkSql = "SELECT user_id FROM applications WHERE id = ?";
    const checkResult = await query(checkSql, [id]);

    if (checkResult.length === 0) {
      return res.status(404).json({ error: "应用不存在" });
    }

    // 如果不是管理员，检查是否是应用所有者
    if (req.user.user_role !== 'admin' && checkResult[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "没有权限修改此应用" });
    }

    let sql = "UPDATE applications SET ";
    const values = [];
    let hasUpdate = false;
    if (app_icon) {
      sql += "app_icon =?, ";
      values.push(app_icon);
      hasUpdate = true;
    }
    if (app_name) {
      sql += "app_name =?, ";
      values.push(app_name);
      hasUpdate = true;
    }
    if (app_package_name) {
      sql += "app_package_name =?, ";
      values.push(app_package_name);
      hasUpdate = true;
    }
    if (app_description) {
      sql += "app_description =?, ";
      values.push(app_description);
      hasUpdate = true;
    }
    if (app_screenshot) {
      sql += "app_screenshot =?, ";
      values.push(app_screenshot);
      hasUpdate = true;
    }
    if (app_category) {
      sql += "app_category =?, ";
      values.push(app_category);
      hasUpdate = true;
    }
    if (app_version) {
      sql += "app_version =?, ";
      values.push(app_version);
      hasUpdate = true;
    }
    if (app_file_url) {
      sql += "app_file_url =?, ";
      values.push(app_file_url);
      hasUpdate = true;
    }
    if (publish_type) {
      sql += "publish_type =?, ";
      values.push(publish_type);
      hasUpdate = true;
    }
    if (application_status) {
      sql += "application_status =?, ";
      values.push(application_status);
      hasUpdate = true;
    }
    if (hasUpdate) {
      sql = sql.slice(0, -2); // 去掉最后的逗号和空格
      sql += " WHERE id = ?";
      values.push(id);
      const affectedRows = await update(sql, values);
      if (affectedRows > 0) {
        res.json({ message: "应用数据更新成功" });
      } else {
        res.status(404).json({ error: "应用未找到或数据未更新" });
      }
    } else {
      res.status(400).json({ error: "没有要更新的应用数据" });
    }
  } catch (error) {
    res.status(500).json({ error: "更新应用数据时出现错误", details: error.message });
  }
});

// 更新应用数据的接口
router.post("/user/update-app", authenticateToken, async (req, res) => {
  try {
    const {
      id,
      app_icon,
      app_name,
      app_package_name,
      app_description,
      app_screenshot,
      app_category,
      app_version,
      app_file_url,
      publish_type,
    } = req.body;
    if (!id) {
      return res.status(400).json({ error: "应用ID是必需的" });
    }

    // 检查应用是否存在且属于当前用户
    const checkSql = "SELECT user_id FROM applications WHERE id = ? and application_status = '1'";
    const checkResult = await query(checkSql, [id]);

    if (checkResult.length === 0) {
      return res.status(404).json({ error: "应用不存在" });
    }

    // 如果不是管理员，检查是否是应用所有者
    if (req.user.user_role !== 'admin' && checkResult[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "没有权限修改此应用" });
    }

    let sql = "UPDATE applications SET ";
    const values = [];
    let hasUpdate = false;
    if (app_icon) {
      sql += "app_icon =?, ";
      values.push(app_icon);
      hasUpdate = true;
    }
    if (app_name) {
      sql += "app_name =?, ";
      values.push(app_name);
      hasUpdate = true;
    }
    if (app_package_name) {
      sql += "app_package_name =?, ";
      values.push(app_package_name);
      hasUpdate = true;
    }
    if (app_description) {
      sql += "app_description =?, ";
      values.push(app_description);
      hasUpdate = true;
    }
    if (app_screenshot) {
      sql += "app_screenshot =?, ";
      values.push(app_screenshot);
      hasUpdate = true;
    }
    if (app_category) {
      sql += "app_category =?, ";
      values.push(app_category);
      hasUpdate = true;
    }
    if (app_version) {
      sql += "app_version =?, ";
      values.push(app_version);
      hasUpdate = true;
    }
    if (app_file_url) {
      sql += "app_file_url =?, ";
      values.push(app_file_url);
      hasUpdate = true;
    }
    if (publish_type) {
      sql += "publish_type =?, ";
      values.push(publish_type);
      hasUpdate = true;
    }

    if (hasUpdate) {
      sql = sql.slice(0, -2); // 去掉最后的逗号和空格
      sql += " WHERE id = ?";
      values.push(id);
      const affectedRows = await update(sql, values);
      if (affectedRows > 0) {
        res.json({ message: "应用数据更新成功" });
      } else {
        res.status(404).json({ error: "应用未找到或数据未更新" });
      }
    } else {
      res.status(400).json({ error: "没有要更新的应用数据" });
    }
  } catch (error) {
    res.status(500).json({ error: "更新应用数据时出现错误", details: error.message });
  }
});


// 删除应用数据的接口
router.post("/delete-app", authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: "应用ID是必需的" });
    }

    // 检查应用是否存在且属于当前用户
    const checkSql = "SELECT user_id FROM applications WHERE id = ?";
    const checkResult = await query(checkSql, [id]);

    if (checkResult.length === 0) {
      return res.status(404).json({ error: "应用不存在" });
    }

    // 如果不是管理员，检查是否是应用所有者
    if (req.user.user_role !== 'admin' && checkResult[0].user_id !== req.user.id) {
      return res.status(403).json({ error: "没有权限删除此应用" });
    }

    const sql = "DELETE FROM applications WHERE id = ?";
    const affectedRows = await deleteData(sql, [id]);
    if (affectedRows > 0) {
      res.json({ message: "应用数据删除成功" });
    } else {
      res.status(404).json({ error: "应用未找到或数据未删除" });
    }
  } catch (error) {
    res.status(500).json({ error: "删除应用数据时出现错误", details: error.message });
  }
});

// 查询应用数据的接口
router.get("/get-app", async (req, res) => {
  try {
    const { id } = req.query;
    const { category } = req.query;
    if (!id) {
      return res.status(400).json({ error: "应用ID是必需的" });
    }
    let sql = "";
    let values = [];
    if (category) {
      sql = "SELECT * FROM applications WHERE id =? AND category = ?";
      values = [id, category];
    } else {
      sql = "SELECT * FROM applications WHERE id =?";
      values = [id];
    }

    const results = await query(sql, values);
    if (results.length > 0) {
      res.json({ message: "应用数据查询成功", data: results[0] });
    } else {
      res.status(404).json({ error: "应用未找到" });
    }
  } catch (error) {
    res.status(500).json({ error: "查询应用数据时出现错误", details: error.message });
  }
});

// 查询所有应用或根据分类查询应用的接口
router.post("/get-apps", authenticateToken, async (req, res) => {
  try {
    const { category, application_status } = req.body;
    let sql;
    let values = [];
    const role = req.user.role;
    const userId = req.user.id;
    if (category) {
      // 根据分类查询应用
      sql = "SELECT * FROM applications WHERE app_category =?";
      values = [category];
    } else {
      // 查询所有应用
      sql = "SELECT * FROM applications WHERE 1=1";
      values = [];
    }

    if (application_status) {
      sql += " and application_status = ?";
      values.push(application_status);
    }
    if (role !== "admin") {
      sql += " and (application_status = '3' or user_id = ?)"
      values.push(userId);
    }
    const results = await query(sql, values);

    res.json({
      message: category ? `类别 ${category} 下的应用数据查询成功` : "所有应用数据查询成功",
      data: results,
    });

  } catch (error) {
    res.status(500).json({ error: "查询应用数据时出现错误", details: error.message });
  }
});

// 管理员查询用户列表（带分页）
router.post("/admin/apps", authenticateAdmin, async (req, res) => {
  try {
    // 获取查询参数
    const page = parseInt(req.body.page) || 1;
    const pageSize = parseInt(req.body.pageSize) || 10;
    const search = req.body.search || ''; // 搜索关键词
    const sortBy = req.body.sortBy || 'id'; // 排序字段
    const sortOrder = req.body.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'; // 排序方向
    const role = req.body.role; 
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    const keyword = req.body.keyword;
    const app_package_name = keyword.app_package_name;
    const app_name = keyword.app_name;
    const user_id = keyword.user_id;
    const app_description = keyword.app_description;
    const app_category = keyword.app_category;
    const application_status = keyword.application_status;
    const min_install_count = keyword.min_install_count;
    const max_install_count = keyword.max_install_count;

    // 获取总记录数
    let countSql = `SELECT COUNT(*) as total FROM applications where 1=1`;
    if (app_package_name) {
      countSql += ` AND app_package_name LIKE '%${app_package_name}%'`;
    }
    if (app_name) {
      countSql += ` AND app_name LIKE '%${app_name}%'`;
    }
    if (user_id) {
      countSql += ` AND user_id = ${user_id}`;
    }
    if (app_description) {
      countSql += ` AND app_description LIKE '%${app_description}%'`;
    }
    if (app_category) {
      countSql += ` AND app_category LIKE '%${app_category}%'`;
    }
    if (application_status) {
      countSql += ` AND application_status = ${application_status}`;
    }
    if (min_install_count) {
      countSql += ` AND install_count >= ${min_install_count}`;
    }
    if (max_install_count) {
      countSql += ` AND install_count <= ${max_install_count}`;
    }


    const countResult = await query(countSql, []);
    const total = countResult[0].total;

    // 获取分页数据
    let sql = `SELECT a.*, u.username, u.nickname FROM applications a LEFT JOIN users u ON a.user_id = u.id where 1=1`;
    if (app_package_name) {
      sql += ` AND app_package_name LIKE '%${app_package_name}%'`;
    }
    if (app_name) {
      sql += ` AND app_name LIKE '%${app_name}%'`;
    }
    if (user_id) {
      sql += ` AND user_id = ${user_id}`;
    }
    if (app_description) {
      sql += ` AND app_description LIKE '%${app_description}%'`;
    }
    if (app_category) {
      sql += ` AND app_category LIKE '%${app_category}%'`;
    }
    if (application_status) {
      sql += ` AND application_status = ${application_status}`;
    }
    if (min_install_count) {
      sql += ` AND install_count >= ${min_install_count}`;
    }
    if (max_install_count) {
      sql += ` AND install_count <= ${max_install_count}`;
    }
    sql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`
    const results = await query(sql, [pageSize, offset]);

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    res.json({
      message: "查询成功",
      data: {
        apps: results,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          pageSize,
        },
        filters: {
          search,
          sortBy,
          sortOrder,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: "查询用户列表时出现错误", 
      details: error.message 
    });
  }
});

router.post("/user/apps", authenticateToken, async (req, res) => {
  try {
    // 获取查询参数
    const page = parseInt(req.body.page) || 1;
    const pageSize = parseInt(req.body.pageSize) || 10;
    const search = req.body.search || ''; // 搜索关键词
    const sortBy = req.body.sortBy || 'id'; // 排序字段
    const sortOrder = req.body.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'; // 排序方向
    const role = req.body.role; 
    const myUserId = req.user.id;
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    const keyword = req.body.keyword;
    const app_package_name = keyword.app_package_name;
    const app_name = keyword.app_name;
    const user_id = keyword.user_id;
    const app_description = keyword.app_description;
    const app_category = keyword.app_category;
    const application_status = keyword.application_status;
    const min_install_count = keyword.min_install_count;
    const max_install_count = keyword.max_install_count;

    // 获取总记录数
    let countSql = `SELECT COUNT(*) as total FROM applications where user_id = ? `;
    if (app_package_name) {
      countSql += ` AND app_package_name LIKE '%${app_package_name}%'`;
    }
    if (app_name) {
      countSql += ` AND app_name LIKE '%${app_name}%'`;
    }
    if (user_id) {
      countSql += ` AND user_id = ${user_id}`;
    }
    if (app_description) {
      countSql += ` AND app_description LIKE '%${app_description}%'`;
    }
    if (app_category) {
      countSql += ` AND app_category LIKE '%${app_category}%'`;
    }
    if (application_status) {
      countSql += ` AND application_status = ${application_status}`;
    }
    if (min_install_count) {
      countSql += ` AND install_count >= ${min_install_count}`;
    }
    if (max_install_count) {
      countSql += ` AND install_count <= ${max_install_count}`;
    }


    const countResult = await query(countSql, [myUserId]);
    const total = countResult[0].total;

    // 获取分页数据
    let sql = `SELECT a.*, u.username, u.nickname FROM applications a LEFT JOIN users u ON a.user_id = u.id where a.user_id = ? `;
    if (app_package_name) {
      sql += ` AND app_package_name LIKE '%${app_package_name}%'`;
    }
    if (app_name) {
      sql += ` AND app_name LIKE '%${app_name}%'`;
    }
    if (user_id) {
      sql += ` AND user_id = ${user_id}`;
    }
    if (app_description) {
      sql += ` AND app_description LIKE '%${app_description}%'`;
    }
    if (app_category) {
      sql += ` AND app_category LIKE '%${app_category}%'`;
    }
    if (application_status) {
      sql += ` AND application_status = ${application_status}`;
    }
    if (min_install_count) {
      sql += ` AND install_count >= ${min_install_count}`;
    }
    if (max_install_count) {
      sql += ` AND install_count <= ${max_install_count}`;
    }
    sql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`
    const results = await query(sql, [myUserId, pageSize, offset]);

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    res.json({
      message: "查询成功",
      data: {
        apps: results,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          pageSize,
        },
        filters: {
          search,
          sortBy,
          sortOrder,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: "查询用户列表时出现错误", 
      details: error.message 
    });
  }
});

// 更新安装量的接口
router.post("/update-install-count", async (req, res) => {
  try {
    const { id, installCount } = req.body;
    if (!id || installCount === undefined) {
      return res.status(400).json({ error: "应用ID和安装量是必需的" });
    }
    // 先查询当前的安装量
    const querySql = "SELECT install_count FROM applications WHERE id =?";
    const queryValues = [id];
    const currentInstallCountResult = await query(querySql, queryValues);
    if (currentInstallCountResult.length === 0) {
      return res.status(404).json({ error: "应用未找到" });
    }
    const currentInstallCount = currentInstallCountResult[0].install_count;
    // 计算新的安装量，将当前安装量和传入的安装量相加
    const newInstallCount = currentInstallCount + installCount;
    const sql = "UPDATE applications SET install_count =? WHERE id =?";
    const values = [newInstallCount, id];
    const affectedRows = await update(sql, values);
    if (affectedRows > 0) {
      res.json({ message: "安装量更新成功" });
    } else {
      res.status(404).json({ error: "应用未找到或安装量未更新" });
    }
  } catch (error) {
    res.status(500).json({ error: "更新安装量时出现错误", details: error.message });
  }
});

// 查询安装量的接口
router.get("/get-install-count", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "应用ID是必需的" });
    }
    const sql = "SELECT install_count FROM applications WHERE id =?";
    const values = [id];
    const results = await query(sql, values);
    if (results.length > 0) {
      res.json({ message: "安装量查询成功", installCount: results[0].install_count });
    } else {
      res.status(404).json({ error: "应用未找到" });
    }
  } catch (error) {
    res.status(500).json({ error: "查询安装量时出现错误", details: error.message });
  }
});

// 查询App总数
router.get("/get-app-total", async (req, res) => {
  try {
    const sql = "SELECT count(*) as count FROM applications";
    const results = await query(sql, []);
    if (results.length > 0) {
      res.json({ message: "安装量查询成功", appCount: results[0].count });
    } else {
      res.status(404).json({ error: "应用未找到" });
    }
  } catch (error) {
    res.status(500).json({ error: "查询安装量时出现错误", details: error.message });
  }
});

// 查询App安装总数
router.get("/get-app-install-total", async (req, res) => {
  try {
    const sql = "SELECT sum(install_count) as install_counts FROM applications";
    const results = await query(sql, []);
    if (results.length > 0) {
      res.json({ message: "安装量查询成功", appInstallCount: results[0].install_counts });
    } else {
      res.status(404).json({ error: "应用未找到" });
    }
  } catch (error) {
    res.status(500).json({ error: "查询安装量时出现错误", details: error.message });
  }
});

// 查询应用名称的接口
router.post("/get-app-infos", authenticateAdmin, async (req, res) => {
  try {
    const { page, pageSize, name } = req.body;
    const offset = (page - 1) * pageSize;
    const role = req.user.role;
    const userId = req.user.id;
  
    let sql = `SELECT id, app_name, app_package_name, app_icon FROM applications WHERE 1=1`;
    if (name) {
      sql += ` and app_name like '%${name}%'`
      sql += ` and app_package_name like '%${name}%'`
    }

    sql += ' LIMIT ? OFFSET ?'
    const results = await query(sql, [pageSize, offset]);

    res.json({
      message: name ? `类名称或应用名称 ${name} 下的应用数据查询成功` : "所有应用数据查询成功",
      data: results,
    });

  } catch (error) {
    res.status(500).json({ error: "查询应用数据时出现错误", details: error.message });
  }
});

module.exports = router;
