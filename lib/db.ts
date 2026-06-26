import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

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

export { db, UPLOADS_DIR };