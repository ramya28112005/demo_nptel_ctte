import { Handler } from '@netlify/functions';
import { db } from './_db';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const activeSem = db.prepare("SELECT id FROM semesters WHERE is_active = 1").get();
      if (!activeSem) return {
        statusCode: 400,
        body: JSON.stringify({ error: "No active semester" })
      };

      const enrolledRows = db.prepare("SELECT COUNT(*) as count FROM student_records WHERE semester_id = ? AND module_type = 4").get(activeSem.id);
      const registeredRows = db.prepare("SELECT COUNT(*) as count FROM student_records WHERE semester_id = ? AND module_type = 5").get(activeSem.id);
      const certifiedRows = db.prepare(`
        SELECT COUNT(*) as count
        FROM student_records
        WHERE semester_id = ?
        AND module_type = 6
        AND LOWER(status) IN ('certified', 'elite', 'elite + silver', 'elite + gold', 'successfully completed', 'passed', 'elite+silver', 'elite+gold')
      `).get(activeSem.id);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrolled: enrolledRows.count,
          registered: registeredRows.count,
          certified: certifiedRows.count
        })
      };
    } else {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch dashboard stats' })
    };
  }
};