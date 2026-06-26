import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    res.status(200).json({ success: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
          
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