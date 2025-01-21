const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { query, insert, update } = require("../mysqlService/mysqlService");
const { authenticateToken, authenticateAdmin } = require("../middleware/auth");
const { v4: uuidv4 } = require('uuid'); // 引入uuid v4生成器

function generateUniqueFileName(file) {
  const datePart = new Date().toISOString().replace(/[:\-T]/g, '').split('.')[0]; // 获取当前时间的ISO字符串，并移除特殊字符
  const uuidPart = uuidv4(); // 生成UUID
  const originalNamePart = file.originalname.split('.').slice(0, -1).join('.'); // 移除扩展名后的原始文件名
  const extensionPart = file.originalname.split('.').pop(); // 文件扩展名
  
  return `${datePart}_${uuidPart}_${originalNamePart}.${extensionPart}`; // 组合新的文件名
}

// 配置 Multer 存储引擎
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { packageName, type } = req.body;
    let destinationPath = "";

    // 根据文件类型创建不同的目录
    if (type === "icon") {
      destinationPath = path.join("uploads", "icon", packageName);
    } else if (type === "file") {
      destinationPath = path.join("uploads", "file", packageName);
    } else if (type === "screenshot") {
      destinationPath = path.join("uploads", "screenshot", packageName);
    } else {
      destinationPath = path.join("uploads", packageName);
    }
    // 创建存储目录（如果不存在）
    if (!fs.existsSync(destinationPath)) {
      console.log("创建目录：" + destinationPath);
      fs.mkdirSync(destinationPath, { recursive: true });
    }
    cb(null, destinationPath);
  },
  filename: function (req, file, cb) {
    const uniqueFileName = generateUniqueFileName(file);
    cb(null, uniqueFileName);
  },
});

const upload = multer({ storage: storage });

// 文件上传接口
router.post("/upload", upload.single("file"), async (req, res) => {
  try {

    const { packageName, type } = req.body;
    const file = req.file;
    if (!packageName || !type || !file) {
      return res.status(400).json({ error: "软件包名、类型和文件是必需的" });
    }
    if (type === "icon" || type === "file" || type === "screenshot") {
      // 删除原有的对应类型文件夹
      const folderPath = path.join("uploads", type, packageName);
      if (!fs.existsSync(folderPath)) {
        console.log("创建目录：" + folderPath);
        fs.mkdirSync(folderPath, { recursive: true });
      }
    }
    
    let externalLink = `uploads/${type}/${packageName}/${file.filename}`;

    if (type === "file") {
      externalLink = `download/${type}/${packageName}/${file.filename}`;
    }
    
    /*filePath = path.join("uploads", packageName, type, file.originalname);
    const externalLink = `http://127.0.0.1/${path.relative(__dirname, filePath)}`;*/
    res.json({ message: "文件上传成功", link: externalLink });
  } catch (error) {
    res.status(500).json({ error: "文件上传时出现错误", details: error.message });
  }
});

// 文件下载接口
router.get("/download/:id/:type/:packageName/:filename", authenticateToken, async (req, res) => {
  try {
    const { packageName, type, filename, id } = req.params;
    // 根据包名和文件名查找上架状态
    let sql = "SELECT * FROM applications WHERE id=?"
    const result = await query(sql, [id]);


    if (result.length < 1) {
      return res.status(404).json({ error: "文件不存在" });
    }

    // 如果非管理员，只能够下载自己的或者上架的
    ;
    const role = req.user.user_role;
    const userId = req.user.id;
    if (role !== "admin") {
      if (result[0].applications_status !== 3 || result[0].user_id !== userId) {
        return res.status(403).json({ error: "无权限下载" });
      }
    } else {
      
    }
    let app_file_url = result[0].app_file_url;
    const app_file_url_split = app_file_url.split('/');
    const filePath = path.join("uploads", app_file_url_split[1], app_file_url_split[2], app_file_url_split[3]);
    if (fs.existsSync(filePath)) {
      let updateSql = "UPDATE applications SET install_count=install_count+1 where id=?";
      const result = await update(updateSql, [id]);
      
        if (result > 0) {
          console.log("用户信息更新成功")
        } else {
          console.error("用户信息更新失败");
        }
 
      res.download(filePath);
    } else {
      res.status(404).json({ error: "文件未找到" });
    }
  } catch (error) {
    res.status(500).json({ error: "文件下载时出现错误", details: error.message });
  }
});

module.exports = router;