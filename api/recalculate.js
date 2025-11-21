// api/recalculate.js - Manual recalculate trigger

const { setCorsHeaders, handleOptions } = require('./_shared');
const collectHandler = require('./collect');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Call the collect handler directly
    await collectHandler(req, res);
  } catch (err) {
    console.error('[Recalculate API] Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to recalculate opportunities' });
    }
  }
};
