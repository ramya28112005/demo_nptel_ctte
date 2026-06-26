import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.status(200).json({
      courses: 0,
      enrolled: 0,
      registered: 0,
      certified: 0
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}