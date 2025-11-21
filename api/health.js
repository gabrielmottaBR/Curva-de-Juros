// api/health.js - Health check endpoint

const { setCorsHeaders, handleOptions } = require('./_shared');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'vercel-serverless'
  });
};
