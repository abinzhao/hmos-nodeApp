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

// 自定义打印函数，模拟类似chalk的功能，用于添加颜色和样式
function log(text) {
  return `${colors.blue}${text}${colors["reset"]}`;
}
function error(text) {
  return `${colors.red}${text}${colors["reset"]}`;
}

function warn(text) {
  return `${colors.yellow}${text}${colors["reset"]}`;
}

window.console = { log, error, warn };
