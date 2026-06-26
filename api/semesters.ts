import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const rows = db.prepare("SELECT * FROM semesters ORDER BY year DESC, period DESC").all();
      res.status(200).json(rows);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch semesters' });
    }
  } else if (req.method === 'POST') {
    try {
      const { year, period } = req.body;
      db.prepare("UPDATE semesters SET is_active = 0").run();
      const result = db.prepare("INSERT INTO semesters (year, period, is_active) VALUES (?, ?, 1)").run(year, period);
      res.status(200).json({ id: result.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create semester' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}