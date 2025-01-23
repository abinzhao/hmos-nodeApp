const net = require('net');
const { exec } = require('child_process');
const os = require('os');

class TcpService {
  constructor() {
    this.server = null;
  }

  start() {
    this.server = net.createServer(socket => {
      const remoteAddress = `${socket.remoteAddress}:${socket.remotePort}`;
      console.log(`有客户端连接到服务器: ${remoteAddress}`);

      socket.on('data', async data => {
        try {
          const commandParts = data.toString().trim().split(' ');
          const command = commandParts[0];
          const packageNameOrPath = commandParts[1];
          console.log(`收到客户端发送的调试命令: ${command} from ${remoteAddress}`);

          let response;
          if (command === 'hdc install') {
            const checkConnection = await this.execCommand('hdc list targets');
            if (checkConnection.stdout.includes('device')) {
              response = await this.execCommand(`hdc install ${packageNameOrPath}`);
            } else {
              response = {
                success: false,
                errorCode: 1,
                errorMessage: '设备未连接，请确保设备已连接',
              };
            }
          } else if (command === 'hdc uninstall') {
            const checkConnection = await this.execCommand('hdc list targets');
            if (checkConnection.stdout.includes('device')) {
              response = await this.execCommand(`hdc uninstall ${packageNameOrPath}`);
            } else {
              response = {
                success: false,
                errorCode: 1,
                errorMessage: '设备未连接，请确保设备已连接',
              };
            }
          } else {
            response = {
              success: false,
              errorCode: 2,
              errorMessage: '不支持的命令',
            };
          }
          socket.write(JSON.stringify(response));
        } catch (err) {
          console.error(`处理命令时出错: ${err.message}`);
          socket.write(
            JSON.stringify({
              success: false,
              errorCode: 3,
              errorMessage: err.message,
            }),
          );
        }
      });

      socket.on('end', () => {
        console.log(`客户端连接已关闭: ${remoteAddress}`);
      });

      socket.on('error', err => {
        console.error(`与客户端连接出现错误: ${err.message}`);
      });
    });

    const port = process.env.SERVER_PORT || 17001;
    const ip = process.env.SERVER_IP || '0.0.0.0';
    this.server
      .listen(port, ip, () => {
        console.log(`TCP服务器运行在 ${ip}:${port}`);
      })
      .on('error', err => {
        console.error(`服务器启动出错，端口可能被占用等原因: ${err.message}`);
      });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('TCP服务器已停止');
      });
    }
  }

  // 执行命令
  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`执行失败: ${error.message}`);
          resolve({
            success: false,
            errorCode: 4,
            errorMessage: error.message,
            stderr,
          });
        } else {
          console.log(`执行成功: ${stdout}`);
          resolve({
            success: true,
            stdout,
            stderr,
          });
        }
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
