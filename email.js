/**
 * Email helper — Nodemailer with SMTP from env.
 * If SMTP is not configured, logs the message and returns { simulated: true }.
 */
const nodemailer = require('nodemailer');

function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransport() {
  if (!isSmtpConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail({ to, subject, text, html, replyTo }) {
  const fromName = process.env.FROM_NAME || 'Casseus Health & Wellness';
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || process.env.OWNER_EMAIL;
  const from = `"${fromName}" <${fromEmail}>`;
  const owner = process.env.OWNER_EMAIL || 'casseus137@gmail.com';

  const payload = {
    from,
    to: to || owner,
    subject,
    text,
    html: html || `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${text}</pre>`,
    replyTo: replyTo || undefined,
  };

  const transport = createTransport();
  if (!transport) {
    console.log('[email:simulated]', JSON.stringify({ to: payload.to, subject, text: text?.slice(0, 200) }));
    return { ok: true, simulated: true, to: payload.to };
  }

  const info = await transport.sendMail(payload);
  return { ok: true, simulated: false, messageId: info.messageId, to: payload.to };
}

function surveyReportEmail(survey) {
  const stars = '★'.repeat(survey.rating || 0) + '☆'.repeat(5 - (survey.rating || 0));
  const subject = `[Survey] ${survey.rating}/5 from ${survey.name || 'Client'}`;
  const text = [
    'Casseus Health & Wellness — Quarterly Client Survey',
    '================================================',
    `Name:    ${survey.name}`,
    `Email:   ${survey.email}`,
    `Rating:  ${survey.rating}/5  ${stars}`,
    `Date:    ${survey.submittedAt || new Date().toISOString()}`,
    '',
    'Comments:',
    survey.comment || '(none)',
    '',
    '— Automated report from casseus-website backend',
  ].join('\n');

  const html = `
    <div style="font-family:Montserrat,Open Sans,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0a2540;">
      <h2 style="color:#0a2540;">Client Survey Report</h2>
      <p style="font-size:1.5rem;color:#00bfa5;margin:8px 0;">${stars} <span style="font-size:1rem;color:#64748b;">${survey.rating}/5</span></p>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Name</strong></td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(survey.name)}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Email</strong></td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(survey.email)}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>Submitted</strong></td><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(survey.submittedAt || '')}</td></tr>
      </table>
      <h3 style="margin-top:20px;">Comments</h3>
      <p style="background:#f8fafc;padding:14px;border-radius:8px;line-height:1.5;">${escapeHtml(survey.comment || '(none)')}</p>
      <p style="font-size:12px;color:#64748b;margin-top:24px;">Casseus Health & Wellness · Automated survey report</p>
    </div>`;

  return { subject, text, html };
}

function genericNotifyEmail(title, fields) {
  const subject = `[Casseus] ${title}`;
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`);
  const text = [title, '='.repeat(title.length), ...lines, '', '— casseus-website backend'].join('\n');
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;color:#0a2540;">
      <h2>${escapeHtml(title)}</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${Object.entries(fields).map(([k, v]) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;"><strong>${escapeHtml(k)}</strong></td>
           <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapeHtml(String(v ?? ''))}</td></tr>`
        ).join('')}
      </table>
    </div>`;
  return { subject, text, html };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  sendMail,
  isSmtpConfigured,
  surveyReportEmail,
  genericNotifyEmail,
};
