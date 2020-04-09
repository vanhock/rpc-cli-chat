const WebSocket = require("ws");
const port = 3000;
const wss = new WebSocket.Server({ port: port });
wss.on("connection", function connection(ws, req, client) {
  ws.isAlive = true;
  ws.on("pong", heartbeat);
  console.log(`Connected on port: ${port}`);
  require("./controller.js")(ws, wss, WebSocket);
});

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping(noop);
  });
}, 30000);

wss.on("close", function close() {
  clearInterval(interval);
});

function noop() {}

function heartbeat() {
  this.isAlive = true;
}
