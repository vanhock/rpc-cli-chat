const errorCodes = require("../errorCodes");
const { generateRandom } = require("../helpers");
const clients = [];

const send = (ws, data) => {
  const d = JSON.stringify({
    jsonrpc: "2.0",
    ...data
  });
  ws.send(d);
};

const getRecipient = recipientId => {
  return clients.find(client => client.id === recipientId);
};

module.exports = (ws, wss, WebSocket) => {
  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("message", msg => {
    const { method, id, params } = JSON.parse(msg);
    const sender = clients.find(client => client.ws === ws);
    switch (method) {
      case "login":
        if (clients.some(client => client.id === params.id)) {
          if (id)
            send(ws, {
              id: id,
              error: {
                code: errorCodes.login,
                message: "Client id is taken"
              }
            });
          break;
        }
        const client = {
          id: params.id
        };
        clients.push({
          ...client,
          ws: ws
        });

        if (id)
          send(ws, {
            id: id,
            result: {
              status: "success",
              client: client
            }
          });
        break;

      case "sendKey":
        const recipientWS = getRecipient(params.recipientId).ws;
        if (!params.recipientId || !params.publicKey) {
          send(ws, {
            id: id,
            error: {
              code: errorCodes.message,
              message: "Wrong recipient data!"
            }
          });
          break;
        }
        send(recipientWS, {
          method: "sendKey",
          params: {
            recipientId: sender.id,
            publicKey: params.publicKey
          }
        });
        break;
      case "handshake":
        send(getRecipient(params.recipientId).ws, {
          method: "handshake",
          params: {
            recipientId: sender.id
          }
        });
        break;
      case "message":
        if (!params.recipient) {
          if (id)
            send(ws, {
              id: id,
              error: {
                code: errorCodes.message,
                message: "Has no recipients specified!"
              }
            });
          break;
        }
        if (params.recipient === "-1") {
          /** Send to all clients **/
          let sentCount = 0;
          wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              send(client, {
                method: "message",
                params: { message: params.message, senderId: sender.id }
              });
              ++sentCount;
            }
          });
          send(ws, {
            id: id,
            result: {
              status: "success",
              message: `Message sent to ${sentCount} clients`
            }
          });
          break;
        }
        const recipient = clients.find(
          client => client.id === params.recipient
        );
        if (!recipient) {
          if (id)
            send(ws, {
              id: id,
              error: {
                code: errorCodes.message,
                message: "Can not find client by id"
              }
            });
          break;
        }
        send(recipient.ws, {
          method: "message",
          params: {
            message: params.message,
            senderId: sender.id,
            recipientId: recipient.id
          }
        });
        send(ws, {
          id: id,
          result: {
            status: "success",
            message: `Message sent to ${recipient.id}`
          }
        });
        break;
    }
  });
};
