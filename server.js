const app = require("./app");
const os = require("os");
const TcpService = require("./services/tcpService");
const { exec } = require("child_process");
require("./utils/index");

// 启动TCP服务器
const tcpServiceInstance = TcpService.getInstance();
tcpServiceInstance.start();

// 获取服务器的公网IP地址和Web服务器端口号，设置默认值，并验证环境变量格式是否合法
const serverIp = process.env.SERVER_IP || "0.0.0.0";
const serverPort = process.env.SERVER_PORT || 8089;
const webServerPort = parseInt(process.env.WEB_SERVER_PORT) || 8081;
if (isNaN(serverPort) || isNaN(webServerPort)) {
  console.error("环境变量中端口号格式不正确，请检查配置");
  process.exit(1);
}

// 标记是否正在尝试重启以及是否正在执行关闭操作，避免重复操作
let isRestarting = false;
let isClosing = false;
let webServer;

// 启动Web服务器的函数，完善错误处理逻辑
async function startWebServer() {
  if (isRestarting) return;
  try {
    webServer = await new Promise((resolve, reject) => {
      app.listen(webServerPort, serverIp, (err, server) => {
        if (err) {
          reject(err);
        } else {
          resolve(server);
        }
      });
    });
    console.log(getServerStartupLogMessage(serverIp, webServerPort));
  } catch (err) {
    handleServerStartupError(err);
  }
}

// 统一处理服务器启动错误的函数
function handleServerStartupError(err) {
  if (err.code === "EADDRINUSE") {
    console.warn(`端口 ${webServerPort} 已被占用，尝试释放端口并重启...`);
    releasePortAndRestart();
  } else {
    console.error(`服务器启动出错: ${err.message}`);
    console.error("将进行优雅关闭，请检查服务器配置和相关依赖...");
    gracefulShutdown();
  }
}

// 生成服务器启动成功的日志消息，使用模板字符串提升可读性
function getServerStartupLogMessage(ip, port) {
  return `
    ------------------------------------------------------------
    |                                                         |
    |  Web服务器已成功启动！                                 |
    |                                                         |
    ------------------------------------------------------------
    地址: ${ip}
    端口: ${port}
    URL : http://${ip}:${port}
    ------------------------------------------------------------
    `.trim();
}

// 释放端口并尝试重启服务器的函数，优化Promise链式调用和错误处理
async function releasePortAndRestart() {
  if (isRestarting) return;
  isRestarting = true;
  console.warn("尝试释放端口并重新启动服务器...");
  try {
    await closeServers();
    const releasePortCommand = getReleasePortCommand();
    await new Promise((resolve, reject) => {
      exec(releasePortCommand, (error, stdout, stderr) => {
        if (error) {
          reject({ error, stderr });
        } else {
          resolve();
        }
      });
    });
    await checkPortReleased(serverPort, webServerPort);
    console.log(`端口 ${serverPort}和端口 ${webServerPort} 已释放`);
    setTimeout(() => {
      isRestarting = false;
      startWebServer();
    }, 1000);
  } catch (errorInfo) {
    console.error(`执行端口释放相关操作失败: ${errorInfo.error.message}`);
    console.error(errorInfo.stderr);
    setTimeout(() => {
      releasePortAndRestart();
    }, 2000);
  }
}

// 获取对应操作系统的端口释放命令
function getReleasePortCommand() {
  if (os.platform() === "darwin") {
    return `lsof -i :${serverPort} | grep LISTEN | awk '{print $2}' | xargs kill -9 && lsof -i :${webServerPort} | grep LISTEN | awk '{print $2}' | xargs kill -9`;
  } else {
    return `fuser -k -n tcp ${serverPort} && fuser -k -n tcp ${webServerPort}`;
  }
}

// 检查端口是否已释放的函数，根据操作系统执行相应查询命令
async function checkPortReleased(serverPort, webServerPort) {
  const checkCommand = getCheckPortCommand();
  return new Promise((resolve, reject) => {
    exec(checkCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`检查端口占用情况出错: ${error.message}`);
        console.error(stderr);
        reject();
      } else {
        const counts = stdout.trim().split("\n").map(Number);
        if (counts.every((count) => count === 0)) {
          resolve();
        } else {
          reject();
        }
      }
    });
  });
}

// 获取对应操作系统的端口占用检查命令
function getCheckPortCommand() {
  if (os.platform() === "darwin") {
    return `lsof -i :${serverPort} | grep LISTEN | wc -l && lsof -i :${webServerPort} | grep LISTEN | wc -l`;
  } else {
    return `netstat -tunlp | grep :${serverPort} | wc -l && netstat -tunlp | grep :${webServerPort} | wc -l`;
  }
}

// 关闭服务器（HTTP服务器和TCP服务器）的函数
async function closeServers() {
  try {
    // 关闭HTTP服务器
    if (webServer) {
      await new Promise((resolve, reject) =>
        webServer.close((err) => (err ? reject(err) : resolve()))
      );
      console.log("HTTP服务器已关闭。");
    }

    // 停止TCP服务器
    await tcpServiceInstance.stop();
  } catch (err) {
    console.error("关闭服务器时出错:", err);
  }
}

function gracefulShutdown() {
  if (isClosing) return;
  isClosing = true;
  console.log("正在关闭服务器...");
  closeServers().catch(console.error);
  process.exit(1);
}

// 监听常见终止信号，确保优雅关闭服务，避免重复触发关闭逻辑
function handleSignal(signal) {
  return () => {
    if (!isClosing) {
      isClosing = true;
      console.log(`接收到 ${signal} 信号，正在优雅关闭服务器...`);
      gracefulShutdown();
    }
  };
}

process.on("SIGINT", handleSignal("SIGINT")); // Ctrl+C
process.on("SIGTERM", handleSignal("SIGTERM")); // 终端发送的终止信号
process.on("uncaughtException", (err) => {
  console.error("未捕获的异常:", err.message);
  releasePortAndRestart();
});
process.on("unhandledRejection", (reason, promise) => {
  console.warn("未处理的拒绝:", promise, "原因:", reason);
  gracefulShutdown();
});

// 监听进程退出事件，记录退出码
process.on("exit", (code) => {
  console.error(`进程退出，退出码: ${code}`);
});

// 初始化启动Web服务器
startWebServer();