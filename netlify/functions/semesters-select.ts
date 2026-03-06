import { Handler } from '@netlify/functions';
import { db } from './_db';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'POST') {
      const { id } = JSON.parse(event.body || '{}');
      db.prepare("UPDATE semesters SET is_active = 0").run();
      db.prepare("UPDATE semesters SET is_active = 1 WHERE id = ?").run(id);
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
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};