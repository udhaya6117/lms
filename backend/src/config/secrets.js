const DEFAULT_DEMO = {
  adminEmail: 'admin@lms.com',
  adminPassword: 'Admin@123',
  trainerPassword: 'Trainer@123',
  studentPassword: 'Student@123',
};

const WEAK_JWT_SECRETS = new Set([
  'change_this_access_secret',
  'change_this_refresh_secret',
  'test-access-secret',
  'test-refresh-secret',
]);

const allowedOrigins = () =>
  (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const seedCredentials = () => ({
  adminEmail: process.env.SEED_ADMIN_EMAIL || DEFAULT_DEMO.adminEmail,
  adminPassword: process.env.SEED_ADMIN_PASSWORD || DEFAULT_DEMO.adminPassword,
  trainerPassword: process.env.SEED_TRAINER_PASSWORD || DEFAULT_DEMO.trainerPassword,
  studentPassword: process.env.SEED_STUDENT_PASSWORD || DEFAULT_DEMO.studentPassword,
});

const isWeakJwtSecret = (value) =>
  !value || value.length < 32 || WEAK_JWT_SECRETS.has(value);

const assertProductionSecrets = (env = process.env) => {
  if (env.NODE_ENV !== 'production') return;

  const missing = [];
  if (!env.MONGODB_URI) missing.push('MONGODB_URI');
  if (!env.CLIENT_ORIGIN) missing.push('CLIENT_ORIGIN');
  if (!env.JWT_ACCESS_SECRET) missing.push('JWT_ACCESS_SECRET');
  if (!env.JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');
  if (missing.length) {
    throw new Error(`Production start blocked. Set ${missing.join(', ')} in the environment.`);
  }

  if (isWeakJwtSecret(env.JWT_ACCESS_SECRET) || isWeakJwtSecret(env.JWT_REFRESH_SECRET)) {
    throw new Error(
      'Production start blocked. JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be unique and at least 32 characters.'
    );
  }

  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('Production start blocked. Access and refresh JWT secrets must be different.');
  }

  if (env.USE_MEMORY_DB === 'true') {
    throw new Error('Production start blocked. USE_MEMORY_DB cannot be true.');
  }
};

const assertSafeSeedPasswords = (env = process.env) => {
  if (env.NODE_ENV !== 'production') return;
  const creds = {
    adminPassword: env.SEED_ADMIN_PASSWORD || DEFAULT_DEMO.adminPassword,
    trainerPassword: env.SEED_TRAINER_PASSWORD || DEFAULT_DEMO.trainerPassword,
    studentPassword: env.SEED_STUDENT_PASSWORD || DEFAULT_DEMO.studentPassword,
  };
  if (
    creds.adminPassword === DEFAULT_DEMO.adminPassword ||
    creds.trainerPassword === DEFAULT_DEMO.trainerPassword ||
    creds.studentPassword === DEFAULT_DEMO.studentPassword
  ) {
    throw new Error(
      'Refusing to seed production with default demo passwords. Set SEED_ADMIN_PASSWORD, SEED_TRAINER_PASSWORD, and SEED_STUDENT_PASSWORD.'
    );
  }
};

const shouldSeedOnEmpty = () => {
  if (process.env.SEED_ON_EMPTY === 'false') return false;
  if (process.env.NODE_ENV === 'production') return process.env.SEED_ON_EMPTY === 'true';
  return true;
};

const logDemoAccounts = (prefix = '') => {
  const creds = seedCredentials();
  if (process.env.NODE_ENV === 'production') {
    console.log(`${prefix}Demo accounts were created from SEED_* environment variables. Passwords are not printed.`);
    return;
  }
  console.log(`${prefix}Admin    ${creds.adminEmail} / ${creds.adminPassword}`);
  console.log(`${prefix}Trainer  trainer@lms.com / ${creds.trainerPassword}`);
  console.log(`${prefix}Student  student@lms.com / ${creds.studentPassword}`);
};

module.exports = {
  DEFAULT_DEMO,
  allowedOrigins,
  seedCredentials,
  assertProductionSecrets,
  assertSafeSeedPasswords,
  shouldSeedOnEmpty,
  logDemoAccounts,
};
