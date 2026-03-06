import { Handler } from '@netlify/functions';
import { db, UPLOADS_DIR } from './_db';
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

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'POST') {
      const { semester_id, registrations, base64, fileName } = JSON.parse(event.body || '{}');

      if (base64 && fileName) {
        const timestamp = Date.now();
        const safeFileName = `${timestamp}_Registration_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, safeFileName), Buffer.from(base64, 'base64'));
      }

      db.prepare("DELETE FROM student_records WHERE semester_id = ? AND module_type = 5").run(semester_id);

      const findDept = db.prepare("SELECT id FROM departments WHERE code = ?");
      const insertRecord = db.prepare(`
        INSERT INTO student_records (semester_id, email, course_name, module_type, dept_id)
        VALUES (?, ?, ?, 5, ?)
      `);

      const transaction = db.transaction((data) => {
        for (const r of data) {
          const email = r.email.toLowerCase();
          const match = email.match(/\d+([a-z]+)\d*@/);
          const deptCode = match ? match[1] : null;
          const dept = deptCode ? findDept.get(deptCode) : null;

          const unifiedName = resolveCourseName(semester_id, r.course_id, r.course_name);
          insertRecord.run(semester_id, email, unifiedName, dept ? dept.id : null);
        }
      });
      transaction(registrations);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, rows: registrations.length })
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
      body: JSON.stringify({ error: 'Failed to upload registrations' })
    };
  }
};