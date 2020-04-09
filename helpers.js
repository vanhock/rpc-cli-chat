const params = require("./params");
const crypto = require("crypto");
const AES = require("crypto-js/aes");
const Utf8 = require('crypto-js/enc-utf8');

const generateRandom = bytes => {
  return crypto.randomBytes(bytes).toString("hex");
};

const powMod = (base, exp, modulus) => {
  base %= modulus;
  result = 1;

  while (exp > 0) {
    if (exp & 1) result = (result * base) % modulus;
    base = (base * base) % modulus;
    exp >>= 1;
  }

  return result;
};

const getPrivateKey = () => {
  const max = params.modulus - 2;
  const min = 2;

  return Math.round(min - 0.5 + Math.random() * (max - min + 1));
};

const getPublicKey = privateKey => {
  return powMod(params.generator, privateKey, params.modulus);
};

const encrypt = (text, secret) => {
  console.log(`secret: ${secret}`)
  return AES.encrypt(text, secret).toString()
};

const decrypt = (text, secret) => {
  console.log(`secret: ${secret}`)
  const bytes = AES.decrypt(text, secret);
  return bytes.toString(Utf8);
};

module.exports = {
  generateRandom,
  powMod,
  getPrivateKey,
  getPublicKey,
  encrypt,
  decrypt
};
