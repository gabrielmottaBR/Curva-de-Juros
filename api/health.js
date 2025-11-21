// api/health.js - Health check endpoint

module.exports = async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'vercel-serverless'
  });
};
