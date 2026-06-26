import { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory store for this session
const semesters: any[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.status(200).json(semesters);
  } else if (req.method === 'POST') {
    try {
      const { year, period } = req.body;
      const id = Date.now();
      semesters.push({ id, year, period, is_active: 1 });
      res.status(200).json({ id, success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create semester' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}