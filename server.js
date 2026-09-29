/**
 * Casseus Health & Wellness — zero-dependency backend
 * Surveys, email notifications (SMTP optional), static site hosting
 * Start: node server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const net = require('net');
const tls = require('tls');
const stripe = require('./stripe');

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  });
}
loadEnv();

const PORT = Number(process.env.PORT || 3001);
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'casseus137@gmail.com';
const SITE_ROOT = __dirname;
const DATA_DIR = path.join(__dirname, 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}
function readList(name) {
  ensureDataDir();
  const fp = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(fp)) return [];
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return []; }
}
function writeList(name, list) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, name + '.json'), JSON.stringify(list, null, 2));
}
function appendList(name, item) {
  const list = readList(name);
  list.push(item);
  writeList(name, list);
  return item;
}
function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
function escapeHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function sendSmtp({ to, subject, text, html, replyTo }) {
  return new Promise((resolve, reject) => {
    if (!smtpConfigured()) {
      console.log('[email:simulated]', { to, subject, preview: (text || '').slice(0, 160) });
      return resolve({ ok: true, simulated: true });
    }
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromName = process.env.FROM_NAME || 'Casseus Health & Wellness';
    const fromEmail = process.env.FROM_EMAIL || user;
    const boundary = 'casseus_' + Date.now();
    const body = html
      ? ['--'+boundary,'Content-Type: text/plain; charset=utf-8','',text||'','--'+boundary,'Content-Type: text/html; charset=utf-8','',html,'--'+boundary+'--'].join('\r\n')
      : (text || '');
    const headers = [
      'From: "'+fromName+'" <'+fromEmail+'>',
      'To: '+to,
      'Subject: '+subject,
      'MIME-Version: 1.0',
      html ? 'Content-Type: multipart/alternative; boundary="'+boundary+'"' : 'Content-Type: text/plain; charset=utf-8',
    ];
    if (replyTo) headers.push('Reply-To: '+replyTo);
    const data = headers.join('\r\n') + '\r\n\r\n' + body + '\r\n.\r\n';

    let socket;
    let buffer = '';
    let step = 0;

    function send(cmd) { socket.write(cmd + '\r\n'); }

    function onLine(line) {
      const code = parseInt(line.slice(0, 3), 10);
      if (step === 0) { step = 1; send('EHLO localhost'); }
      else if (step === 1 && code === 250) {
        if (line.startsWith('250 ')) { step = 2; send('STARTTLS'); }
      } else if (step === 2) {
        if (code === 220) {
          socket.removeAllListeners('data');
          const secure = tls.connect({ socket, servername: host }, () => {
            socket = secure; buffer = ''; step = 3;
            socket.on('data', onData);
            send('EHLO localhost');
          });
          secure.on('error', reject);
        } else { step = 4; send('AUTH LOGIN'); }
      } else if (step === 3 && code === 250) {
        if (line.startsWith('250 ')) { step = 4; send('AUTH LOGIN'); }
      } else if (step === 4 && code === 334) { step = 5; send(Buffer.from(user).toString('base64')); }
      else if (step === 5 && code === 334) { step = 6; send(Buffer.from(pass).toString('base64')); }
      else if (step === 6 && code === 235) { step = 7; send('MAIL FROM:<'+fromEmail+'>'); }
      else if (step === 7 && code === 250) { step = 8; send('RCPT TO:<'+to+'>'); }
      else if (step === 8 && code === 250) { step = 9; send('DATA'); }
      else if (step === 9 && code === 354) { step = 10; socket.write(data); }
      else if (step === 10 && code === 250) { step = 11; send('QUIT'); resolve({ ok: true, simulated: false }); }
      else if (code >= 400) reject(new Error('SMTP error: ' + line));
    }

    function onData(chunk) {
      buffer += chunk.toString();
      let idx;
      while ((idx = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (line) onLine(line);
      }
    }

    socket = net.connect(port, host, () => { socket.on('data', onData); });
    socket.setTimeout(20000, () => { socket.destroy(); reject(new Error('SMTP timeout')); });
    socket.on('error', reject);
  });
}

async function sendMail(opts) {
  try { return await sendSmtp(opts); }
  catch (err) {
    console.error('[email:error]', err.message);
    console.log('[email:fallback-log]', { to: opts.to, subject: opts.subject });
    return { ok: true, simulated: true, error: err.message };
  }
}

function surveyEmail(survey) {
  const stars = '★'.repeat(survey.rating) + '☆'.repeat(5 - survey.rating);
  const subject = '[Survey] ' + survey.rating + '/5 from ' + survey.name;
  const text = ['Casseus Health & Wellness — Client Survey','Name: '+survey.name,'Email: '+survey.email,'Rating: '+survey.rating+'/5 '+stars,'Date: '+survey.submittedAt,'','Comments:',survey.comment||'(none)'].join('\n');
  const html = '<div style="font-family:system-ui,sans-serif;color:#0a2540;max-width:560px"><h2>Client Survey Report</h2><p style="font-size:22px;color:#00bfa5">'+stars+' <span style="font-size:14px;color:#64748b">'+survey.rating+'/5</span></p><p><strong>Name:</strong> '+escapeHtml(survey.name)+'<br><strong>Email:</strong> '+escapeHtml(survey.email)+'<br><strong>Date:</strong> '+escapeHtml(survey.submittedAt)+'</p><h3>Comments</h3><p style="background:#f8fafc;padding:12px;border-radius:8px">'+escapeHtml(survey.comment||'(none)')+'</p></div>';
  return { subject, text, html };
}

function notifyEmail(title, fields) {
  const subject = '[Casseus] ' + title;
  const text = [title].concat(Object.entries(fields).map(([k,v]) => k+': '+v)).join('\n');
  const html = '<div style="font-family:system-ui,sans-serif;color:#0a2540"><h2>'+escapeHtml(title)+'</h2><table>'+Object.entries(fields).map(([k,v]) => '<tr><td style="padding:6px 12px 6px 0"><strong>'+escapeHtml(k)+'</strong></td><td>'+escapeHtml(String(v??''))+'</td></tr>').join('')+'</table></div>';
  return { subject, text, html };
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function readBody(req) {
  return readRawBody(req).then((buf) => {
    const raw = buf.toString('utf8');
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON'); }
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.md': 'text/plain; charset=utf-8',
};

/**
 * Critical resource hints for HTML documents.
 * HTTP/2 Server Push was removed from Chrome (106+) and Firefox; browsers
 * ignore PUSH_PROMISE. Use 103 Early Hints + Link: rel=preload instead.
 * @see https://developer.chrome.com/blog/removing-push
 */
