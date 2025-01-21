const express = require("express");
const router = express.Router();
const { query, insert, update, deleteData } = require("../mysqlService/mysqlService");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");

// 发送应用留言
router.post("/app-message/create", authenticateToken, async (req, res) => {
  try {
    const { app_id, message_text } = req.body;
    const user_id = req.user.id;

    if (!app_id || !message_text) {
      return res.status(400).json({ error: "应用ID和留言内容是必需的" });
    }

    // 检查应用是否存在
    const checkAppSql = "SELECT id FROM applications WHERE id = ?";
    const appExists = await query(checkAppSql, [app_id]);
    
    if (appExists.length === 0) {
      return res.status(404).json({ error: "应用不存在" });
    }

    const sql = `
      INSERT INTO app_messages 
      (app_id, user_id, message_text) 
      VALUES (?, ?, ?)
    `;
    
    const messageId = await insert(sql, [app_id, user_id, message_text]);
    
    res.json({
      message: "留言发送成功",
      data: {
        id: messageId,
        app_id,
        user_id,
        message_text,
        created_at: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: "发送留言失败", 
      details: error.message 
    });
  }
});

// 获取我的所有留言
router.post("/my-messages", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.body.page) || 1;
    const pageSize = parseInt(req.body.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // 获取总记录数
    const countSql = "SELECT COUNT(*) as total FROM app_messages WHERE user_id = ?";
    const countResult = await query(countSql, [userId]);
    const total = countResult[0].total;

    // 获取分页数据
    const sql = `
      SELECT 
        am.*,
        a.app_name,
        a.app_package_name,
        a.app_icon
      FROM app_messages am
      LEFT JOIN applications a ON am.app_id = a.id
      WHERE am.user_id = ?
      ORDER BY am.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const messages = await query(sql, [userId, pageSize, offset]);
    
    res.json({
      message: "查询成功",
      data: {
        messages: messages,
        pagination: {
          total,
          totalPages: Math.ceil(total / pageSize),
          currentPage: page,
          pageSize
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: "获取留言列表失败", 
      details: error.message 
    });
  }
});

// 获取我的所有留言
router.post("/all-messages", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.body.page) || 1;
    const pageSize = parseInt(req.body.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const keyword = req.body.keyword;
    const nickname = keyword.nickname;
    const app_name = keyword.app_name;
    const app_package_name = keyword.app_package_name;
    const message_text = keyword.message_text;

    // 获取总记录数
    let countSql = `
        SELECT 
        count(*) as total
      FROM app_messages am
      LEFT JOIN applications a ON am.app_id = a.id
      LEFT JOIN users u ON am.user_id = u.id
      WHERE 1=1
      `;
    if (app_name) {
      countSql += `AND a.app_name LIKE '%${app_name}%' `;
    }
    if (app_package_name) {
      countSql += `AND a.app_package_name LIKE '%${app_package_name}%' `;
    }
    if (message_text) {
      countSql += `AND am.message_text LIKE '%${message_text}%' `;
    }
    if (nickname) {
      countSql += `AND u.nickname LIKE '%${nickname}%' `;
    }
    const countResult = await query(countSql, []);
    const total = countResult[0].total;

    // 获取分页数据
    let sql = `
      SELECT 
        am.id as messgae_id,
        am.*,
        a.app_name,
        a.app_package_name,
        a.app_icon,
        u.*
      FROM app_messages am
      LEFT JOIN applications a ON am.app_id = a.id
      LEFT JOIN users u ON am.user_id = u.id
      WHERE 1=1
    `;

    if (app_name) {
      sql += `AND a.app_name LIKE '%${app_name}%' `;
    }
    if (app_package_name) {
      sql += `AND a.app_package_name LIKE '%${app_package_name}%' `;
    }
    if (message_text) {
      sql += `AND am.message_text LIKE '%${message_text}%' `;
    }
    if (nickname) {
      sql += `AND u.nickname LIKE '%${nickname}%' `;
    }

    sql += ` ORDER BY am.created_at DESC LIMIT ? OFFSET ?`
    const messages = await query(sql, [pageSize, offset]);
    
    res.json({
      message: "查询成功",
      data: {
        messages: messages,
        pagination: {
          total,
          totalPages: Math.ceil(total / pageSize),
          currentPage: page,
          pageSize
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: "获取留言列表失败", 
      details: error.message 
    });
  }
});

// 获取用户上传的应用程序下的所有留言
router.post("/my-app-messages", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.body.page) || 1;
    const pageSize = parseInt(req.body.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // 第一步：获取用户上传的应用程序ID列表
    const appIdsSql = "SELECT id FROM applications WHERE user_id = ?";
    const appIdsResult = await query(appIdsSql, [userId]);
    const appIds = appIdsResult.map(app => app.id);

    if (appIds.length === 0) {
      return res.json({
        message: "没有找到用户上传的应用程序",
        data: {
          messages: [],
          pagination: {
            total: 0,
            totalPages: 0,
            currentPage: page,
            pageSize
          }
        }
      });
    }

    // 获取总记录数
    const countSql = `
      SELECT COUNT(*) as total 
      FROM app_messages am
      WHERE am.app_id IN (?)
    `;
    const placeholders = appIds.join(',');
   
    const countResult = await query(countSql, [placeholders]);
    const total = countResult[0].total;
   
   
    // 获取分页数据
    const sql = `
      SELECT 
        am.*,
        u.*,
        a.app_name,
        a.app_package_name,
        a.app_icon
      FROM app_messages am
      LEFT JOIN applications a ON am.app_id = a.id
      LEFT JOIN users u ON am.user_id = u.id
      WHERE am.app_id IN (?)
      ORDER BY am.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const messages = await query(sql, [placeholders, pageSize, offset]);

    res.json({
      message: "查询成功",
      data: {
        messages: messages,
        pagination: {
          total,
          totalPages: Math.ceil(total / pageSize),
          currentPage: page,
          pageSize
        }
      }
    });
  } catch (error) {
    console.error(error); // 记录服务器端错误日志
    res.status(500).json({ 
      error: "获取留言列表失败", 
      details: error.message 
    });
  }
});

