const dns = require('dns');
const mongoose = require('mongoose');
const { shouldSeedOnEmpty, logDemoAccounts } = require('./secrets');

const usePublicDnsForSrv = (uri) => {
  if (!uri || !uri.startsWith('mongodb+srv://')) return;
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // ignore — connection will still be attempted with the system resolver
  }
};

let memoryServer;

const seedIfEmpty = async () => {
  const User = require('../models/User');
  const count = await User.estimatedDocumentCount();
  if (count > 0) return;

  const populateCampus = require('../store/campusSeed');
  const counts = await populateCampus({
    User: require('../models/User'),
    Course: require('../models/Course'),
    Enrollment: require('../models/Enrollment'),
    Assignment: require('../models/Assignment'),
    Submission: require('../models/Submission'),
    Category: require('../models/Category'),
    Section: require('../models/Section'),
    Lesson: require('../models/Lesson'),
    Quiz: require('../models/Quiz'),
    Question: require('../models/Question'),
  });
  console.log(
    `Campus seed ready: ${counts.trainers} trainers, ${counts.students} students, ${counts.courses} courses.`
  );
  logDemoAccounts('  ');
};

const connectMemoryIfAvailable = async () => {
  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = require('mongodb-memory-server'));
  } catch {
    return false;
  }
  memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri('lms'));
  console.log('MongoDB (in-memory) connected. Data is reset when the process exits.');
  return true;
};

const redactUri = (uri) => {
  if (!uri) return '(missing)';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
};

const connectDb = async ({ skipSeed = false } = {}) => {
  mongoose.set('strictQuery', true);
  if (mongoose.connection.readyState === 1) {
    if (!skipSeed && shouldSeedOnEmpty()) await seedIfEmpty();
    return mongoose.connection;
  }
  const uri = process.env.MONGODB_URI;
  const forceMemory = process.env.USE_MEMORY_DB === 'true';
  const allowMemoryFallback =
    process.env.NODE_ENV !== 'production' &&
    (forceMemory || process.env.USE_MEMORY_DB !== 'false');

  if (!forceMemory && uri) {
    try {
      usePublicDnsForSrv(uri);
      await mongoose.connect(uri);
      console.log(`MongoDB connected: ${redactUri(uri)}`);
    } catch (err) {
      const usedMemory = allowMemoryFallback && (await connectMemoryIfAvailable());
      if (!usedMemory) {
        console.error(
          `MongoDB connection failed (${redactUri(uri)}). Check the URI, Atlas IP allowlist, and credentials.`
        );
        throw err;
      }
      console.warn(`MongoDB at ${redactUri(uri)} is unavailable. Using in-memory MongoDB instead.`);
    }
  } else {
    const usedMemory = await connectMemoryIfAvailable();
    if (!usedMemory) {
      throw new Error(
        'MONGODB_URI is required. Copy backend/.env.example to backend/.env and start MongoDB.'
      );
    }
  }

  if (!skipSeed && shouldSeedOnEmpty()) {
    await seedIfEmpty();
  }

  return mongoose.connection;
};

const disconnectDb = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};

module.exports = connectDb;
module.exports.disconnectDb = disconnectDb;