function htmlResourceHints(pathname) {
  const links = [
    '</styles.css>; rel=preload; as=style',
    '</script.js>; rel=preload; as=script',
  ];
  // Homepage: also hint the LCP hero image
  if (pathname === '/' || pathname === '/index.html') {
    links.unshift('</assets/538-hero.webp>; rel=preload; as=image; type=image/webp');
  }
  if (pathname === '/store.html') {
    links.push('</store.js>; rel=preload; as=script');
  }
  return links;
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(SITE_ROOT, pathname === '/' ? 'index.html' : pathname);
  filePath = path.normalize(filePath);
  if (!filePath.startsWith(SITE_ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Avoid SPA fallback for missing assets (e.g. .js/.css/.jpg)
    const ext0 = path.extname(pathname).toLowerCase();
    if (ext0 && ext0 !== '.html') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    filePath = path.join(SITE_ROOT, 'index.html');
    pathname = '/index.html';
  }
  const ext = path.extname(filePath).toLowerCase();
  const isHtml = ext === '.html';
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  };

  // Cache static assets; keep HTML fresher for deploys
  if (isHtml) {
    headers['Cache-Control'] = 'no-cache';
    const link = htmlResourceHints(pathname).join(', ');
    headers['Link'] = link;

    // 103 Early Hints — browser may start fetches during "server think time"
    // Supported in Node 18+ via writeEarlyHints; safe no-op if unavailable.
    if (typeof res.writeEarlyHints === 'function') {
      try {
        res.writeEarlyHints({ link: htmlResourceHints(pathname) });
      } catch (_) { /* ignore */ }
    }
  } else if (['.css', '.js', '.webp', '.jpg', '.jpeg', '.png', '.svg', '.woff2', '.mp4'].includes(ext)) {
    headers['Cache-Control'] = 'public, max-age=86400, stale-while-revalidate=604800';
  }

  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true, service: 'casseus-backend', smtpConfigured: smtpConfigured(),
      stripeConfigured: stripe.stripeConfigured(),
      ownerEmail: OWNER_EMAIL, time: new Date().toISOString(),
    });
  }

  if (pathname === '/api/stripe/config' && req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      enabled: stripe.stripeConfigured(),
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    });
  }

  if (pathname === '/api/stripe/create-checkout-session' && req.method === 'POST') {
    if (!stripe.stripeConfigured()) {
      return sendJson(res, 503, {
        ok: false,
        error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to backend/.env',
        demo: true,
      });
    }
    try {
      const body = await readBody(req);
      const kind = body.kind === 'shop' ? 'shop' : (body.kind === 'session' ? 'session' : 'package');
      let session;
      if (kind === 'session') {
        session = await stripe.createSessionCheckout({
          serviceType: body.serviceType || body.type,
          location: body.location,
          date: body.date,
          time: body.time,
          customerEmail: body.email,
          customerName: body.name,
          successPath: '/index.html',
          cancelPath: '/index.html#booking',
          metadata: {
            phone: body.phone || '',
            address: body.address || '',
            notes: (body.notes || '').slice(0, 200),
          },
        }, req);
      } else if (kind === 'shop') {
        session = await stripe.createShopCheckout({
          items: body.items || [],
          recurring: !!body.recurring,
          customerEmail: body.email,
          customerName: body.name,
          successPath: '/store.html',
          cancelPath: '/store.html',
          metadata: {
            phone: body.phone || '',
            address: body.address || '',
            affiliateRef: body.affiliateRef || '',
          },
        }, req);
      } else {
        if (!stripe.PACKAGES[body.packageId]) {
          return sendJson(res, 400, { ok: false, error: 'Unknown package' });
        }
        session = await stripe.createPackageCheckout({
          packageId: body.packageId,
          recurring: !!body.recurring,
          customerEmail: body.email,
          customerName: body.name,
          successPath: '/index.html',
          cancelPath: '/index.html#pricing',
          metadata: {
            phone: body.phone || '',
            affiliateRef: body.affiliateRef || '',
            packageId: body.packageId,
          },
        }, req);
      }
      appendList('stripe_sessions', {
        id: session.id,
        kind,
        packageId: body.packageId || null,
        email: body.email || null,
        recurring: !!body.recurring,
        at: new Date().toISOString(),
      });
      return sendJson(res, 200, { ok: true, id: session.id, url: session.url });
    } catch (err) {
      console.error('Stripe checkout error:', err.message);
      return sendJson(res, err.status || 500, { ok: false, error: err.message || 'Checkout failed' });
    }
  }

  if (pathname === '/api/stripe/session' && req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) return sendJson(res, 400, { ok: false, error: 'session_id required' });
    if (!stripe.stripeConfigured()) return sendJson(res, 503, { ok: false, error: 'Stripe not configured' });
    try {
      const session = await stripe.retrieveSession(sessionId);
      const paid = session.payment_status === 'paid' || session.status === 'complete';
      return sendJson(res, 200, {
        ok: true,
        paid,
        status: session.status,
        payment_status: session.payment_status,
        customer_email: session.customer_email || (session.customer_details && session.customer_details.email),
        amount_total: session.amount_total,
        currency: session.currency,
        mode: session.mode,
        metadata: session.metadata || {},
        packageId: (session.metadata && session.metadata.packageId) || session.client_reference_id,
      });
    } catch (err) {
      return sendJson(res, err.status || 500, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/stripe/webhook' && req.method === 'POST') {
    const raw = await readRawBody(req);
    const rawStr = raw.toString('utf8');
    const verified = stripe.verifyWebhook(rawStr, req.headers['stripe-signature']);
    if (!verified.ok) return sendJson(res, 400, { ok: false, error: verified.error });
    const event = verified.event;
    appendList('stripe_events', { id: event.id, type: event.type, at: new Date().toISOString() });
    if (event.type === 'checkout.session.completed') {
      const sess = event.data && event.data.object;
      appendList('orders', {
        stripeSessionId: sess && sess.id,
        email: sess && (sess.customer_email || (sess.customer_details && sess.customer_details.email)),
        amount: sess && sess.amount_total,
        metadata: sess && sess.metadata,
        at: new Date().toISOString(),
      });
      if (sess) {
        const mail = notifyEmail('Stripe payment received', {
          Session: sess.id,
          Email: sess.customer_email || '',
          Amount: sess.amount_total ? ('$' + (sess.amount_total / 100).toFixed(2)) : '',
          Mode: sess.mode || '',
          Package: (sess.metadata && sess.metadata.packageId) || '',
        });
        await sendMail({ to: OWNER_EMAIL, subject: mail.subject, text: mail.text, html: mail.html });
      }
    }
    return sendJson(res, 200, { ok: true, received: true });
  }

  if (pathname === '/api/surveys' && req.method === 'GET') {
    const surveys = readList('surveys');
    return sendJson(res, 200, { ok: true, count: surveys.length, surveys });
  }

  if (pathname === '/api/surveys' && req.method === 'POST') {
    const body = await readBody(req);
    const { name, email, rating, comment } = body;
    if (!name || !email || !rating) return sendJson(res, 400, { ok: false, error: 'name, email, and rating are required' });
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) return sendJson(res, 400, { ok: false, error: 'rating must be 1–5' });
    const survey = {
      id: 'SRV-' + Date.now().toString(36).toUpperCase(),
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      rating: r,
      comment: String(comment || '').trim(),
      submittedAt: new Date().toISOString(),
    };
    appendList('surveys', survey);
    const mail = surveyEmail(survey);
    const mailResult = await sendMail({ to: OWNER_EMAIL, subject: mail.subject, text: mail.text, html: mail.html, replyTo: survey.email });
    appendList('email_log', { type: 'survey_report', to: OWNER_EMAIL, surveyId: survey.id, simulated: !!mailResult.simulated, at: new Date().toISOString() });
    return sendJson(res, 200, { ok: true, surveyId: survey.id, emailedTo: OWNER_EMAIL, emailSimulated: !!mailResult.simulated });
  }

  if (pathname === '/api/notify' && req.method === 'POST') {
    const body = await readBody(req);
    const { type, title, fields, replyTo } = body;
    if (!type || !title) return sendJson(res, 400, { ok: false, error: 'type and title required' });
    const record = { id: 'NTF-' + Date.now().toString(36).toUpperCase(), type, title, fields: fields || {}, at: new Date().toISOString() };
    appendList('notifications', record);
    const mail = notifyEmail(title, fields || {});
    const mailResult = await sendMail({
      to: OWNER_EMAIL, subject: mail.subject, text: mail.text, html: mail.html,
      replyTo: replyTo || (fields && (fields.Email || fields.email)),
    });
    appendList('email_log', { type, to: OWNER_EMAIL, simulated: !!mailResult.simulated, at: new Date().toISOString() });
    return sendJson(res, 200, { ok: true, id: record.id, emailedTo: OWNER_EMAIL, emailSimulated: !!mailResult.simulated });
  }

  if (pathname === '/api/bookings' && req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    const date = url.searchParams.get('date');
    let bookings = readList('bookings');
    if (date) bookings = bookings.filter((b) => b.date === date);
    const publicList = bookings.map((b) => ({
      id: b.id, date: b.date, time: b.time, type: b.type, service: b.service,
    }));
    return sendJson(res, 200, { ok: true, count: publicList.length, bookings: publicList });
  }

  if (pathname === '/api/bookings' && req.method === 'POST') {
    const body = await readBody(req);
    const date = String(body.date || '').trim();
    const time = String(body.time || '').trim();
    if (!date || !time || !body.name || !body.email) {
      return sendJson(res, 400, { ok: false, error: 'date, time, name, and email are required' });
    }
    const existing = readList('bookings');
    if (existing.some((b) => b.date === date && b.time === time)) {
      return sendJson(res, 409, { ok: false, error: 'That time slot is already booked' });
    }
    const booking = {
      id: body.id || ('BK' + Date.now()),
      service: body.service || body.type || 'Session',
      type: body.type || '',
      date, time,
      name: String(body.name).trim(),
      phone: String(body.phone || '').trim(),
      email: String(body.email).trim().toLowerCase(),
      location: body.location || '',
      address: body.address || '',
      notes: body.notes || '',
      amount: Number(body.amount) || 0,
      travelFee: Number(body.travelFee) || 0,
      packageUsed: body.packageUsed || null,
      createdAt: new Date().toISOString(),
    };
    appendList('bookings', booking);
    const mail = notifyEmail('New booking — slot locked', {
      Service: booking.service,
      Date: booking.date,
      Time: booking.time,
      Name: booking.name,
      Email: booking.email,
      Phone: booking.phone,
      Location: booking.location,
      Address: booking.address,
      Amount: '$' + Number(booking.amount).toFixed(2),
    });
    const mailResult = await sendMail({
      to: OWNER_EMAIL, subject: mail.subject, text: mail.text, html: mail.html, replyTo: booking.email,
    });
    return sendJson(res, 200, { ok: true, booking: { id: booking.id, date: booking.date, time: booking.time }, emailedTo: OWNER_EMAIL, emailSimulated: !!mailResult.simulated });
  }

  if (pathname === '/api/packages' && req.method === 'POST') {
    const body = await readBody(req);
    appendList('packages', { ...body, savedAt: new Date().toISOString() });
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/waivers' && req.method === 'POST') {
    const body = await readBody(req);
    appendList('waivers', { ...body, savedAt: new Date().toISOString() });
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/products/rotation' && req.method === 'GET') {
    const epoch = new Date('2026-09-01T00:00:00Z');
    const weeks = Math.floor((Date.now() - epoch.getTime()) / (14 * 24 * 60 * 60 * 1000));
    return sendJson(res, 200, { ok: true, biweeklyIndex: weeks, nextRotate: new Date(epoch.getTime() + (weeks + 1) * 14 * 24 * 60 * 60 * 1000).toISOString() });
  }

  if (pathname === '/api/weekly-report' && req.method === 'POST') {
    const body = await readBody(req);
    const { subject, text, html, week } = body;
    if (!text && !html) return sendJson(res, 400, { ok: false, error: 'text or html required' });
    const mailResult = await sendMail({
      to: OWNER_EMAIL,
      subject: subject || ('Weekly Report' + (week ? ' — ' + week : '') + ' — Casseus Health & Wellness'),
      text: text || 'See HTML version.',
      html: html || undefined,
    });
    appendList('email_log', { type: 'weekly_report', to: OWNER_EMAIL, week: week || null, simulated: !!mailResult.simulated, at: new Date().toISOString() });
    return sendJson(res, 200, { ok: true, emailedTo: OWNER_EMAIL, emailSimulated: !!mailResult.simulated });
  }

  sendJson(res, 404, { ok: false, error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
      return;
    }
    serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: err.message || 'Server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Casseus backend on http://localhost:' + PORT);
  console.log('  Health:  http://localhost:' + PORT + '/api/health');
  console.log('  Site:    http://localhost:' + PORT + '/');
  console.log('  Hints:   103 Early Hints + Link preload (HTTP/2 Push is obsolete in browsers)');
  console.log('  SMTP:    ' + (smtpConfigured() ? 'configured' : 'not set — emails simulated in this console'));
  console.log('  Stripe:  ' + (stripe.stripeConfigured() ? 'configured' : 'not set — checkout falls back to demo mode'));
  console.log('  Owner:   ' + OWNER_EMAIL);
});
