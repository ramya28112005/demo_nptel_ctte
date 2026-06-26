import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { id } = req.body;
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to select semester' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}