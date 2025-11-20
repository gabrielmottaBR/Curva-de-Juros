import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    return res.status(200).json({ 
      message: 'Recalculation is handled automatically by the scheduled job',
      note: 'Data is refreshed daily at 21:00 Brasília time'
    });
  } catch (error) {
    console.error('Error in recalculate endpoint:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
