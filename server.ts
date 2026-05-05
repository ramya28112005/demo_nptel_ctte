import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import nodemailer from "nodemailer";

const db = new Database("nptel_system.db");

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS student_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id INTEGER,
    email TEXT NOT NULL,
    course_name TEXT NOT NULL,
    module_type INTEGER NOT NULL, -- 4: Enrollment, 5: Registration, 6: Results
    score INTEGER,
    status TEXT,
    dept_id INTEGER,
    FOREIGN KEY(semester_id) REFERENCES semesters(id),
    FOREIGN KEY(dept_id) REFERENCES departments(id)
  );
` + `
  CREATE TABLE IF NOT EXISTS semesters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    period TEXT NOT NULL,
    is_active INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    hod_email TEXT
  );

  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id INTEGER,
    dept_id INTEGER,
    course_id TEXT,
    course_name TEXT,
    UNIQUE(semester_id, course_id),
    FOREIGN KEY(semester_id) REFERENCES semesters(id),
    FOREIGN KEY(dept_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    dept_id INTEGER,
    FOREIGN KEY(dept_id) REFERENCES departments(id)
  );

  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    semester_id INTEGER,
    student_id INTEGER,
    course_id TEXT,
    UNIQUE(semester_id, student_id, course_id),
    FOREIGN KEY(semester_id) REFERENCES semesters(id),
    FOREIGN KEY(student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_id INTEGER UNIQUE,
    is_registered INTEGER DEFAULT 0,
    FOREIGN KEY(enrollment_id) REFERENCES enrollments(id)
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    registration_id INTEGER UNIQUE,
    score INTEGER,
    status TEXT,
    FOREIGN KEY(registration_id) REFERENCES registrations(id)
  );
