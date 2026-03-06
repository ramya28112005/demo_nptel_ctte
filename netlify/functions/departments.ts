import { Handler } from '@netlify/functions';
import { db } from './_db';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      const rows = db.prepare("SELECT * FROM departments").all();
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows)
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