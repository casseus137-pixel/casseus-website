// Server fix. The live API already reports smtpConfigured:false and stripeConfigured:false.
// Put these in the host environment, then restart the backend. Do not commit the secrets.

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=casseus137@gmail.com
SMTP_PASS=your-gmail-app-password
OWNER_EMAIL=casseus137@gmail.com

STRIPE_SECRET_KEY=sk_live_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
PUBLIC_URL=https://casseuswellness.com

// Notify route the page already calls: POST /api/notify
// { type, title, fields, replyTo }
const nodemailer = require("nodemailer");
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

app.post("/api/notify", async (req, res) => {
  const { title, fields, replyTo } = req.body || {};
  const lines = Object.entries(fields || {}).map(([k, v]) => k + ": " + v).join("\n");
  await mailer.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.OWNER_EMAIL,
    replyTo: replyTo || undefined,
    subject: title || "Website form",
    text: lines
  });
  res.json({ ok: true });
});

// Page calls POST /api/stripe/create-checkout-session. That route is 404 today.
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post("/api/stripe/create-checkout-session", async (req, res) => {
  const { packageId, email, name } = req.body || {};
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    success_url: process.env.PUBLIC_URL + "/?paid=1",
    cancel_url: process.env.PUBLIC_URL + "/?paid=0",
    metadata: { packageId: packageId || "", name: name || "" },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: 7500,
        product_data: { name: "Casseus session" }
      }
    }]
  });
  res.json({ ok: true, url: session.url });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    smtpConfigured: Boolean(process.env.SMTP_PASS),
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    ownerEmail: process.env.OWNER_EMAIL
  });
});
