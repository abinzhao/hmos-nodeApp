const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// 配置 Multer 存储引擎
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { packageName, type } = req.body;
    let destinationPath = "";
    if (type === "icon") {
      destinationPath = path.join("uploads", packageName, "icon");
    } else if (type === "file") {
      destinationPath = path.join("uploads", packageName, "file");
    } else if (type === "appScreenshot") {
      destinationPath = path.join("uploads", packageName, "appScreenshot");
    }
    // 创建存储目录（如果不存在）
    fs.mkdirSync(destinationPath, { recursive: true });
    cb(null, destinationPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
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
    let filePath = "";
    if (type === "icon" || type === "file") {
      // 删除原有的对应类型文件夹
      const folderPath = path.join("uploads", packageName, type);
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true });
      }
    }
    filePath = path.join("uploads", packageName, type, file.originalname);
    const externalLink = `http://your-domain.com/${path.relative(__dirname, filePath)}`;
    res.json({ message: "文件上传成功", link: externalLink });
  } catch (error) {
    res.status(500).json({ error: "文件上传时出现错误", details: error.message });
  }
});

// 文件下载接口
router.get("/download/:packageName/:type/:filename", (req, res) => {
  try {
    const { packageName, type, filename } = req.params;
    const filePath = path.join("uploads", packageName, type, filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: "文件未找到" });
    }
  } catch (error) {
    res.status(500).json({ error: "文件下载时出现错误", details: error.message });
  }
});

module.exports = router;