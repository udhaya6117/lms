require('dotenv').config();

const { assertProductionSecrets } = require('../backend/src/config/secrets');
const connectDb = require('../backend/src/config/db');
const app = require('../backend/src/app');

assertProductionSecrets();

let ready;

module.exports = async (req, res) => {
  if (!ready) {
    ready = connectDb({ skipSeed: process.env.SEED_ON_EMPTY !== 'true' });
  }
  await ready;
  return app(req, res);
};
