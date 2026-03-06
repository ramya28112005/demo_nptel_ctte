import { Handler } from '@netlify/functions';
import { db, UPLOADS_DIR } from './_db';
import fs from 'fs';
import path from 'path';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'POST') {
      const { semester_id, courses, base64, fileName } = JSON.parse(event.body || '{}');

      if (base64 && fileName) {
        const timestamp = Date.now();
        const safeFileName = `${timestamp}_Courses_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, safeFileName), Buffer.from(base64, 'base64'));
      }

      const insert = db.prepare("INSERT OR REPLACE INTO courses (semester_id, dept_id, course_id, course_name) VALUES (?, ?, ?, ?)");
      const transaction = db.transaction((data) => {
        for (const c of data) {
          insert.run(semester_id, c.dept_id, c.course_id, c.course_name);
        }
      });
      transaction(courses);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
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
      body: JSON.stringify({ error: 'Failed to upload courses' })
    };
  }
};