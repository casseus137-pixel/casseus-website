/**
 * Stripe Checkout via HTTPS API (no npm stripe SDK).
 * Prices are taken from this catalog — never trust client-sent amounts.
 */
const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');

const PACKAGES = {
  's30-1': { name: '30-Min Stretch - 1x/Week', price: 280, sessions: 4 },
  's30-2': { name: '30-Min Stretch - 2x/Week', price: 520, sessions: 8 },
  's30-3': { name: '30-Min Stretch - 3x/Week', price: 715, sessions: 13 },
  's30-4': { name: '30-Min Stretch - 4x/Week', price: 865, sessions: 17 },
  's30-5': { name: '30-Min Stretch - 5x/Week', price: 975, sessions: 21 },
  's30-6': { name: '30-Min Stretch - 6x/Week', price: 1040, sessions: 26 },
  's60-1': { name: '60-Min Stretch - 1x/Week', price: 475, sessions: 4 },
  's60-2': { name: '60-Min Stretch - 2x/Week', price: 865, sessions: 8 },
  's60-3': { name: '60-Min Stretch - 3x/Week', price: 1235, sessions: 13 },
  's60-4': { name: '60-Min Stretch - 4x/Week', price: 1560, sessions: 17 },
  's60-5': { name: '60-Min Stretch - 5x/Week', price: 1840, sessions: 21 },
  's60-6': { name: '60-Min Stretch - 6x/Week', price: 2080, sessions: 26 },
  'pt30-1': { name: '30-Min PT - 1x/Week', price: 300, sessions: 4 },
  'pt30-2': { name: '30-Min PT - 2x/Week', price: 560, sessions: 8 },
  'pt30-3': { name: '30-Min PT - 3x/Week', price: 780, sessions: 13 },
  'pt30-4': { name: '30-Min PT - 4x/Week', price: 950, sessions: 17 },
  'pt60-1': { name: '60-Min PT - 1x/Week', price: 475, sessions: 4 },
  'pt60-2': { name: '60-Min PT - 2x/Week', price: 865, sessions: 8 },
  'pt60-3': { name: '60-Min PT - 3x/Week', price: 1235, sessions: 13 },
  'pt60-4': { name: '60-Min PT - 4x/Week', price: 1560, sessions: 17 },
};

const SINGLES = {
  stretch30: { name: '30-Min Assisted Stretch', price: 65 },
  stretch60: { name: '60-Min Full-Body Stretch', price: 110 },
  pt30: { name: '30-Min Personal Training', price: 75 },
  pt60: { name: '60-Min Personal Training', price: 120 },
};

const TRAVEL_ZONES = { tampa: 0, bradenton: 0, sarasota: 25 };

function stripeConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_'));
}

function stripeRequest(method, apiPath, params) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return Promise.reject(new Error('STRIPE_SECRET_KEY is not set'));
  const body = params ? querystring.stringify(params) : '';
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.stripe.com',
      path: apiPath,
      method,
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let data;
        try { data = JSON.parse(raw); } catch { return reject(new Error('Invalid Stripe response')); }
        if (res.statusCode >= 400) {
          const msg = (data.error && data.error.message) || 'Stripe error';
          const err = new Error(msg);
          err.status = res.statusCode;
          err.data = data;
          return reject(err);
        }
        resolve(data);
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function publicOrigin(req) {
  const fromEnv = process.env.PUBLIC_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3001';
  return proto + '://' + host;
}

function flatten(params, prefix, out) {
  Object.keys(params).forEach((key) => {
    const val = params[key];
    const k = prefix ? prefix + '[' + key + ']' : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) flatten(val, k, out);
    else if (Array.isArray(val)) val.forEach((v, i) => {
      if (v !== null && typeof v === 'object') flatten(v, k + '[' + i + ']', out);
      else out[k + '[' + i + ']'] = v;
    });
    else if (val !== undefined && val !== null) out[k] = String(val);
  });
  return out;
}

async function createPackageCheckout({ packageId, recurring, customerEmail, customerName, successPath, cancelPath, metadata }, req) {
  const pkg = PACKAGES[packageId];
  if (!pkg) throw Object.assign(new Error('Unknown package'), { status: 400 });
  const origin = publicOrigin(req);
  const unitAmount = Math.round(Number(pkg.price) * 100);
  const params = {
    mode: recurring ? 'subscription' : 'payment',
    success_url: origin + (successPath || '/index.html') + '?stripe=success&session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origin + (cancelPath || '/index.html') + '?stripe=cancel',
    customer_email: customerEmail || undefined,
    client_reference_id: packageId,
    'automatic_payment_methods[enabled]': 'true',
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': unitAmount,
    'line_items[0][price_data][product_data][name]': pkg.name,
    'line_items[0][price_data][product_data][description]': 'Casseus Health & Wellness · ~' + pkg.sessions + ' sessions / month',
    'metadata[packageId]': packageId,
    'metadata[kind]': 'package',
    'metadata[customerName]': customerName || '',
  };
  if (recurring) {
    params['line_items[0][price_data][recurring][interval]'] = 'month';
  }
  if (metadata) {
    Object.keys(metadata).forEach((k) => {
      params['metadata[' + k + ']'] = String(metadata[k]).slice(0, 499);
    });
  }
  // remove undefined
  Object.keys(params).forEach((k) => { if (params[k] === undefined) delete params[k]; });
  return stripeRequest('POST', '/v1/checkout/sessions', params);
}

