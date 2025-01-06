const app = require("./app");
const os = require("os");
const TcpService = require("./services/tcpService");
const { exec } = require("child_process");
const { styledPrint } = require("./utils");

// 启动TCP服务器
const tcpServiceInstance = TcpService.getInstance();
tcpServiceInstance.start();

// 获取服务器的公网IP地址和Web服务器端口号，设置默认值，并验证环境变量格式是否合法
const serverIp = process.env.SERVER_IP || "0.0.0.0";
const serverPort = process.env.SERVER_PORT || 8089;
const webServerPort = parseInt(process.env.WEB_SERVER_PORT) || 8081;
if (isNaN(serverPort) || isNaN(webServerPort)) {
  console.error(styledPrint("red", "环境变量中端口号格式不正确，请检查配置"));
  process.exit(1);
}

// 标记是否正在尝试重启以及是否正在执行关闭操作，避免重复操作
let isRestarting = false;
let isClosing = false;
let webServer;

// 启动Web服务器的函数，完善错误处理逻辑
function startWebServer() {
  if (isRestarting) return;

  webServer = app.listen(webServerPort, serverIp, (err) => {
    if (err) {
      if (err.code === "EADDRINUSE") {
        console.error(styledPrint("red", `端口 ${webServerPort} 已被占用，尝试释放端口并重启...`));
        releasePortAndRestart();
      } else {
        console.error(styledPrint("red", `服务器启动出错: ${err.message}`));
        console.error(styledPrint("red", "将进行优雅关闭，请检查服务器配置和相关依赖..."));
        gracefulShutdown();
      }
      return;
    }
    const logMessage = getServerStartupLogMessage(serverIp, webServerPort);
    console.log(logMessage);
  });
}

// 生成服务器启动成功的日志消息
function getServerStartupLogMessage(ip, port) {
  return [
    styledPrint("green", "------------------------------------------------------------"),
    styledPrint("green", "|                                                         |"),
    styledPrint(
      "green",
      `|  ${styledPrint("bold", "Web服务器已成功启动！")}                                 |`
    ),
    styledPrint("green", "|                                                         |"),
    styledPrint("green", "------------------------------------------------------------"),
    styledPrint("blue", `地址: ${ip}`),
    styledPrint("blue", `端口: ${port}`),
    styledPrint("blue", `URL : http://${ip}:${port}`),
    styledPrint("green", "------------------------------------------------------------"),
  ].join("\n");
}

// 释放端口并尝试重启服务器的函数，增强端口释放验证逻辑
function releasePortAndRestart() {
  if (isRestarting) return;

  isRestarting = true;
  console.log(styledPrint("yellow", "尝试释放端口并重新启动服务器..."));

  // 关闭HTTP服务器
  if (webServer) {
    webServer.close(() => {
      console.log(styledPrint("green", "HTTP服务器已关闭。"));
    });
  }

  // 停止TCP服务器
  tcpServiceInstance.stop();

  let releasePortCommand = "";
  if (os.platform() === "darwin") {
    // 判断是否为macOS系统
    releasePortCommand = `lsof -i :${serverPort} | grep LISTEN | awk '{print $2}' | xargs kill -9 && lsof -i :${webServerPort} | grep LISTEN | awk '{print $2}' | xargs kill -9`;
  } else {
    // 其他类Unix系统（包含Linux），这里假设主要是针对Linux的处理，如果还有其他Unix变种可能需要更细致的区分
    releasePortCommand = `fuser -k -n tcp ${serverPort} && fuser -k -n tcp ${webServerPort}`;
  }

  // 使用子进程执行相应的端口释放命令
  exec(releasePortCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(styledPrint("red", `执行端口释放命令失败: ${error.message}`));
      console.error(styledPrint("red", stderr));
      gracefulShutdown();
      return;
    }

    // 验证端口是否真的被释放，根据操作系统使用不同命令再次查询端口占用情况
    checkPortReleased(serverPort, webServerPort)
      .then(() => {
        console.log(styledPrint("green", `端口 ${serverPort}和端口 ${webServerPort} 已释放`));
        setTimeout(() => {
          isRestarting = false;
          startWebServer();
        }, 1000);
      })
      .catch(() => {
        console.error(styledPrint("red", "端口释放后仍被占用，将再次尝试释放..."));
        setTimeout(() => {
          releasePortAndRestart();
        }, 2000);
      });
  });
}

// 检查端口是否已释放的函数，根据操作系统执行相应查询命令
function checkPortReleased(serverPort, webServerPort) {
  return new Promise((resolve, reject) => {
    let checkCommand = "";
    if (os.platform() === "darwin") {
      checkCommand = `lsof -i :${serverPort} | grep LISTEN | wc -l && lsof -i :${webServerPort} | grep LISTEN | wc -l`;
    } else {
      checkCommand = `netstat -tunlp | grep :${serverPort} | wc -l && netstat -tunlp | grep :${webServerPort} | wc -l`;
    }
    exec(checkCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(styledPrint("red", `检查端口占用情况出错: ${error.message}`));
        console.error(styledPrint("red", stderr));
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

// 优雅关闭服务器的函数，添加重复操作避免逻辑
function gracefulShutdown() {
  if (isClosing) return;
  isClosing = true;
  console.log(styledPrint("magenta", "\n正在关闭服务器..."));

  // 关闭HTTP服务器
  if (webServer) {
    webServer.close(() => {
      console.log(styledPrint("green", "HTTP服务器已关闭。"));
    });
  }

  // 停止TCP服务器
  tcpServiceInstance.stop();
  console.error(styledPrint("red", "强制退出..."));
  process.exit(1);
}

// 监听常见终止信号，确保优雅关闭服务，避免重复触发关闭逻辑
function handleSignal(signal) {
  return () => {
    if (!isClosing) {
      isClosing = true;
      console.log(styledPrint("magenta", `接收到 ${signal} 信号，正在优雅关闭服务器...`));
      gracefulShutdown();
    }
  };
}

process.on("SIGINT", handleSignal("SIGINT")); // Ctrl+C
process.on("SIGTERM", handleSignal("SIGTERM")); // 终端发送的终止信号
process.on("uncaughtException", (err) => {
  console.error(styledPrint("red", "未捕获的异常:"), styledPrint("red", err.message));
  releasePortAndRestart();
});
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    styledPrint("red", "未处理的拒绝:"),
    styledPrint("red", promise),
    styledPrint("red", "原因:"),
    styledPrint("red", reason)
  );
  gracefulShutdown();
});

// 监听进程退出事件，记录退出码
process.on("exit", (code) => {
  console.log(styledPrint("gray", `进程退出，退出码: ${code}`));
});

// 初始化启动Web服务器
startWebServer();
