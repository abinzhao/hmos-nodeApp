const express = require("express");
const router = express.Router();
const CommandController = require("../controllers/commandController");

router.post("/", (req, res) => {
  res.send("./public/index.html");
});
router.post("/execute-command", CommandController.executeCommand);



module.exports = router;
