import { VercelRequest, VercelResponse } from '@vercel/node';

const departments = [
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.status(200).json(departments);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}