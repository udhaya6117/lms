require('dotenv').config();

const { assertProductionSecrets } = require('../backend/src/config/secrets');
const connectDb = require('../backend/src/config/db');
const app = require('../backend/src/app');

let ready;

module.exports = async (req, res) => {
  try {
    assertProductionSecrets();
    if (!ready) {
      ready = connectDb({ skipSeed: process.env.SEED_ON_EMPTY !== 'true' });
    }
    await ready;
    return app(req, res);
  } catch (err) {
    console.error('Vercel API failed', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          message: err.message || 'API failed to start',
        })
      );
    }
  }
};
