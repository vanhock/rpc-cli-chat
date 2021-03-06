const {
  generateRandom,
  getKeyByValue,
  encrypt,
  decrypt
} = require("../helpers.js");
const serverSocketURL = "ws://localhost:3000";
const inquirer = require("inquirer");
const WebSocket = require("ws");
const participant = require("./participant");

const ws = new WebSocket(serverSocketURL, undefined, undefined);

const recipients = {};
const client = {
  id: "",
  data: {},
  requests: {
    login: "",
    sendKey: "",
    handshake: "",
    message: ""
  },
  questions: {
    recipient: [
      {
        type: "input",
        name: "recipient",
        message: "Type recipient id or type -1 to send everyone:"
      }
    ],
    message: [
      {
        type: "input",
        name: "message",
        message: "Type message you want to send:"
      }
    ]
  }
};

const send = (method, params, cb) => {
  const id = generateRandom(10);
  const data = {
    id: id,
    method: method,
    params: params
  };
  client.requests[method] = id;
  ws.send(JSON.stringify(data), undefined, cb);
};

const login = () => {
  return send("login");
};

const sendPublicKey = recipientId => {
  return send("sendKey", {
    recipientId: recipientId,
    publicKey: recipients[recipientId].keyPair.public
  });
};

const addRecipient = recipientId => {
  recipients[recipientId] = new participant(recipientId);
};

const generateSecret = (recipientId, publicKey) => {
  recipients[recipientId].generateSecret(publicKey);
};

const chooseRecipient = () => {
  inquirer.prompt(client.questions.recipient).then(answers => {
    if (answers["recipient"] === "-1") {
      return newMessage();
    }
    if (
      recipients.hasOwnProperty(answers["recipient"]) &&
      recipients[answers["recipient"]].secret
    ) {
      newMessage(recipients[answers["recipient"]]);
    } else {
      addRecipient(answers["recipient"]);
      sendPublicKey(answers["recipient"]);
    }
  });
};

const newMessage = recipient => {
  const recipientId = recipient ? recipient.id : "-1";
  const { id } = client;
  inquirer.prompt(client.questions.message).then(answers => {
    const encryptMessage = recipient
      ? encrypt(answers["message"], recipient.secret.toString())
      : answers["message"];
    return send("message", {
      recipient: recipientId,
      message: encryptMessage,
      id: id
    });
  });
};

const handler = response => {
  const { id, method, result, params, error } = response;

  if (error) {
    console.log(error.message);
    return error.code === 1
      ? login()
      : error.code === 2
        ? chooseRecipient()
        : "";
  }

  const methods = {
    message: () => {
      let decryptedMessage = params.message;
      if (params.message && params.recipientId) {
        decryptedMessage = decrypt(
          params.message,
          recipients[params.senderId].secret.toString()
        );
      }
      console.log(
        "\n",
        "### New message ###",
        "\n",
        params.recipientId ? `Recipient: ${params.recipientId}\n` : "",
        `Message from ${params.senderId}:`,
        "\n",
        `${decryptedMessage}`
      );
      chooseRecipient();
    },
    sendKey: () => {
      console.log(`key received by ${client.id}`);
      if (!recipients.hasOwnProperty(params.recipientId)) {
        addRecipient(params.recipientId);
      }
      if (!recipients[params.recipientId].secret) {
        generateSecret(params.recipientId, params.publicKey);
        sendPublicKey(params.recipientId);
        return;
      }
      if (recipients[params.recipientId].secret) {
        send("handshake", { recipientId: params.recipientId });
      }
      chooseRecipient();
    },
    handshake: () => {
      console.log(`handshake received by ${client.id}`);
      newMessage(recipients[params.recipientId]);
    }
  };

  const callback = {
    login: () => {
      console.log(`Hi ${result.client.id}!`);
      client.id = result.client.id;
      chooseRecipient();
    },
    message: () => {
      console.log(result.message);
      chooseRecipient();
    }
  };

  if (method) {
    return methods[method]();
  }
  const request = getKeyByValue(client.requests, id);
  if (request) {
    callback[request]();
  }
};

ws.on("open", function open() {
  console.log("connected");
  login();
});

ws.on("close", function close() {
  console.log("disconnected");
});

ws.on("message", function incoming(message) {
  const response = JSON.parse(message);
  handler(response);
});
