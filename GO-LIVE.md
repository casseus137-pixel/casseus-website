# Casseus Wellness — domain & host

**Chosen domain:** https://casseuswellness.com  
**Also add:** https://www.casseuswellness.com  
**Owner email:** casseus137@gmail.com

## 1. Buy the domain (you pay)

1. Open Namecheap or Cloudflare Registrar.
2. Search **casseuswellness.com**.
3. Buy 1 year (turn on auto-renew).
4. www is included — do not buy www separately.

If it is taken, stop and tell me.

## 2. Host on Render

1. Account at render.com
2. New → Web Service
3. Connect the casseus-website folder (GitHub is easiest)
4. Runtime Node. Build command empty. Start command: `node backend/server.js`
5. Use a plan that stays awake (not free-sleep)
6. Environment:

OWNER_EMAIL=casseus137@gmail.com
PUBLIC_URL=https://casseuswellness.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=casseus137@gmail.com
SMTP_PASS=
FROM_NAME=Casseus Health & Wellness
FROM_EMAIL=casseus137@gmail.com
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

7. Confirm https://YOUR-SERVICE.onrender.com/api/health returns ok.

## 3. DNS

Render → Custom Domains → add casseuswellness.com and www.casseuswellness.com  
Copy the A/CNAME records Render shows into Namecheap Advanced DNS.

## 4. Stripe payment setup

The site already sends customers to Stripe Checkout for:

- Monthly stretch / PT packages (one-time or recurring)
- Single 30/60-min sessions (price locked on the server)
- Shop cart

**You must add keys:**

1. Create an account at https://dashboard.stripe.com/register
2. Activate the account (business + bank). Use Casseus Health & Wellness.
3. Developers → API keys
   - Test first: `sk_test_...` and `pk_test_...`
   - After a successful $1 test: switch to `sk_live_...` and `pk_live_...`
4. Put them on Render as `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`
5. Developers → Webhooks → Add endpoint  
   URL: `https://casseuswellness.com/api/stripe/webhook`  
   Events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
6. Copy Signing secret into `STRIPE_WEBHOOK_SECRET`
7. Settings → Payment methods → turn on cards, Apple Pay, Google Pay, Link, Cash App (Checkout + `automatic_payment_methods` already on)
8. Test card: `4242 4242 4242 4242` any future date, any CVC

Until keys are set, the site uses demo mode (no real charge).

## 5. Gmail App Password → SMTP_PASS

Reports go only to casseus137@gmail.com.
