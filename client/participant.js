const params = require("../params");
const { getPrivateKey, getPublicKey, powMod } = require("../helpers");
module.exports = class Participant {
  constructor(id) {
    this.id = id;
    this.keyPair = {};
    this.keyPair.private = getPrivateKey();
    this.keyPair.public = getPublicKey(this.keyPair.private);
  }

  generateSecret(receivedKey) {
    this.secret = powMod(
      receivedKey,
      this.keyPair.private,
      params.modulus
    );
  }
};
