const net = require("net");
const { exec } = require("child_process");
const logger = require("winston");

class TcpService {
  constructor() {
    this.server = null;
  }

  start() {
    this.server = net.createServer((socket) => {
      const remoteAddress = `${socket.remoteAddress}:${socket.remotePort}`;
      logger.info(`有客户端连接到服务器: ${remoteAddress}`);

      socket.on("data", async (data) => {
        try {
          const command = data.toString().trim();
          logger.info(`收到客户端发送的调试命令: ${command} from ${remoteAddress}`);

          let response;
          response = await this.execCommand(command);

          socket.write(JSON.stringify(response));
        } catch (err) {
          logger.error(`处理命令时出错: ${err.message}`);
          socket.write(JSON.stringify({ error: err.message }));
        }
      });

      socket.on("end", () => {
        logger.info(`客户端连接已关闭: ${remoteAddress}`);
      });

      socket.on("error", (err) => {
        logger.error(`与客户端连接出现错误: ${err.message}`);
      });
    });

    this.server.listen(process.env.SERVER_PORT, "0.0.0.0", () => {
      logger.info(`TCP服务器运行在 ${process.env.SERVER_IP}:${process.env.SERVER_PORT}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        logger.info("TCP服务器已停止");
      });
    }
  }

  // 执行Shell命令的方法
  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          logger.error(`执行失败: ${error.message}`);
          return reject({ error: error.message, stderr });
        }
        logger.info(`执行成功: ${stdout}`);
        resolve({ stdout, stderr });
      });
    });
  }
}

// 创建单例模式实例
TcpService.getInstance = (() => {
  let instance;
  return () => {
    if (!instance) {
      instance = new TcpService();
    }
    return instance;
  };
})();

module.exports = TcpService;
