const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const TcpService = require("./services/tcpService");
const apiRoutes = require("./routes/api");
const fileRoutes = require("./routes/file");
const userRoutes = require("./routes/user");
const cors = require("cors");
const onCreateTables = require("./mysqlService/tables");
const fs = require("fs");

// 创建 uploads 文件夹
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 加载.env 文件
dotenv.config();

// 初始化TCP服务单例
TcpService.getInstance();

// 创建Express应用
const app = express();

// 使用 cors 中间件实现跨域
app.use(cors());

// 中间件
app.use(bodyParser.json());

// 配置静态文件夹
app.use(express.static("public"));

// 数据库
onCreateTables();

// 路由
app.use("/api", apiRoutes);
app.use("/api", fileRoutes);
app.use("/api", userRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(`全局错误处理器捕获错误: ${err.message}`);
  res.status(500).json({ error: "服务器内部错误" });
});

module.exports = app;
