import { VercelRequest, VercelResponse } from '@vercel/node';
import { db, UPLOADS_DIR } from '../db.js';
import fs from 'fs';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { semester_id, courses, base64, fileName } = req.body;

      if (base64 && fileName) {
        const timestamp = Date.now();
        const safeFileName = `${timestamp}_Courses_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        fs.writeFileSync(path.join(UPLOADS_DIR, safeFileName), Buffer.from(base64, 'base64'));
      }

      // Delete existing courses for this semester
      db.prepare("DELETE FROM courses WHERE semester_id = ?").run(semester_id);

      const insert = db.prepare("INSERT OR REPLACE INTO courses (semester_id, dept_id, course_id, course_name) VALUES (?, ?, ?, ?)");
      let insertedCount = 0;
      
      const transaction = db.transaction((data) => {
        for (const c of data) {
          // Validate required fields
          if (!c.course_id || !c.course_name) continue;
          
          const courseId = (c.course_id || '').toString().trim();
          const courseName = (c.course_name || '').toString().trim();
          
          if (!courseId || !courseName) continue;
          
          try {
            insert.run(semester_id, c.dept_id || null, courseId, courseName);
            insertedCount++;
          } catch (err) {
            console.error('Failed to insert course:', err);
          }
        }
      });
      transaction(courses);
      
      // Verify actual count in database
      const actualCount = db.prepare("SELECT COUNT(*) as count FROM courses WHERE semester_id = ?").get(semester_id) as any;
      res.status(200).json({ success: true, rows: actualCount.count, processed: courses.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload courses' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}