// api/recalculate.js - Manual recalculate trigger

const collectHandler = require('./collect');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await collectHandler(req, res);
  } catch (err) {
    console.error('Error in recalculate endpoint:', err);
    res.status(500).json({ error: 'Failed to recalculate opportunities' });
  }
};
