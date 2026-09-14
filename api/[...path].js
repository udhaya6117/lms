require('dotenv').config();

let loadError;
let assertProductionSecrets;
let connectDb;
let app;

try {
  ({ assertProductionSecrets } = require('../backend/src/config/secrets'));
  connectDb = require('../backend/src/config/db');
  app = require('../backend/src/app');
} catch (err) {
  loadError = err;
  console.error('Vercel API failed to load', err);
}

let ready;

const sendError = (res, err) => {
  if (res.headersSent) return;
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      success: false,
      message: err.message || 'API failed to start',
    })
  );
};

module.exports = async (req, res) => {
  if (loadError) {
    sendError(res, loadError);
    return;
  }

  try {
    assertProductionSecrets();
    if (!ready) {
      ready = connectDb({ skipSeed: process.env.SEED_ON_EMPTY !== 'true' });
    }
    await ready;
    return app(req, res);
  } catch (err) {
    console.error('Vercel API failed', err);
    sendError(res, err);
  }
};
