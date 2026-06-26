import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const activeSem = db.prepare("SELECT id FROM semesters WHERE is_active = 1").get();
      if (!activeSem) return res.status(400).json({ error: "No active semester" });

      const courseRows = db.prepare("SELECT COUNT(*) as count FROM courses WHERE semester_id = ?").get(activeSem.id);
      const enrolledRows = db.prepare("SELECT COUNT(*) as count FROM student_records WHERE semester_id = ? AND module_type = 4").get(activeSem.id);
      const registeredRows = db.prepare("SELECT COUNT(*) as count FROM student_records WHERE semester_id = ? AND module_type = 5").get(activeSem.id);
      const certifiedRows = db.prepare(`
        SELECT COUNT(*) as count
        FROM student_records
        WHERE semester_id = ?
        AND module_type = 6
        AND LOWER(status) IN ('certified', 'elite', 'elite + silver', 'elite + gold', 'successfully completed', 'passed', 'elite+silver', 'elite+gold')
      `).get(activeSem.id);

      res.status(200).json({
        courses: courseRows.count,
        enrolled: enrolledRows.count,
        registered: registeredRows.count,
        certified: certifiedRows.count
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}