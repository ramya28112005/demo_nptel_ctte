import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const rows = db.prepare("SELECT * FROM departments").all();
      res.status(200).json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch departments' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}