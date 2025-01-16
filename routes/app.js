const express = require("express");
const router = express.Router();

// 新增应用数据的接口
router.post("/add-app", async (req, res) => {
  try {
    const {
      app_icon,
      app_name,
      app_package_name,
      app_description,
      app_screenshot,
      app_category,
      app_version,
    } = req.body;
    if (!app_name || !app_package_name) {
      return res.status(400).json({ error: "应用名称和应用包名是必需的" });
    }
    const sql = `
      INSERT INTO applications (app_icon, app_name, app_package_name, app_description, app_screenshot, app_category, app_version)
      VALUES (?,?,?,?,?,?,?)
    `;
    const values = [
      app_icon,
      app_name,
      app_package_name,
      app_description,
      app_screenshot,
      JSON.stringify(app_category),
      app_version,
    ];
    const insertId = await insert(sql, values);
    res.json({ message: "应用数据添加成功", insertId });
  } catch (error) {
    res.status(500).json({ error: "添加应用数据时出现错误", details: error.message });
  }
});

// 更新应用数据的接口
router.post("/update-app", async (req, res) => {
  try {
    const {
      appId,
      app_icon,
      app_name,
      app_package_name,
      app_description,
      app_screenshot,
      app_category,
      app_version,
    } = req.body;
    if (!appId) {
      return res.status(400).json({ error: "应用ID是必需的" });
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
      values.push(JSON.stringify(app_category));
      hasUpdate = true;
    }
    if (app_version) {
      sql += "app_version =?, ";
      values.push(app_version);
      hasUpdate = true;
    }
    if (hasUpdate) {
      sql = sql.slice(0, -2); // 去掉最后的逗号和空格
      sql += " WHERE id =?";
      values.push(appId);
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
router.post("/delete-app", async (req, res) => {
  try {
    const { appId } = req.body;
    if (!appId) {
      return res.status(400).json({ error: "应用ID是必需的" });
    }
    const sql = "DELETE FROM applications WHERE id =?";
    const values = [appId];
    const affectedRows = await deleteData(sql, values);
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
    const { appId } = req.query;
    if (!appId) {
      return res.status(400).json({ error: "应用ID是必需的" });
    }
    const sql = "SELECT * FROM applications WHERE id =?";
    const values = [appId];
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

// 更新安装量的接口
router.post("/update-install-count", async (req, res) => {
  try {
    const { appId, installCount } = req.body;
    if (!appId || installCount === undefined) {
      return res.status(400).json({ error: "应用ID和安装量是必需的" });
    }
    // 先查询当前的安装量
    const querySql = "SELECT install_count FROM applications WHERE id =?";
    const queryValues = [appId];
    const currentInstallCountResult = await query(querySql, queryValues);
    if (currentInstallCountResult.length === 0) {
      return res.status(404).json({ error: "应用未找到" });
    }
    const currentInstallCount = currentInstallCountResult[0].install_count;
    // 计算新的安装量，将当前安装量和传入的安装量相加
    const newInstallCount = currentInstallCount + installCount;
    const sql = "UPDATE applications SET install_count =? WHERE id =?";
    const values = [newInstallCount, appId];
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
    const { appId } = req.query;
    if (!appId) {
      return res.status(400).json({ error: "应用ID是必需的" });
    }
    const sql = "SELECT install_count FROM applications WHERE id =?";
    const values = [appId];
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

module.exports = router;
