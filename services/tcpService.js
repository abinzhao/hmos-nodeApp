const net = require("net");
const { exec } = require("child_process");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const os = require("os");

class TcpService {
  constructor() {
    this.server = null;
    this.workerPool = [];
    this.maxWorkers = os.cpus().length; // 根据 CPU 核心数确定最大工作线程数
    this.taskQueue = [];
    this.initWorkerPool();
  }

  initWorkerPool() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(__filename, { workerData: { id: i } });
      this.workerPool.push(worker);
      worker.on("message", (message) => {
        // 从工作线程接收处理结果
        const { taskId, result } = message;
        this.handleTaskResult(taskId, result);
      });
    }
  }

  start() {
    this.server = net.createServer((socket) => {
      const remoteAddress = `${socket.remoteAddress}:${socket.remotePort}`;
      console.log(`有客户端连接到服务器: ${remoteAddress}`);

      socket.on("data", async (data) => {
        try {
          const commandParts = data.toString().trim().split(" ");
          const command = commandParts[0];
          const packageNameOrPath = commandParts[1];
          console.log(`收到客户端发送的调试命令: ${command} from ${remoteAddress}`);

          const task = {
            socket,
            command,
            packageNameOrPath,
            taskId: Date.now(),
          };
          this.taskQueue.push(task);
          this.processTaskQueue();
        } catch (err) {
          console.error(`处理命令时出错: ${err.message}`);
          socket.write(
            JSON.stringify({
              success: false,
              errorCode: 3,
              errorMessage: err.message,
            })
          );
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
    // 终止所有工作线程
    this.workerPool.forEach((worker) => worker.terminate());
  }

  processTaskQueue() {
    if (this.taskQueue.length > 0 && this.workerPool.length > 0) {
      const task = this.taskQueue.shift();
      const worker = this.workerPool.shift();
      worker.postMessage({ ...task });
    }
  }

  handleTaskResult(taskId, result) {
    // 根据任务 ID 找到对应的 socket 并发送结果
    const task = this.taskQueue.find((t) => t.taskId === taskId);
    if (task) {
      task.socket.write(JSON.stringify(result));
    }
    // 将工作线程放回池中
    this.workerPool.push(worker);
    this.processTaskQueue();
  }

  // 工作线程执行命令
  static async execCommand(command) {
    return new Promise((resolve, resolve) => {
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

if (!isMainThread) {
  // 工作线程逻辑
  parentPort.on("message", async (task) => {
    const { command, packageNameOrPath } = task;
    let response;
    if (command === "hdc install") {
      // 首先检查设备是否连接
      const checkConnection = await TcpService.execCommand("hdc list targets");
      if (checkConnection.stdout.includes("device")) {
        // 设备已连接，执行安装命令
        response = await TcpService.execCommand(`hdc install ${packageNameOrPath}`);
      } else {
        response = {
          success: false,
          errorCode: 1,
          errorMessage: "设备未连接，请确保设备已连接",
        };
      }
    } else if (command === "hdc uninstall") {
      // 首先检查设备是否连接
      const checkConnection = await TcpService.execCommand("hdc list targets");
      if (checkConnection.stdout.includes("device")) {
        // 设备已连接，执行卸载命令
        response = await TcpService.execCommand(`hdc uninstall ${packageNameOrPath}`);
      } else {
        response = {
          success: false,
          errorCode: 1,
          errorMessage: "设备未连接，请确保设备已连接",
        };
      }
    } else {
      response = {
        success: false,
        errorCode: 2,
        errorMessage: "不支持的命令",
      };
    }
    parentPort.postMessage({ taskId: task.taskId, result: response });
  });
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