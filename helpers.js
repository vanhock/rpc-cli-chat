const crypto = require("crypto");
const generateRandom = bytes => {
  return crypto.randomBytes(bytes).toString("hex");
};
module.exports = {
  generateRandom
};
