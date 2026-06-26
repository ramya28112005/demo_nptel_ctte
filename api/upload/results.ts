import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

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