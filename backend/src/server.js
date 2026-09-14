require('dotenv').config();
const { assertProductionSecrets } = require('./config/secrets');
const connectDb = require('./config/db');
const app = require('./app');

const port = process.env.PORT || 5000;

const start = async () => {
  assertProductionSecrets();
  await connectDb();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
