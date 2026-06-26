import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { hods } = req.body; // Array of { id, email }
      const update = db.prepare("UPDATE departments SET hod_email = ? WHERE id = ?");
      const transaction = db.transaction((data) => {
        for (const item of data) update.run(item.email, item.id);
      });
      transaction(hods);
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save HODs' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}