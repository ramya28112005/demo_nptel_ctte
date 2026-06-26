import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.status(200).json({
      courses: []
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}