async function createShopCheckout({ items, recurring, customerEmail, customerName, successPath, cancelPath, metadata }, req) {
  if (!Array.isArray(items) || !items.length) {
    throw Object.assign(new Error('Cart is empty'), { status: 400 });
  }
  const origin = publicOrigin(req);
  const params = {
    mode: recurring ? 'subscription' : 'payment',
    success_url: origin + (successPath || '/store.html') + '?stripe=success&session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origin + (cancelPath || '/store.html') + '?stripe=cancel',
    customer_email: customerEmail || undefined,
    'automatic_payment_methods[enabled]': 'true',
    'metadata[kind]': 'shop',
    'metadata[customerName]': customerName || '',
  };
  if (metadata) {
    Object.keys(metadata).forEach((k) => {
      params['metadata[' + k + ']'] = String(metadata[k]).slice(0, 499);
    });
  }
  items.slice(0, 20).forEach((item, i) => {
    const qty = Math.max(1, Math.min(20, parseInt(item.qty, 10) || 1));
    const amount = Math.round(Number(item.price) * 100);
    if (!Number.isFinite(amount) || amount < 50) {
      throw Object.assign(new Error('Invalid item price'), { status: 400 });
    }
    params['line_items[' + i + '][quantity]'] = qty;
    params['line_items[' + i + '][price_data][currency]'] = 'usd';
    params['line_items[' + i + '][price_data][unit_amount]'] = amount;
    params['line_items[' + i + '][price_data][product_data][name]'] = String(item.name || 'Wellness product').slice(0, 120);
    if (recurring) {
      params['line_items[' + i + '][price_data][recurring][interval]'] = 'month';
    }
  });
  Object.keys(params).forEach((k) => { if (params[k] === undefined) delete params[k]; });
  return stripeRequest('POST', '/v1/checkout/sessions', params);
}

async function createSessionCheckout({ serviceType, location, date, time, customerEmail, customerName, successPath, cancelPath, metadata }, req) {
  const svc = SINGLES[serviceType];
  if (!svc) throw Object.assign(new Error('Unknown session type'), { status: 400 });
  const origin = publicOrigin(req);
  const travel = TRAVEL_ZONES[location] || 0;
  const items = [{ name: svc.name + (date && time ? (' — ' + date + ' ' + time) : ''), amount: Math.round(svc.price * 100) }];
  if (travel > 0) items.push({ name: 'Travel fee (' + location + ')', amount: travel * 100 });
  const params = {
    mode: 'payment',
    success_url: origin + (successPath || '/index.html') + '?stripe=success&kind=session&session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origin + (cancelPath || '/index.html') + '?stripe=cancel#booking',
    customer_email: customerEmail || undefined,
    'automatic_payment_methods[enabled]': 'true',
    'metadata[kind]': 'session',
    'metadata[serviceType]': serviceType,
    'metadata[location]': location || '',
    'metadata[date]': date || '',
    'metadata[time]': time || '',
    'metadata[customerName]': customerName || '',
  };
  if (metadata) {
    Object.keys(metadata).forEach((k) => {
      params['metadata[' + k + ']'] = String(metadata[k]).slice(0, 499);
    });
  }
  items.forEach((item, i) => {
    params['line_items[' + i + '][quantity]'] = 1;
    params['line_items[' + i + '][price_data][currency]'] = 'usd';
    params['line_items[' + i + '][price_data][unit_amount]'] = item.amount;
    params['line_items[' + i + '][price_data][product_data][name]'] = item.name.slice(0, 120);
  });
  Object.keys(params).forEach((k) => { if (params[k] === undefined) delete params[k]; });
  return stripeRequest('POST', '/v1/checkout/sessions', params);
}

async function retrieveSession(sessionId) {
  return stripeRequest('GET', '/v1/checkout/sessions/' + encodeURIComponent(sessionId) + '?expand[]=line_items', null);
}

function verifyWebhook(rawBody, signatureHeader) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return { ok: false, error: 'STRIPE_WEBHOOK_SECRET is not set' };
  if (!signatureHeader) return { ok: false, error: 'Missing Stripe-Signature' };
  const parts = {};
  String(signatureHeader).split(',').forEach((p) => {
    const [k, v] = p.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  });
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return { ok: false, error: 'Malformed Stripe-Signature' };
  const signed = t + '.' + rawBody;
  const expected = crypto.createHmac('sha256', secret).update(signed, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(v1, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'Invalid signature' };
  }
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (age > 300) return { ok: false, error: 'Timestamp too old' };
  try {
    return { ok: true, event: JSON.parse(rawBody) };
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
}

module.exports = {
  PACKAGES,
  SINGLES,
  TRAVEL_ZONES,
  stripeConfigured,
  createPackageCheckout,
  createShopCheckout,
  createSessionCheckout,
  retrieveSession,
  verifyWebhook,
};
