import { Semester, Department, CourseStats, Stats } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const dataService = {
  async createSemester(year: number, period: string): Promise<{ id: number } | { success: boolean }> {
    const res = await fetch(`${API_BASE}/semesters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, period })
    });
    if (!res.ok) throw new Error(`Failed to create semester (${res.status})`);
    return res.json();
  },

  async getSemesters(): Promise<Semester[]> {
    const res = await fetch(`${API_BASE}/semesters`);
    if (!res.ok) return [];
    return res.json();
  },

  async selectSemester(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/semesters/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error(`Failed to select semester (${res.status})`);
    return res.json();
  },

  async getDepartments(): Promise<Department[]> {
    try {
      const res = await fetch(`${API_BASE}/departments`);
      if (!res.ok) throw new Error('API error');
      let depts = await res.json();
      // Always merge with saved HOD emails from localStorage
      try {
        const saved = localStorage.getItem('hod_emails');
        if (saved) {
          const savedHods: { id: number; email: string }[] = JSON.parse(saved);
          const map = new Map(savedHods.map(h => [h.id, h.email]));
          depts = depts.map(d => ({ ...d, hod_email: map.get(d.id) || d.hod_email }));
        }
      } catch (err) {
        // ignore localStorage issues
      }
      return depts;
    } catch (e) {
      // Fallback local list so UI can function without backend
      const depts: Department[] = [
        { id: 1, name: 'B.A. English', code: 'baeng', hod_email: '' },
        { id: 2, name: 'B.Sc. Mathematics', code: 'bscmath', hod_email: '' },
        { id: 3, name: 'B.Sc. Physics', code: 'bscphy', hod_email: '' },
        { id: 4, name: 'B.Sc. Chemistry', code: 'bscche', hod_email: '' },
        { id: 5, name: 'B.Sc. Psychology', code: 'bscpsy', hod_email: '' },
        { id: 6, name: 'B.Sc. Computer Science', code: 'bsccs', hod_email: '' },
        { id: 7, name: 'B.C.A.', code: 'bca', hod_email: '' },
        { id: 8, name: 'B.Com General', code: 'bcom', hod_email: '' },
        { id: 9, name: 'B.Com Accounts and Finance', code: 'bcomaf', hod_email: '' },
        { id: 10, name: 'B.Com Corporate Secretaryship', code: 'bcomcs', hod_email: '' },
        { id: 11, name: 'B.B.A.', code: 'bba', hod_email: '' },
        { id: 12, name: 'M.A. English', code: 'maeng', hod_email: '' },
        { id: 13, name: 'M.Com', code: 'mcom', hod_email: '' },
        { id: 14, name: 'M.S.W.', code: 'msw', hod_email: '' }
      ];
      try {
        const saved = localStorage.getItem('hod_emails');
        if (saved) {
          const savedHods: { id: number; email: string }[] = JSON.parse(saved);
          const map = new Map(savedHods.map(h => [h.id, h.email]));
          depts.forEach(d => { if (map.has(d.id)) d.hod_email = map.get(d.id) || ''; });
        }
      } catch (err) {
        // ignore localStorage issues
      }
      return depts;
    }
  },

  async saveHods(hods: { id: number; email: string }[]): Promise<{ success: boolean }> {
    try { localStorage.setItem('hod_emails', JSON.stringify(hods)); } catch (e) { /* ignore */ }
    try {
      const res = await fetch(`${API_BASE}/hod/setup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hods })
      });
      if (!res.ok) throw new Error('Failed to save HODs');
      return res.json();
    } catch (e) {
      return { success: true };
    }
  },

  async getDashboardStats(): Promise<Stats> {
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    } catch (e) {
      return { courses: 0, enrolled: 0, registered: 0, certified: 0 };
    }
  },

  async getReportData(): Promise<{ courses: CourseStats[] }> {
    try {
      const res = await fetch(`${API_BASE}/reports/final`);
      if (!res.ok) throw new Error('Failed to fetch report data');
      return res.json();
    } catch (e) {
      console.error('Report data fetch error:', e);
      return { courses: [] };
    }
  },

  async sendEmail(payload: { to: string; subject: string; text?: string; html?: string; attachments?: any[] }): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Email failed');
      return res.json();
    } catch (e) {
      try {
        const notes = JSON.parse(localStorage.getItem('email_notifications') || '[]');
        notes.push({ to: payload.to, subject: payload.subject, text: payload.text || '', date: new Date().toISOString() });
        localStorage.setItem('email_notifications', JSON.stringify(notes.slice(-50)));
      } catch (err) { /* ignore */ }
      return { success: false };
    }
  },

  async uploadData(endpoint: string, payload: any): Promise<{ success: boolean; rows?: number }> {
    try {
      const effectiveEndpoint = endpoint.startsWith('/api') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      const res = await fetch(effectiveEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    } catch (e) {
      try {
        const logs = JSON.parse(localStorage.getItem('upload_logs') || '[]');
        logs.push({ endpoint, date: new Date().toISOString(), error: e instanceof Error ? e.message : String(e) });
        localStorage.setItem('upload_logs', JSON.stringify(logs.slice(-50)));
      } catch (err) { /* ignore */ }
      return { success: false };
    }
  },

  getEmailNotifications(): any[] {
    try { return JSON.parse(localStorage.getItem('email_notifications') || '[]'); } catch (e) { return []; }
  },

  getUploadLogs(): any[] {
    try { return JSON.parse(localStorage.getItem('upload_logs') || '[]'); } catch (e) { return []; }
  }
};

export default dataService;