// 获取应用的所有留言
router.post("/app-messages/:appId", authenticateToken, async (req, res) => {
  try {
    const appId = req.params.appId;
    const page = parseInt(req.body.page) || 1;
    const pageSize = parseInt(req.body.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // 检查应用是否存在
    const checkAppSql = "SELECT id FROM applications WHERE id = ?";
    const appExists = await query(checkAppSql, [appId]);
    
    if (appExists.length === 0) {
      return res.status(404).json({ error: "应用不存在" });
    }

    // 获取总记录数
    const countSql = "SELECT COUNT(*) as total FROM app_messages WHERE app_id = ?";
    const countResult = await query(countSql, [appId]);
    const total = countResult[0].total;

    // 获取分页数据
    const sql = `
      SELECT 
        am.*,
        u.username,
        u.nickname,
        u.avatar
      FROM app_messages am
      LEFT JOIN users u ON am.user_id = u.id
      WHERE am.app_id = ?
      ORDER BY am.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const messages = await query(sql, [appId, pageSize, offset]);

    res.json({
      message: "查询成功",
      data: {
        messages: messages,
        pagination: {
          total,
          totalPages: Math.ceil(total / pageSize),
          currentPage: page,
          pageSize
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: "获取应用留言列表失败", 
      details: error.message 
    });
  }
});

// 删除留言
router.post("/delete-message", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.body;
    const user_id = req.user.id;

    if (!id) {
      return res.status(400).json({ error: "留言ID是必需的" });
    }

    // 检查留言是否存在且属于当前用户
    const checkSql = "SELECT user_id FROM app_messages WHERE id = ?";
    const checkResult = await query(checkSql, [id]);
    
    if (checkResult.length === 0) {
      return res.status(404).json({ error: "留言不存在" });
    }

    // 检查是否是留言作者
    if (checkResult[0].user_id !== user_id) {
      return res.status(403).json({ error: "没有权限删除此留言" });
    }

    const sql = "DELETE FROM app_messages WHERE id = ? AND user_id = ?";
    const result = await deleteData(sql, [id, user_id]);
    
    if (result === 0) {
      return res.status(404).json({ error: "留言不存在或删除失败" });
    }
    
    res.json({ message: "留言删除成功" });
  } catch (error) {
    res.status(500).json({ 
      error: "删除留言失败", 
      details: error.message 
    });
  }
});

// 更新留言
router.post("/update-message", authenticateAdmin, async (req, res) => {
  try {
    const { id, message_text } = req.body;
    const user_id = req.user.id;

    if (!id || !message_text) {
      return res.status(400).json({ error: "留言ID和新内容是必需的" });
    }

    // 检查留言是否存在且属于当前用户
    const checkSql = "SELECT user_id FROM app_messages WHERE id = ?";
    const checkResult = await query(checkSql, [id]);
    
    if (checkResult.length === 0) {
      return res.status(404).json({ error: "留言不存在" });
    }

    // 检查是否是留言作者
    if (checkResult[0].user_id !== user_id) {
      return res.status(403).json({ error: "没有权限修改此留言" });
    }

    const sql = "UPDATE app_messages SET message_text = ? WHERE id = ? AND user_id = ?";
    const result = await update(sql, [message_text, id, user_id]);
    
    if (result === 0) {
      return res.status(404).json({ error: "留言不存在或更新失败" });
    }
    
    res.json({ 
      message: "留言更新成功",
      data: {
        id,
        message_text
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: "更新留言失败", 
      details: error.message 
    });
  }
});

// 发送应用留言
router.post("/admin/app-message/create", authenticateAdmin, async (req, res) => {
  try {
    const { app_package_name, app_name, message_text } = req.body;
    const user_id = req.user.id;

    const getAppIdSql = "SELECT id FROM applications WHERE package_name = ? and app_name = ?";
    const appIds = await query(getAppIdSql, [app_package_name, app_name]);
    if (appIds.length === 0) {
      return res.status(404).json({ error: "应用不存在" });
    }

    const appId = appIds[0];

    if (!appId || !message_text) {
      return res.status(400).json({ error: "应用ID和留言内容是必需的" });
    }

    const sql = `
      INSERT INTO app_messages 
      (app_id, user_id, message_text) 
      VALUES (?, ?, ?)
    `;
    
    const messageId = await insert(sql, [app_id, user_id, message_text]);
    
    res.json({
      message: "留言发送成功",
      data: {
        id: messageId,
        app_id,
        user_id,
        message_text,
        created_at: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: "发送留言失败", 
      details: error.message 
    });
  }
});

module.exports = router; 