`);

// Seed Departments
const depts = [
  { name: "B.A. English", code: "baeng" },
  { name: "B.Sc. Mathematics", code: "bscmath" },
  { name: "B.Sc. Physics", code: "bscphy" },
  { name: "B.Sc. Chemistry", code: "bscche" },
  { name: "B.Sc. Psychology", code: "bscpsy" },
  { name: "B.Sc. Computer Science", code: "bsccs" },
  { name: "B.C.A.", code: "bca" },
  { name: "B.Com General", code: "bcom" },
  { name: "B.Com Accounts and Finance", code: "bcomaf" },
  { name: "B.Com Corporate Secretaryship", code: "bcomcs" },
  { name: "B.B.A.", code: "bba" },
  { name: "M.A. English", code: "maeng" },
  { name: "M.Com", code: "mcom" },
  { name: "M.S.W.", code: "msw" }
];

const insertDept = db.prepare("INSERT OR IGNORE INTO departments (name, code) VALUES (?, ?)");
depts.forEach(d => insertDept.run(d.name, d.code));

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  const GMAIL_USER = process.env.GMAIL_USER || 'cttenptelbsccs2326@gmail.com';
  const GMAIL_PASS = process.env.GMAIL_PASS || 'euymrjfjsqzgwcuj';

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS
    }
  });

  // Verify transporter on startup
  transporter.verify((error, success) => {
    if (error) {
      console.error("❌ SMTP Verification Error:", error);
    } else {
      console.log(`✅ SMTP Server is ready for ${GMAIL_USER}`);
    }
  });

  // API Routes
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, text, html, attachments } = req.body;
    
    try {
      await transporter.sendMail({
        from: `"CTTEWC NPTEL Coordinator" <${GMAIL_USER}>`,
        to,
        subject,
        text,
        html,
        attachments: attachments || []
      });
      console.log(`📧 Email sent successfully to ${to}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Email error:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

  app.get("/api/semesters", (req, res) => {
    const rows = db.prepare("SELECT * FROM semesters ORDER BY year DESC, period DESC").all();
    res.json(rows);
  });

  app.post("/api/semesters", (req, res) => {
    const { year, period } = req.body;
    db.prepare("UPDATE semesters SET is_active = 0").run();
    const result = db.prepare("INSERT INTO semesters (year, period, is_active) VALUES (?, ?, 1)").run(year, period);
    res.json({ id: result.lastInsertRowid });
  });

  app.post("/api/semesters/select", (req, res) => {
    const { id } = req.body;
    db.prepare("UPDATE semesters SET is_active = 0").run();
    db.prepare("UPDATE semesters SET is_active = 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/departments", (req, res) => {
    const rows = db.prepare("SELECT * FROM departments").all();
    res.json(rows);
  });

  app.post("/api/hod/setup", (req, res) => {
    const { hods } = req.body; // Array of { id, email }
    const update = db.prepare("UPDATE departments SET hod_email = ? WHERE id = ?");
    const transaction = db.transaction((data) => {
      for (const item of data) update.run(item.email, item.id);
    });
    transaction(hods);
    res.json({ success: true });
  });

  app.post("/api/upload/courses", (req, res) => {
    const { semester_id, courses, base64, fileName } = req.body;
    
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
    res.json({ success: true });
  });

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

  app.post("/api/upload/enrollments", (req, res) => {
    const { semester_id, enrollments, base64, fileName } = req.body;
    
    if (base64 && fileName) {
      const timestamp = Date.now();
      const safeFileName = `${timestamp}_Enrollment_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, safeFileName), Buffer.from(base64, 'base64'));
    }

    // remove any existing enrollment rows for this semester so upload replaces dataset
    db.prepare("DELETE FROM student_records WHERE semester_id = ? AND module_type = 4").run(semester_id);

    const findDept = db.prepare("SELECT id FROM departments WHERE code = ?");
    const insertRecord = db.prepare(`
      INSERT INTO student_records (semester_id, email, course_name, module_type, dept_id)
      VALUES (?, ?, ?, 4, ?)
    `);

    const transaction = db.transaction((data) => {
      for (const e of data) {
        const email = e.email.toLowerCase();
        const match = email.match(/\d+([a-z]+)\d*@/);
        const deptCode = match ? match[1] : null;
        const dept = deptCode ? findDept.get(deptCode) : null;
        
        const unifiedName = resolveCourseName(semester_id, e.course_id, e.course_name);
        insertRecord.run(semester_id, email, unifiedName, dept ? dept.id : null);
      }
    });
    transaction(enrollments);
    res.json({ success: true, rows: enrollments.length });
  });

  app.post("/api/upload/registrations", (req, res) => {
    const { semester_id, registrations, base64, fileName } = req.body;
    
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
    res.json({ success: true, rows: registrations.length });
  });

  app.post("/api/upload/results", (req, res) => {
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

    const transaction = db.transaction((data) => {
      for (const r of data) {
        const email = r.email.toLowerCase();
        const match = email.match(/\d+([a-z]+)\d*@/);
        const deptCode = match ? match[1] : null;
        const dept = deptCode ? findDept.get(deptCode) : null;

        const unifiedName = resolveCourseName(semester_id, r.course_id, r.course_name);
        insertRecord.run(semester_id, email, unifiedName, r.score, r.status, dept ? dept.id : null);
      }
    });
    transaction(results);
    res.json({ success: true, rows: results.length });
  });

  app.get("/api/dashboard/stats", (req, res) => {
    const activeSem = db.prepare("SELECT id FROM semesters WHERE is_active = 1").get();
    if (!activeSem) return res.json({ courses: 0, enrolled: 0, registered: 0, certified: 0 });

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

    res.json({
      courses: courseRows?.count ?? 0,
      enrolled: enrolledRows?.count ?? 0,
      registered: registeredRows?.count ?? 0,
      certified: certifiedRows?.count ?? 0
    });
  });

  app.get("/api/reports/final", (req, res) => {
    const activeSem = db.prepare("SELECT id FROM semesters WHERE is_active = 1").get();
    if (!activeSem) return res.json({ error: "No active semester" });

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

    res.json({
      courses: courseStats
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
