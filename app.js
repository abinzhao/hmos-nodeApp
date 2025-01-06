const express = require("express");
const bodyParser = require("body-parser");
const logger = require("winston");
const dotenv = require("dotenv");
const TcpService = require("./services/tcpService");
const apiRoutes = require("./routes/api");

// 加载.env 文件
dotenv.config();

// 初始化TCP服务单例
TcpService.getInstance();

// 创建Express应用
const app = express();

// 中间件
app.use(bodyParser.json());

// 配置静态文件夹
app.use(express.static("public"));

// 路由
app.use("/api", apiRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(chalk.red(`全局错误处理器捕获错误: ${err.message}`));
  res.status(500).json({ error: "服务器内部错误" });
});

module.exports = app;
