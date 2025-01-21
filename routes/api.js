const express = require("express");
const router = express.Router();
const CommandController = require("../controllers/commandController");

router.get("/", (req, res) => {
  res.sendFile("index.html", { root: "./public" });
});

router.post("/execute-command", CommandController.executeCommand);

module.exports = router;
