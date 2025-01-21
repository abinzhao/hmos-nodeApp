const express = require("express");
const router = express.Router();
const { query, insert, update } = require("../mysqlService/mysqlService");
const { authenticateToken, generateToken, authenticateAdmin } = require("../middleware/auth");

// 用户登录接口
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码是必需的" });
    }
    const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
    const results = await query(sql, [username, password]);
    if (results.length > 0) {
      const user = results[0];
      // 生成 token
      const token = generateToken(user);
      // 返回用户信息和 token
      res.json({ 
        message: "登录成功", 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          user_role: user.user_role
        },
        token 
      });
    } else {
      res.status(401).json({ error: "用户名或密码错误" });
    }
  } catch (error) {
    res.status(500).json({ error: "登录时出现错误", details: error.message });
  }
});

// 用户注册接口
router.post("/register", async (req, res) => {
  try {
    const { username, password, email, nickname, avatar, user_role } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ error: "用户名、密码和邮箱是必需的" });
    }
    const checkSql = "SELECT * FROM users WHERE username =?";
    const existingUser = await query(checkSql, [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "用户名已存在" });
    }
    const insertSql =
      "INSERT INTO users (username, password, email, nickname, avatar, user_role) VALUES (?,?,?,?,?, ?)";
    const result = await insert(insertSql, [username, password, email, nickname, avatar, user_role || 'user']);
    res.json({ message: "注册成功", userId: result });
  } catch (error) {
    res.status(500).json({ error: "注册时出现错误", details: error.message });
  }
});

// 用户信息查询接口
router.get("/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const sql = "SELECT * FROM users WHERE id =?";
    const results = await query(sql, [userId]);
    if (results.length > 0) {
      res.json({ user: results[0] });
    } else {
      res.status(404).json({ error: "用户未找到" });
    }
  } catch (error) {
    res.status(500).json({ error: "查询用户信息时出现错误", details: error.message });
  }
});

// 用户信息更新接口
router.post("/user/update", authenticateToken, async (req, res) => {
  try {
    // 使用 token 中的用户 ID，而不是从请求体中获取
    const userId = req.user.id;
    const { username, email, nickname, avatar } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "用户ID是必需的" });
    }
    let updateSql = "UPDATE users SET ";
    let updateValues = [];
    let updateParts = [];
    
    if (email) {
      updateParts.push("email =?");
      updateValues.push(email);
    }
    if (nickname) {
      updateParts.push("nickname =?");
      updateValues.push(nickname);
    }
    if (avatar) {
      updateParts.push("avatar =?");
      updateValues.push(avatar);
    }
    if (updateParts.length === 0) {
      return res.status(400).json({ error: "至少需要提供一个字段进行更新" });
    }
    updateSql += updateParts.join(",");
    updateSql += " WHERE id =?";
    updateValues.push(userId);
    const result = await update(updateSql, updateValues);
    if (result > 0) {
      res.json({ message: "用户信息更新成功" });
    } else {
      res.status(404).json({ error: "用户未找到或未更新" });
    }
  } catch (error) {
    res.status(500).json({ error: "更新用户信息时出现错误", details: error.message });
  }
});

// 重置密码接口
router.post("/reset-pwd", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "旧密码和新密码都是必需的" });
    }

    // 先验证旧密码
    const checkSql = "SELECT * FROM users WHERE id = ? AND password = ?";
    const checkResult = await query(checkSql, [userId, oldPassword]);
    
    if (checkResult.length === 0) {
      return res.status(401).json({ error: "旧密码错误" });
    }

    const sql = "UPDATE users SET password = ? WHERE id = ?";
    const result = await update(sql, [newPassword, userId]);
    
    if (result > 0) {
      res.json({ message: "密码重置成功" });
    } else {
      res.status(404).json({ error: "密码未重置" });
    }
  } catch (error) {
    res.status(500).json({ error: "重置密码时出现错误", details: error.message });
  }
});

// 获取当前登录用户信息的接口
router.get("/current-user", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const sql = "SELECT id, username, email, nickname, avatar, user_role, created_at FROM users WHERE id = ?";
    const results = await query(sql, [userId]);
    
    if (results.length > 0) {
      res.json({ user: results[0] });
    } else {
      res.status(404).json({ error: "用户未找到" });
    }
  } catch (error) {
    res.status(500).json({ error: "获取用户信息时出现错误", details: error.message });
  }
});

