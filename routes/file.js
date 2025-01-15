const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { createReadStream } = require("fs");
const { pipeline } = require("stream");

// 存储文件的目录
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../public/uploads");
    // 确保存储目录存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// 配置 multer 中间件
const upload = multer({ storage: storage });

// 文件上传接口
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "没有文件上传" });
    }
    // 生成文件的相对路径
    const relativePath = path.relative(__dirname, req.file.path);
    // 这里使用相对路径，确保网页可以正常访问
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ message: "文件上传成功", url: fileUrl });
  } catch (error) {
    res.status(500).json({ error: "文件上传时出现错误", details: error.message });
  }
});

// 文件下载接口
router.get("/download/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, "../public/uploads", filename);
    const fileSize = fs.statSync(filePath).size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = createReadStream(filePath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": "application/octet-stream",
      };
      res.writeHead(206, head);
      let sentBytes = 0;
      file.on("data", (chunk) => {
        sentBytes += chunk.length;
        const progress = ((sentBytes / chunksize) * 100).toFixed(2);
        res.write(`data: ${progress}%\n\n`);
      });
      pipeline(file, res, (err) => {
        if (err) {
          console.error("文件下载出错:", err);
          res.status(500).send("文件下载出错");
        }
      });
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": "application/octet-stream",
      };
      res.writeHead(200, head);
      let sentBytes = 0;
      const file = createReadStream(filePath);
      file.on("data", (chunk) => {
        sentBytes += chunk.length;
        const progress = ((sentBytes / fileSize) * 100).toFixed(2);
        // res.write(`data: ${progress}%\n\n`);
        res.json({ data: progress });
      });
      pipeline(file, res, (err) => {
        if (err) {
          console.error("文件下载出错:", err);
          res.status(500).send("文件下载出错");
        }
      });
    }
  } catch (error) {
    res.status(404).json({ error: "文件未找到或下载时出现错误", details: error.message });
  }
});

module.exports = router;
