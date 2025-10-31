export default () => ({
  port: parseInt(process.env.PORT || '5000', 10),
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/pyblocks',
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'pyblocks-super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  },
});
