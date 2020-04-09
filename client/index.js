const { generateRandom, encrypt, decrypt } = require("../helpers.js");
const inquirer = require("inquirer");
const WebSocket = require("ws");
const participant = require("./participant");
let ws;
const serverSocketURL = "ws://localhost:3000";
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

const recipients = {};

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
  return send("login", { id: generateRandom(1) });
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
  console.log(
    `Secret created for ${recipientId}, secret: ${
      recipients[recipientId].secret
    }`
  );
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

const connect = () => {
  ws = new WebSocket(serverSocketURL, undefined, undefined);
  ws.on("open", function open() {
    console.log("connected");
    login();
  });

  ws.on("close", function close() {
    console.log("disconnected");
    setTimeout(() => {
      connect();
      console.log(`Trying to reconnect...`);
    }, 2000);
  });

  ws.on("message", function incoming(message) {
    const response = JSON.parse(message);
    const { id, method, result, params, error } = response;
    if (error) {
      console.log(error.message);
      return error.code === 1
        ? login()
        : error.code === 2
          ? chooseRecipient()
          : "";
    }
    /** Messages **/
    switch (method) {
      case "message":
        let decryptedMessage = params.message;
        if (params.message && params.recipientId) {
          try {
            decryptedMessage = decrypt(
              params.message,
              recipients[params.senderId].secret.toString()
            );
          } catch (e) {
            console.log(e);
          }
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
        break;
      case "sendKey":
        console.log(`key received by ${client.id}`);
        if (!recipients.hasOwnProperty(params.recipientId)) {
          addRecipient(params.recipientId);
        }
        if (!recipients[params.recipientId].secret) {
          generateSecret(params.recipientId, params.publicKey);
          sendPublicKey(params.recipientId);
          break;
        }
        if (recipients[params.recipientId].secret) {
          send("handshake", { recipientId: params.recipientId });
        }
        break;
      case "handshake":
        console.log(`handshake received by ${client.id}`);
        newMessage(recipients[params.recipientId]);
        break;
    }
    /** Callbacks **/
    switch (id) {
      case client.requests["login"]:
        console.log(`Hi ${result.client.id}!`);
        client.id = result.client.id;
        chooseRecipient();
        break;
      case client.requests["handshake"]:
        console.log("Callback on handshake");
        if (recipients.hasOwnProperty(result.recipientId)) {
          return; /** Do nothing if we already had that participant **/
        }
        /** Then we got public key from recipient **/
        /** and we ready to send the message to recipient **/
        newMessage(recipients[result.recipientId]);
        break;
      case client.requests["message"]:
        console.log(`${result.message}`);
        chooseRecipient();
        break;
    }
  });
};

connect();
