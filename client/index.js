const { generateRandom } = require("../helpers.js");
const inquirer = require("inquirer");
const WebSocket = require("ws");
let ws;

const client = {
  data: {},
  recipient: "",
  requests: {
    login: "",
    message: "",
    recipients: ""
  },
  questions: {
    login: [
      {
        type: "input",
        name: "name",
        message: "What's your name?"
      }
    ],
    message: [
      {
        type: "list",
        name: "recipient",
        message: "Choose recipient from the list. Type -1 to send everyone."
      },
      {
        type: "input",
        name: "message",
        message: "Type message you want to send"
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
  inquirer.prompt(client.questions.login).then(answers => {
    if (!answers["name"]) {
      return;
    }
    return send("login", { name: answers["name"] });
  });
};

const newMessage = (availableClients = []) => {
  const { name, id } = client.data;
  const questions = client.questions.message.map(q => {
    if (q.type === "list") {
      return {
        ...q,
        choices: [...availableClients, -1]
      };
    }
    return q;
  });
  inquirer.prompt(questions).then(answers => {
    return send("message", {
      recipient: answers["recipient"],
      message: answers["message"],
      name: name,
      id: id
    });
  });
};

const getRecipients = () => {
  return send("recipients");
};

const connect = () => {
  ws = new WebSocket("ws://localhost:3000/rpc", undefined, undefined);
  ws.on("open", function open() {
    console.log("connected");
    login();
  });

  ws.on("close", function close() {
    console.log("disconnected");
    setTimeout(() => {
      connect();
      console.log(`Trying to reconnect...`);
    }, 2000)
  });

  ws.on("message", function incoming(message) {
    const response = JSON.parse(message);
    const { id, method, result, params, error } = response;
    if (error) {
      console.log(error.message);
      return error.code === 1 ? login() : error.code === 2 ? getRecipients() : "";
    }
    /** Messages **/
    switch (method) {
      case "message":
        console.clear();
        console.log(
          "\n",
          `Message from ${params.name}:`,
          "\n",
          `${params.message}`
        );
        getRecipients();
        break;
    }
    /** Callbacks **/
    switch (id) {
      case client.requests["login"]:
        console.log(`Hi ${result.client.name}!`);
        client.data = result.client;
        newMessage(result.recipients);
        break;
      case client.requests["message"]:
        console.log(`${result.message}`);
        getRecipients();
        break;
      case client.requests["recipients"]:
        newMessage(result.recipients);
        break;
    }
  });
};

connect();


