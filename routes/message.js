const express = require("express");
const router = express.Router();
const { query, insert, update, deleteData } = require("../mysqlService/mysqlService");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");

// 定义常量
const DEFAULT_PAGE_SIZE = 10;
const SQL_WHERE_CLAUSE = 'WHERE 1=1 ';
const SQL_ORDER_LIMIT_CLAUSE = 'ORDER BY sm.created_at DESC LIMIT ? OFFSET ? ';

/**
 * 创建系统消息的处理函数
 */
async function createSystemMessage(req, res) {
  const { message_text } = req.body;
  const userId = req.user && req.user.id;

  // 输入验证
  if (!message_text) {
    return res.status(400).json({ error: "消息内容是必需的" });
  }

  try {
    const messageId = await insert('INSERT INTO system_messages (message_text, user_id) VALUES (?, ?)', [message_text, userId]);
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
    console.error('创建系统消息时发生错误:', error);
    res.status(500).json({ error: "创建系统消息失败", details: error.message });
  }
}

/**
 * 获取系统消息列表（带分页和用户信息）
 */
async function getSystemMessagesList(req, res) {
  const page = parseInt(req.body.page) || 1;
  const pageSize = parseInt(req.body.pageSize) || DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * pageSize;
  const keyword = req.body.keyword || {};

  const conditions = [];
  const params = [];

  if (keyword.username) conditions.push(`AND u.username LIKE ? `), params.push(`%${keyword.username}%`);
  if (keyword.nickname) conditions.push(`AND u.nickname LIKE ? `), params.push(`%${keyword.nickname}%`);
  if (keyword.message_text) conditions.push(`AND sm.message_text LIKE ? `), params.push(`%${keyword.message_text}%`);

  try {
    const countSql = `SELECT COUNT(*) as total FROM system_messages sm LEFT JOIN users u ON sm.user_id = u.id ${conditions.join('')}`;
    const countResult = await query(countSql, params);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / pageSize);

    const messages = await buildAndExecuteQuery(
      `SELECT sm.*, u.username, u.nickname, u.avatar, u.user_role FROM system_messages sm LEFT JOIN users u ON sm.user_id = u.id `,
      conditions,
      params,
      [pageSize, offset]
    );

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
      message: '查询成功',
      data: {
        sysMessage: formattedMessages,
        pagination: {
          total,
          totalPages,
          currentPage: page,
          pageSize,
        }
      }
    });
  } catch (error) {
    console.error('获取系统消息列表时发生错误:', error);
    res.status(500).json({ error: "获取系统消息列表失败", details: error.message });
  }
}

/**
 * 获取单个系统消息详情
 */
async function getSystemMessageById(req, res) {
  const messageId = req.params.id;

  try {
    const results = await query(`
      SELECT sm.*, u.username, u.nickname, u.avatar, u.user_role 
      FROM system_messages sm 
      LEFT JOIN users u ON sm.user_id = u.id 
      WHERE sm.id = ?
    `, [messageId]);

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
    console.error('获取系统消息详情时发生错误:', error);
    res.status(500).json({ error: "获取系统消息详情失败", details: error.message });
  }
}

/**
 * 更新系统消息
 */
async function updateSystemMessage(req, res) {
  const { id, message_text } = req.body;

  // 输入验证
  if (!id || !message_text) {
    return res.status(400).json({ error: "需要提供消息ID和内容" });
  }

  try {
    const result = await update('UPDATE system_messages SET message_text = ? WHERE id = ?', [message_text, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "消息不存在" });
    }

    res.json({
      message: "系统消息更新成功",
      data: {
        id,
        message_text
      }
    });
  } catch (error) {
    console.error('更新系统消息时发生错误:', error);
    res.status(500).json({ error: "更新系统消息失败", details: error.message });
  }
}

/**
 * 删除系统消息
 */
async function deleteSystemMessageById(req, res) {
  const messageId = req.params.id;

  try {
    const result = await deleteData('DELETE FROM system_messages WHERE id = ?', [messageId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "消息不存在" });
    }

    res.json({ message: "系统消息删除成功" });
  } catch (error) {
    console.error('删除系统消息时发生错误:', error);
    res.status(500).json({ error: "删除系统消息失败", details: error.message });
  }
}

/**
 * 批量删除系统消息
 */
async function batchDeleteSystemMessages(req, res) {
  const { ids } = req.body;

  // 输入验证
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "需要提供要删除的消息ID数组" });
  }

  try {
    const result = await deleteData('DELETE FROM system_messages WHERE id IN (?)', [ids]);

    res.json({
      message: "批量删除成功",
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('批量删除系统消息时发生错误:', error);
    res.status(500).json({ error: "批量删除系统消息失败", details: error.message });
  }
}

/**
 * 构建SQL语句并执行查询
 */
function buildAndExecuteQuery(baseSql, conditions, params, limitOffset) {
  let sql = baseSql + conditions.join('') + (limitOffset ? SQL_ORDER_LIMIT_CLAUSE : '');
  return query(sql, [...params, ...(limitOffset || [])]);
}

// 将所有处理器函数绑定到路由上
router.post("/system-message", authenticateAdmin, createSystemMessage);
router.post("/system-messages", authenticateToken, getSystemMessagesList);
router.get("/system-message/:id", authenticateToken, getSystemMessageById);
router.post("/system-message/update", authenticateAdmin, updateSystemMessage);
router.delete("/system-message/:id", authenticateAdmin, deleteSystemMessageById);
router.post("/system-messages/batch-delete", authenticateAdmin, batchDeleteSystemMessages);

module.exports = router;