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

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courses: courseStats
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
      body: JSON.stringify({ error: 'Failed to fetch report data' })
    };
  }
};