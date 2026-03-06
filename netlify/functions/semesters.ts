import { Handler } from '@netlify/functions';
import { db } from './_db';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const rows = db.prepare("SELECT * FROM semesters ORDER BY year DESC, period DESC").all();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows)
      };
    } else if (event.httpMethod === 'POST') {
      const { year, period } = JSON.parse(event.body || '{}');
      db.prepare("UPDATE semesters SET is_active = 0").run();
      const result = db.prepare("INSERT INTO semesters (year, period, is_active) VALUES (?, ?, 1)").run(year, period);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: result.lastInsertRowid })
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
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};