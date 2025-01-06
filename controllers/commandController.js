const TcpService = require("../services/tcpService");

class CommandController {
  static async executeCommand(req, res) {
    try {
      const { command } = req.body;
      const result = await TcpService.getInstance().execCommand(command);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = CommandController;
