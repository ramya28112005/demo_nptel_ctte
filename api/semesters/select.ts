import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { id } = req.body;
      db.prepare("UPDATE semesters SET is_active = 0").run();
      db.prepare("UPDATE semesters SET is_active = 1 WHERE id = ?").run(id);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to select semester' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}