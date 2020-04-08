const express = require("express");
const logger = require("morgan");
const server = express();
const expressWs = require("express-ws")(server);
const controller = require("./controller.js");
server.use(logger("dev"));

server.get("/", (req, res) => {
  res.status(200).send("Hi");
});

server.ws("/rpc", controller);

const port = 3000;
server.listen(port, () => console.log(`Server listening on port ${port}`));