# Casseus Health & Wellness — Website

Mobile personal training & assisted stretching (Tampa · Bradenton · Sarasota).

**Live domain (chosen):** https://casseuswellness.com  
See `GO-LIVE.md` to buy the name and attach Render hosting.

## Open the site
Open `index.html` in a browser (or host the whole `casseus-website` folder).

## Main features
- **Individual packages** — stretch & PT monthly plans + single sessions
- **Corporate (5+ people)** — group stretch & corporate PT pricing + registration form
- **Free 15-min stretch** — QR code + direct claim button → Book Now
- **Booking** — Sun–Fri; slots lock when booked; book up to 30 days out
- **Travel / mileage** — fee calculates when area, address, or ZIP is entered
- **Package renewal** — auto offer ~15% off when sessions run low or month ends
- **Quarterly survey** — every 90 days for active clients; report logged for casseus137@gmail.com
- **Live chat assistant** — answers inquiries and guides booking
- **Business insights** — admin recommendations (login then Ctrl+Shift+I)
- **Shop, referral, affiliate, waivers, intake, refund policy** as before

## Admin
- Weekly report: add `#admin` to the URL or press **Ctrl+Shift+A**
- Password: `CasseusAdmin2026`
- Business insights: after admin login, **Ctrl+Shift+I**
- Reports target: casseus137@gmail.com (demo: simulated send)

## Contact
240-571-7253 · casseus137@gmail.com

## Stripe Checkout

1. Get test keys from https://dashboard.stripe.com/apikeys
2. Add to `backend/.env`: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `PUBLIC_URL`
3. Run `node server.js` and pay with test card `4242 4242 4242 4242`
4. Optional webhook: `stripe listen --forward-to localhost:3001/api/stripe/webhook`
5. Without keys, checkout falls back to demo mode (no charge)

## Backend (email & surveys)

```bash
cd backend
node server.js
```

Then open http://localhost:3001/

- Survey submissions email **casseus137@gmail.com**
- Corporate + Help form notifications
- Admin weekly report email
- Configure SMTP in `backend/.env` for real delivery (see `backend/README.md`)
