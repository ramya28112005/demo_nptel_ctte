import { Handler } from '@netlify/functions';
import { db } from './_db';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'POST') {
      const { hods } = JSON.parse(event.body || '{}'); // Array of { id, email }
      const update = db.prepare("UPDATE departments SET hod_email = ? WHERE id = ?");
      const transaction = db.transaction((data) => {
        for (const item of data) update.run(item.email, item.id);
      });
      transaction(hods);
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