// 管理员查询用户列表（带分页）
router.post("/admin/users", authenticateAdmin, async (req, res) => {
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

    // 构建搜索条件
    let whereClause = '';
    let searchParams = [];
    if (search && role) {
      whereClause = `WHERE username LIKE ? OR email LIKE ? OR nickname LIKE ? and user_role=?`;
      searchParams = [`%${search}%`, `%${search}%`, `%${search}%`, `%${role}%`];
    } else if (search) {
      whereClause = `WHERE username LIKE ? OR email LIKE ? OR nickname LIKE ?`;
      searchParams = [`%${search}%`, `%${search}%`, `%${search}%`]; 
    } else if (role) {
      whereClause = `WHERE user_role=?`;
      searchParams = [role];
    }

    // 获取总记录数
    const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await query(countSql, searchParams);
    const total = countResult[0].total;

    // 获取分页数据
    const sql = `SELECT id, nickname, username, email, avatar, user_role, created_at FROM users ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;

    const results = await query(sql, [...searchParams, pageSize, offset]);

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    res.json({
      message: "查询成功",
      data: {
        users: results,
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

router.post("/admin/user/update", authenticateAdmin, async (req, res) => {
  try {
    // 检查是否提供了用户ID，并且该ID不是空值
    const userId = req.body.id;
    if (!userId) {
      return res.status(400).json({ error: "用户ID是必需的" });
    }
    // 提取需要更新的字段
    const { username, email, nickname, avatar } = req.body;

    let updateSql = "UPDATE users SET";
    let updateValues = [];
    let updateParts = [];

    // 构建SQL语句和参数列表
    if (username !== undefined) {
      updateParts.push("username =?");
      updateValues.push(username);
    }
    if (email !== undefined) {
      updateParts.push("email =?");
      updateValues.push(email);
    }
    if (nickname !== undefined) {
      updateParts.push("nickname =?");
      updateValues.push(nickname);
    }
    if (avatar !== undefined) {
      updateParts.push("avatar =?");
      updateValues.push(avatar);
    }

    // 如果没有提供任何更新字段，则返回错误
    if (updateParts.length === 0) {
      return res.status(400).json({ error: "至少需要提供一个字段进行更新" });
    }

    // 完成SQL语句构建，并添加WHERE子句来指定要更新的用户
    updateSql += ` ${updateParts.join(",")} WHERE id =?`;
    updateValues.push(userId);

    // 执行数据库更新操作
    const result = await update(updateSql, updateValues);

    // 根据影响行数判断更新是否成功
    if (result > 0) {
      res.json({ message: "用户信息更新成功" });
    } else {
      res.status(404).json({ error: "用户未找到或未更新" });
    }
  } catch (error) {
    console.error(error); // 记录服务器端错误日志
    res.status(500).json({ error: "更新用户信息时出现错误", details: error.message });
  }
});

// 管理员删除用户接口
router.post("/admin/user/delete", authenticateAdmin, async (req, res) => {
  try {
    const userId = req.body.id;;
    // 防止删除自己
    if (userId === req.user.id) {
      return res.status(400).json({ error: "不能删除当前登录的管理员账号" });
    }

    const sql = "DELETE FROM users WHERE id = ?";
    const result = await query(sql, [userId]);

    if (result.affectedRows > 0) {
      res.json({ message: "用户删除成功" });
    } else {
      res.status(404).json({ error: "用户不存在" });
    }
  } catch (error) {
    res.status(500).json({ 
      error: "删除用户时出现错误", 
      details: error.message 
    });
  }
});

// 管理员修改用户状态接口
router.patch("/admin/users/:userId/status", authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { status } = req.body; // status 可以是 'active' 或 'disabled'

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: "无效的状态值" });
    }

    // 防止修改自己的状态
    if (userId === req.user.id) {
      return res.status(400).json({ error: "不能修改当前登录的管理员账号状态" });
    }

    const sql = "UPDATE users SET status = ? WHERE id = ?";
    const result = await query(sql, [status, userId]);

    if (result.affectedRows > 0) {
      res.json({ message: "用户状态更新成功" });
    } else {
      res.status(404).json({ error: "用户不存在" });
    }
  } catch (error) {
    res.status(500).json({ 
      error: "更新用户状态时出现错误", 
      details: error.message 
    });
  }
});

module.exports = router;
