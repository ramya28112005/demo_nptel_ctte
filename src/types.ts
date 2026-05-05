export interface Semester {
  id: number;
  year: number;
  period: string;
  is_active: number;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  hod_email: string | null;
}

export interface CourseStats {
  course_name: string;
  enrolled: number;
  registered: number;
  successful: number;
  elite: number;
  elite_silver: number;
  elite_gold: number;
}

export interface Stats {
  courses: number;
  enrolled: number;
  enrolledRows?: number;
  registered: number;
  registeredRows?: number;
  certified: number;
  certifiedRows?: number;
}
