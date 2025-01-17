const express = require("express");
const router = express.Router();
const { query, insert, update } = require("../mysqlService/mysqlService");

// 用户登录接口
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码是必需的" });
    }
    const sql = "SELECT * FROM users WHERE username =? AND password =?";
    const results = await query(sql, [username, password]);
    if (results.length > 0) {
      res.json({ message: "登录成功", user: results[0] });
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
    const { username, password, email, nickname, avatar } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ error: "用户名、密码和邮箱是必需的" });
    }
    const checkSql = "SELECT * FROM users WHERE username =?";
    const existingUser = await query(checkSql, [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "用户名已存在" });
    }
    const insertSql =
      "INSERT INTO users (username, password, email, nickname, avatar) VALUES (?,?,?,?,?)";
    const result = await insert(insertSql, [username, password, email, nickname, avatar]);
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
router.post("/user/update", async (req, res) => {
  try {
    const { userId, username, email, nickname, avatar } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "用户ID是必需的" });
    }
    let updateSql = "UPDATE users SET";
    let updateValues = [];
    let updateParts = [];
    if (username) {
      updateParts.push("username =?");
      updateValues.push(username);
    }
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
router.post("/reset-pwd", async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ error: "用户ID和新密码是必需的" });
    }
    const sql = "UPDATE users SET password =? WHERE id =?";
    const result = await update(sql, [password, userId]);
    if (result > 0) {
      res.json({ message: "密码重置成功" });
    } else {
      res.status(404).json({ error: "用户未找到或密码未重置" });
    }
  } catch (error) {
    res.status(500).json({ error: "重置密码时出现错误", details: error.message });
  }
});

module.exports = router;
