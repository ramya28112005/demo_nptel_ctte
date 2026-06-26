import { VercelRequest, VercelResponse } from '@vercel/node';
import { db, UPLOADS_DIR } from '../../lib/db';
import fs from 'fs';
import path from 'path';

// Helper to resolve canonical course name
const resolveCourseName = (semester_id: number, course_id: string, course_name: string) => {
  // Try to find existing course entry by ID or Name
  let course = db.prepare(`
    SELECT course_name FROM courses
    WHERE semester_id = ?
    AND (
      LOWER(TRIM(course_id)) = LOWER(TRIM(?))
      OR LOWER(TRIM(course_name)) = LOWER(TRIM(?))
      OR (course_id IS NOT NULL AND LOWER(TRIM(course_id)) = LOWER(TRIM(?)))
    )
  `).get(semester_id, course_id, course_name, course_name);

  if (course) return course.course_name;

  // If not found, create a canonical entry
  const finalName = course_name || course_id;
  db.prepare("INSERT OR IGNORE INTO courses (semester_id, course_id, course_name) VALUES (?, ?, ?)")
    .run(semester_id, course_id, finalName);
  return finalName;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { semester_id, results, base64, fileName } = req.body;

      if (base64 && fileName) {
        const timestamp = Date.now();
        const safeFileName = `${timestamp}_Results_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, safeFileName), Buffer.from(base64, 'base64'));
      }

      db.prepare("DELETE FROM student_records WHERE semester_id = ? AND module_type = 6").run(semester_id);

      const findDept = db.prepare("SELECT id FROM departments WHERE code = ?");
      const insertRecord = db.prepare(`
        INSERT INTO student_records (semester_id, email, course_name, module_type, score, status, dept_id)
        VALUES (?, ?, ?, 6, ?, ?, ?)
      `);

      let insertedCount = 0;
      const transaction = db.transaction((data) => {
        for (const r of data) {
          // Validate required fields
          if (!r.email || !r.course_name) continue;
          
          const email = r.email.toLowerCase().trim();
          const courseName = (r.course_name || r.course_id || '').trim();
          const score = r.score || r.marks || 0;
          const status = (r.status || '').trim();
          
          if (!email || !courseName) continue;

          const match = email.match(/\d+([a-z]+)\d*@/);
          const deptCode = match ? match[1] : null;
          const dept = deptCode ? findDept.get(deptCode) : null;

          const unifiedName = resolveCourseName(semester_id, r.course_id, courseName);
          try {
            insertRecord.run(semester_id, email, unifiedName, score, status, dept ? dept.id : null);
            insertedCount++;
          } catch (err) {
            // Skip failed inserts but continue processing
            console.error('Failed to insert result:', err);
          }
        }
      });
      transaction(results);
      
      // Verify actual count in database
      const actualCount = db.prepare("SELECT COUNT(*) as count FROM student_records WHERE semester_id = ? AND module_type = 6").get(semester_id) as any;
      res.status(200).json({ success: true, rows: actualCount.count, processed: results.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload results' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}