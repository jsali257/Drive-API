const env = (key: string, fallback = '') => process.env[key] ?? fallback;
const envInt = (key: string, fallback: number) => parseInt(process.env[key] ?? '', 10) || fallback;

export default () => ({
  nodeEnv: env('NODE_ENV', 'development'),
  port: envInt('PORT', 3001),
  appUrl: env('APP_URL', 'http://localhost:3001'),
  frontendUrl: env('FRONTEND_URL', 'http://localhost:3000'),

  database: {
    url: env('DATABASE_URL'),
  },

  jwt: {
    secret: env('JWT_SECRET', 'dev_jwt_secret_change_in_production'),
    expiresIn: env('JWT_EXPIRES_IN', '15m'),
    refreshSecret: env('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_in_production'),
    refreshExpiresIn: env('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  storage: {
    root: env('STORAGE_ROOT', 'D:\\Storage'),
    maxFileSizeMb: envInt('MAX_FILE_SIZE_MB', 5000),
    allowedExtensions: env('ALLOWED_EXTENSIONS', '*'),
    thumbnailMaxWidth: envInt('THUMBNAIL_MAX_WIDTH', 400),
    thumbnailMaxHeight: envInt('THUMBNAIL_MAX_HEIGHT', 400),
    previewMaxWidth: envInt('PREVIEW_MAX_WIDTH', 1200),
    previewMaxHeight: envInt('PREVIEW_MAX_HEIGHT', 1200),
  },

  throttle: {
    ttl: envInt('THROTTLE_TTL', 60),
    limit: envInt('THROTTLE_LIMIT', 100),
  },

  security: {
    bcryptRounds: envInt('BCRYPT_ROUNDS', 12),
    maxLoginAttempts: envInt('MAX_LOGIN_ATTEMPTS', 5),
    lockoutMinutes: envInt('LOCKOUT_DURATION_MINUTES', 15),
  },

  cors: {
    origins: env('CORS_ORIGINS', 'http://localhost:3000'),
  },

  virusScan: {
    enabled: process.env.VIRUS_SCAN_ENABLED === 'true',
    url: env('VIRUS_SCAN_URL'),
  },

  redis: {
    host: env('REDIS_HOST', 'localhost'),
    port: envInt('REDIS_PORT', 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  smtp: {
    host: env('SMTP_HOST'),
    port: envInt('SMTP_PORT', 587),
    user: env('SMTP_USER'),
    pass: env('SMTP_PASS'),
    from: env('SMTP_FROM', 'noreply@storage.local'),
  },

  logging: {
    level: env('LOG_LEVEL', 'info'),
    dir: env('LOG_DIR', 'D:\\Storage\\logs'),
  },
});
