const net = require("net");
const { exec } = require("child_process");

// 定义允许执行的调试命令白名单
// 暂时不开启该功能
const ALLOWED_COMMANDS = [
    "hdc install", // 示例命令，替换为实际的调试命令
    "command2",
    // 可以添加更多允许的命令
];

class TcpService {
  constructor() {
    this.server = null;
  }

  start() {
    this.server = net.createServer((socket) => {
      const remoteAddress = `${socket.remoteAddress}:${socket.remotePort}`;
      console.log(`有客户端连接到服务器: ${remoteAddress}`);

      socket.on("data", async (data) => {
        try {
          const command = data.toString().trim();
          console.log(`收到客户端发送的调试命令: ${command} from ${remoteAddress}`);
          // if (!ALLOWED_COMMANDS.includes(command)) {
          //   console.error(`不允许执行的命令: ${command}`);
          //   socket.write(JSON.stringify({ error: "命令不被允许" }));
          //   return;
          // }

          let response;
          response = await this.execCommand(command);

          socket.write(JSON.stringify(response));
        } catch (err) {
          console.error(`处理命令时出错: ${err.message}`);
          socket.write(JSON.stringify({ error: err.message }));
        }
      });

      socket.on("end", () => {
        console.log(`客户端连接已关闭: ${remoteAddress}`);
      });

      socket.on("error", (err) => {
        console.error(`与客户端连接出现错误: ${err.message}`);
      });
    });

    const port = process.env.SERVER_PORT || 17001; // 设置默认端口，可根据实际调整
    const ip = process.env.SERVER_IP || "0.0.0.0";
    this.server
      .listen(port, ip, () => {
        console.log(`TCP服务器运行在 ${ip}:${port}`);
      })
      .on("error", (err) => {
        console.error(`服务器启动出错，端口可能被占用等原因: ${err.message}`);
      });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log("TCP服务器已停止");
      });
    }
  }

  // 执行Shell命令的方法
  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`执行失败: ${error.message}`);
          return reject({ error: error.message, stderr });
        }
        console.log(`执行成功: ${stdout}`);
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