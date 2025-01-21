// 定义颜色和样式的 ANSI 转义序列
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

// 创建一个包装器函数，用于添加颜色到控制台输出
function wrapConsoleMethod(method, color) {
  const originalMethod = console[method].bind(console);
  return function (...args) {
    // 将每个参数都加上颜色
    const coloredArgs = args.map(arg => `${color}${arg}${colors.reset}`);
    originalMethod(...coloredArgs);
  };
}

// 修改 console 的 log, error 和 warn 方法
console.log = wrapConsoleMethod('log', colors.blue);
console.error = wrapConsoleMethod('error', colors.red);
console.warn = wrapConsoleMethod('warn', colors.yellow);