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

const setRecipients = ws => {
  return clients.filter(c => c.ws !== ws).map(c => c.id);
};

module.exports = ws => {
  ws.on("message", msg => {
    const { method, id, params } = JSON.parse(msg);
    const sender = clients.find(client => client.ws == ws);
    switch (method) {
      case "login":
        if (clients.some(client => client.name === params.name)) {
          if (id)
            send(ws, {
              id: id,
              error: {
                code: errorCodes.login,
                message: "Client name is taken"
              }
            });
          break;
        }
        const client = {
          name: params.name,
          id: generateRandom(1)
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
              client: client,
              recipients: setRecipients(ws)
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
        if (params.recipient === -1) {
          /** Send to all clients **/
          let sentCount = 0;
          clients.forEach(client => {
            if (client.id !== sender.id) {
              send(client.ws, {
                method: "message",
                params: { message: params.message, name: sender.name }
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
                message: "Can not find client by name"
              }
            });
          break;
        }
        send(recipient.ws, {
          method: "message",
          params: { message: params.message, name: sender.name }
        });
        send(ws, {
          id: id,
          result: {
            status: "success",
            message: `Message sent to ${recipient.id}`
          }
        });
        break;

      case "recipients":
        send(ws, {
          id: id,
          result: { status: "success", recipients: setRecipients(ws) }
        });
    }
  });
};
