const errorCodes = require("../errorCodes");
const { generateRandom } = require("../helpers");
module.exports = ({ clients, msg, ws, wss }) => {
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

  const { method, id, params } = JSON.parse(msg);
  const sender = clients.find(client => client.ws === ws);

  const routes = {
    login: () => {
      if (clients.some(client => client.id === params.id)) {
        if (id)
          return send(ws, {
            id: id,
            error: {
              code: errorCodes.login,
              message: "Client id is taken"
            }
          });
      }
      const client = {
        id: generateRandom(1)
      };
      clients.push({
        ...client,
        ws: ws
      });

      if (id)
        return send(ws, {
          id: id,
          result: {
            status: "success",
            client: client
          }
        });
    },
    sendKey: () => {
      const targetRecipient = getRecipient(params.recipientId);
      if (
        !params.recipientId ||
        !params.publicKey ||
        !targetRecipient ||
        !targetRecipient.ws
      ) {
        return send(ws, {
          id: id,
          error: {
            code: errorCodes.message,
            message: "Wrong recipient data!"
          }
        });
      }
      return send(targetRecipient.ws, {
        method: "sendKey",
        params: {
          recipientId: sender.id,
          publicKey: params.publicKey
        }
      });
    },
    handshake: () => {
      send(getRecipient(params.recipientId).ws, {
        method: "handshake",
        params: {
          recipientId: sender.id
        }
      });
    },
    message: () => {
      if (!params.recipient) {
        if (id)
          return send(ws, {
            id: id,
            error: {
              code: errorCodes.message,
              message: "Has no recipients specified!"
            }
          });
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
        return;
      }
      const recipient = clients.find(client => client.id === params.recipient);
      if (!recipient) {
        if (id)
          send(ws, {
            id: id,
            error: {
              code: errorCodes.message,
              message: "Can not find client by id"
            }
          });
        return;
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
    }
  };

  return routes[method]();
};
