const WebSocket = require("ws");
const port = 3000;
const wss = new WebSocket.Server({
  port: port
});
const router = require("./wsRouter");
const clients = [];

wss.on("connection", function connection(ws, req, client) {
  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("message", msg => {
    router({clients, msg, ws, wss})
  });

  ws.isAlive = true;
  ws.on("pong", heartbeat);
  console.log(`Client connected: ${req.connection.remoteAddress}`);
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
