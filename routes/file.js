const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { query, update } = require("../mysqlService/mysqlService");
const { authenticateToken } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid"); // 引入uuid v4生成器

// 配置 Multer 存储引擎
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { packageName, type } = req.body;
    let destinationPath = getDestinationPath(packageName, type);
    createDirectoryIfNotExists(destinationPath);
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
    validateUploadRequest(packageName, type, file);

    const externalLink = constructExternalLink(type, packageName, file.filename);
    res.json({ message: "文件上传成功", link: externalLink });
  } catch (error) {
    console.error("文件上传时出现错误:", error.message);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// 文件下载接口
router.get("/download/:id/:type/:packageName/:filename", authenticateToken, async (req, res) => {
  try {
    const { packageName, type, filename, id } = req.params;
    const application = await findApplicationById(id);
    validateDownloadAccess(req.user, application);

    const filePath = getFilePath(application.app_file_url);
    incrementInstallCount(id);
    sendFileResponse(res, filePath);
  } catch (error) {
    console.error("文件下载时出现错误:", error.message);
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

// 辅助函数
function generateUniqueFileName(file) {
  const datePart = new Date()
    .toISOString()
    .replace(/[:\-T]/g, "")
    .split(".")[0];
  const uuidPart = uuidv4();
  const originalNamePart = path.basename(file.originalname, path.extname(file.originalname));
  const extensionPart = path.extname(file.originalname);
  return `${datePart}_${uuidPart}_${originalNamePart}${extensionPart}`;
}

function getDestinationPath(packageName, type) {
  switch (type) {
    case "icon":
    case "file":
    case "screenshot":
      return path.join("uploads", type, packageName);
    default:
      return path.join("uploads", packageName);
  }
}

function createDirectoryIfNotExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log("创建目录:", dirPath);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function constructExternalLink(type, packageName, filename) {
  return type === "file"
    ? `download/${type}/${packageName}/${filename}`
    : `uploads/${type}/${packageName}/${filename}`;
}

function validateUploadRequest(packageName, type, file) {
  if (!packageName || !type || !file) {
    throw { statusCode: 400, message: "软件包名、类型和文件是必需的" };
  }
}

async function findApplicationById(id) {
  const sql = "SELECT * FROM applications WHERE id=?";
  const result = await query(sql, [id]);
  if (result.length < 1) {
    throw { statusCode: 404, message: "文件不存在" };
  }
  return result[0];
}

function validateDownloadAccess(user, application) {
  if (user.user_role !== "admin") {
    if (application.applications_status !== 3 || application.user_id !== user.id) {
      throw { statusCode: 403, message: "无权限下载" };
    }
  }
}

function getFilePath(appFileUrl) {
  const parts = appFileUrl.split("/");
  return path.join("uploads", parts[1], parts[2], parts[3]);
}

async function incrementInstallCount(id) {
  const updateSql = "UPDATE applications SET install_count=install_count+1 WHERE id=?";
  const result = await update(updateSql, [id]);
  if (result > 0) {
    console.log("用户信息更新成功");
  } else {
    console.error("用户信息更新失败");
  }
}

function sendFileResponse(res, filePath) {
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    throw { statusCode: 404, message: "文件未找到" };
  }
}

module.exports = router;



