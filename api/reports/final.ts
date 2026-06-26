import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const activeSem = db.prepare("SELECT id FROM semesters WHERE is_active = 1").get();
      if (!activeSem) return res.status(400).json({ error: "No active semester" });

      // Course-wise Performance Summary
      const courseStats = db.prepare(`
        SELECT
          course_name,
          SUM(CASE WHEN module_type = 4 THEN 1 ELSE 0 END) as enrolled,
          SUM(CASE WHEN module_type = 5 THEN 1 ELSE 0 END) as registered,
          SUM(CASE
            WHEN module_type = 6 AND LOWER(status) IN ('certified', 'elite', 'elite + silver', 'elite + gold', 'successfully completed', 'passed', 'elite+silver', 'elite+gold')
            THEN 1 ELSE 0 END) as successful,
          SUM(CASE
            WHEN module_type = 6 AND (LOWER(status) = 'elite' OR (LOWER(status) LIKE '%elite%' AND LOWER(status) NOT LIKE '%silver%' AND LOWER(status) NOT LIKE '%gold%'))
            THEN 1 ELSE 0 END) as elite,
          SUM(CASE
            WHEN module_type = 6 AND (LOWER(status) IN ('elite + silver', 'elite+silver', 'silver') OR LOWER(status) LIKE '%silver%')
            THEN 1 ELSE 0 END) as elite_silver,
          SUM(CASE
            WHEN module_type = 6 AND (LOWER(status) IN ('elite + gold', 'elite+gold', 'gold') OR LOWER(status) LIKE '%gold%')
            THEN 1 ELSE 0 END) as elite_gold
        FROM student_records
        WHERE semester_id = ?
        GROUP BY course_name
        ORDER BY course_name ASC
      `).all(activeSem.id);

      res.status(200).json({
        courses: courseStats
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch report data' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}