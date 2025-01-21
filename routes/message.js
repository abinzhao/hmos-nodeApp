const express = require("express");
const router = express.Router();
const { query, insert, update, deleteData } = require("../mysqlService/mysqlService");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");

// 创建系统消息
router.post("/system-message", authenticateAdmin, async (req, res) => {
  try {
    const { message_text } = req.body;
    const userId = req.user.id;

    if (!message_text) {
      return res.status(400).json({ error: "消息内容是必需的" });
    }

    const sql = `
      INSERT INTO system_messages 
      (message_text, user_id) 
      VALUES (?, ?)
    `;

    const messageId = await insert(sql, [message_text, userId || null]);

    res.json({
      message: "系统消息创建成功",
      data: {
        id: messageId,
        message_text,
        user_id: userId,
        created_at: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: "创建系统消息失败",
      details: error.message
    });
  }
});

// 获取系统消息列表（带分页和用户信息）
router.post("/system-messages", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.body.page) || 1;
    const pageSize = parseInt(req.body.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const keyword = req.body.keyword

    const username = keyword?.username || '';
    const nickname = keyword?.nickname || '';
    const message_text = keyword?.message_text || '';

    // 获取总记录数
    let countSql = `
      SELECT 
        count(*) as total
      FROM system_messages sm
      LEFT JOIN users u ON sm.user_id = u.id
      where 1=1
    `;
    if (username) {
      countSql += `AND u.username LIKE '%${username}%' `;
    }
    if (nickname) {
      countSql += `AND u.nickname LIKE '%${nickname}%' `;
    }
    if (message_text) {
      countSql += `AND sm.message_text LIKE '%${message_text}%' `;
    }

    const countResult = await query(countSql);
    const total = countResult[0].total;

    // 获取消息列表（包含用户信息）
    let sql = `
      SELECT 
        sm.*,
        u.username,
        u.nickname,
        u.avatar,
        u.user_role
      FROM system_messages sm
      LEFT JOIN users u ON sm.user_id = u.id
      where 1=1
    `;

    if (username) {
      sql += `AND u.username LIKE '%${username}%' `;
    }
    if (nickname) {
      sql += `AND u.nickname LIKE '%${nickname}%' `;
    }
    if (message_text) {
      sql += `AND sm.message_text LIKE '%${message_text}%' `;
    }

    sql += `ORDER BY sm.created_at DESC LIMIT ? OFFSET ?`

    const messages = await query(sql, [pageSize, offset]);
    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);
    // 处理结果，整理数据结构
    const formattedMessages = messages.map(message => ({
      id: message.id,
      message_text: message.message_text,
      created_at: message.created_at,
      user_id: message.user_id,
      username: message.username,
      nickname: message.nickname,
      avatar: message.avatar,
      user_role: message.user_role
    }));

    res.json({
      messages: '查询成功',
      data: {
        sysMessage: formattedMessages,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          pageSize,
        },
      }
    });
  } catch (error) {
    res.status(500).json({
      error: "获取系统消息列表失败",
      details: error.message
    });
  }
});

// 获取单个系统消息详情
router.get("/system-message/:id", authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;

    const sql = `
      SELECT 
        sm.*,
        u.username,
        u.nickname,
        u.avatar,
        u.user_role
      FROM system_messages sm
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE sm.id = ?
    `;

    const results = await query(sql, [messageId]);

    if (results.length === 0) {
      return res.status(404).json({ error: "消息不存在" });
    }

    const message = results[0];

    res.json({
      message: {
        id: message.id,
        message_text: message.message_text,
        created_at: message.created_at,
        user: message.user_id ? {
          id: message.user_id,
          username: message.username,
          nickname: message.nickname,
          avatar: message.avatar,
          user_role: message.user_role
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      error: "获取系统消息详情失败",
      details: error.message
    });
  }
});

// 更新系统消息
router.post("/system-message/update", authenticateAdmin, async (req, res) => {
  try {
    const messageId = req.body.id;
    const { message_text } = req.body;

    if (!message_text) {
      return res.status(400).json({ error: "消息内容是必需的" });
    }

    const sql = `
      UPDATE system_messages 
      SET message_text = ?
      WHERE id = ?
    `;

    const result = await update(sql, [message_text, messageId]);

    if (result === 0) {
      return res.status(404).json({ error: "消息不存在" });
    }

    res.json({
      message: "系统消息更新成功",
      data: {
        id: messageId,
        message_text
      }
    });
  } catch (error) {
    res.status(500).json({
      error: "更新系统消息失败",
      details: error.message
    });
  }
});

// 删除系统消息
router.delete("/system-message/:id", authenticateAdmin, async (req, res) => {
  try {
    const messageId = req.params.id;

    const sql = "DELETE FROM system_messages WHERE id = ?";
    const result = await deleteData(sql, [messageId]);

    if (result === 0) {
      return res.status(404).json({ error: "消息不存在" });
    }

    res.json({ message: "系统消息删除成功" });
  } catch (error) {
    res.status(500).json({
      error: "删除系统消息失败",
      details: error.message
    });
  }
});

// 批量删除系统消息
router.post("/system-messages/batch-delete", authenticateAdmin, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "需要提供要删除的消息ID数组" });
    }

    const sql = "DELETE FROM system_messages WHERE id IN (?)";
    const result = await deleteData(sql, [ids]);

    res.json({
      message: "批量删除成功",
      deletedCount: result
    });
  } catch (error) {
    res.status(500).json({
      error: "批量删除系统消息失败",
      details: error.message
    });
  }
});

module.exports = router; 