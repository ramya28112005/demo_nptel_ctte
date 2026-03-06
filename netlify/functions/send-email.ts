import { Handler } from '@netlify/functions';
import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || 'cttenptelbsccs2326@gmail.com';
const GMAIL_PASS = process.env.GMAIL_PASS || 'euymrjfjsqzgwcuj';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  }
});

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'POST') {
      const { to, subject, text, html, attachments } = JSON.parse(event.body || '{}');

      await transporter.sendMail({
        from: `"CTTEWC NPTEL Coordinator" <${GMAIL_USER}>`,
        to,
        subject,
        text,
        html,
        attachments: attachments || []
      });

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
      body: JSON.stringify({ error: error.message || "Failed to send email" })
    };
  }
};