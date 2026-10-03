# Skyline Student Association — Unified Platform

One system to run a student club's **members, events, merch, communications, fundraisers and money** — replacing the spreadsheet, the notebook, cash at the door, WhatsApp and the pile of receipts.

**Stack:** React (Vite) · Django + Django REST Framework · JWT auth · SQLite (default) or Supabase/Postgres · mock payments (default) or Razorpay.

> It runs out of the box with **zero external accounts**: SQLite database + a mock payment gateway. Switch on Supabase and Razorpay later by editing one `.env` file — no code changes.

---

## Quick start (5 minutes)

You need **Python 3.10+** and **Node 18+**.

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # defaults are fine; runs on SQLite + mock payments

python manage.py makemigrations
python manage.py migrate
python manage.py seed           # loads demo data + demo logins

python manage.py runserver      # API at http://localhost:8000
```

### 2. Frontend (in a second terminal)

```bash
cd frontend
npm install
cp .env.example .env            # default points at http://localhost:8000/api
npm run dev                     # app at http://localhost:5173
```

Open **http://localhost:5173** and log in.

### Demo logins (created by `seed`)

| Username | Password    | Role      | Can see                               |
|----------|-------------|-----------|---------------------------------------|
| admin    | admin123    | treasurer | everything + Django admin + finance   |
| officer  | officer123  | officer   | members, check-in, create events/merch|
| riya     | member123   | member    | buy tickets, order merch, announcements|
| vihaan   | member123   | volunteer | tasks assigned to them                |

Django admin (treasurer back-office): **http://localhost:8000/admin** → `admin / admin123`
API docs (Swagger): **http://localhost:8000/api/docs/**

---

## What each part does (maps to the brief)

| Module (Django app) | Covers the scene… | Key features |
|---|---|---|
| **accounts** | *A new student joins* | sign-up, roles, membership tiers, dues, expiry, renewal reminder, one-click door **verify** |
| **events** | *Selling tickets for the gala* | online sales, member vs non-member pricing, seat cap, **QR tickets**, scan check-in, attendance + revenue report |
| **merch** | *Ordering hoodies* | products with size variants, live stock, member discount, online orders |
| **comms** | *Announcing the next meeting* | one announcement reaches all, email blast, permanent archive |
| **tasks** | *Planning a fundraiser* | fundraiser goal + progress, volunteer task assignment, status board |
| **finance** | *The treasurer at semester end* | **central ledger** — every module posts here automatically; income/expense/balance, reimbursements |

### The core idea
Every module that moves money calls one shared service — `finance.services.record_transaction()`.
Dues, tickets, merch and reimbursements all land in the **same ledger automatically**, so the treasurer never re-enters anything. That's what makes this *one system* instead of six.

---

## Switching on real services (optional)

Edit `backend/.env`:

**Supabase / Postgres** — paste your connection string:
```
DATABASE_URL=postgres://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
```
Then re-run `migrate` and `seed`. (Leave blank to keep SQLite.)

**Razorpay (India/UPI) payments:**
```
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
```
The payment service (`payments/services.py`) already creates Razorpay orders and verifies signatures; the webhook endpoint is at `/api/payments/webhook/` for you to point Razorpay at in production.

**Email (announcement mailing list):**
```
EMAIL_BACKEND_MODE=smtp
EMAIL_HOST_PASSWORD=your_sendgrid_api_key
```
(Default `console` mode just prints emails to the backend terminal — fine for demos.)

---

## Project layout

```
skyline/
├── backend/
│   ├── config/          # settings, urls, wsgi
│   ├── accounts/        # users, roles, membership   ← foundation
│   ├── finance/         # transaction ledger          ← foundation
│   ├── events/          # events, tickets, QR, check-in
│   ├── merch/           # products, variants, orders
│   ├── comms/           # announcements
│   ├── tasks/           # fundraisers + tasks
│   ├── payments/        # mock / Razorpay provider
│   └── core/            # seed command
└── frontend/
    └── src/
        ├── api/         # axios client + JWT refresh
        ├── auth/        # auth context
        ├── components/  # layout, route guard
        └── pages/       # one page per module
```

---

## For the 4-person team

The two foundation apps (`accounts`, `finance`) are the shared contract everyone builds against:
- **Person A** owns `accounts` (Member model + roles + auth)
- **Person B** owns `finance` (Transaction ledger + `record_transaction()`)
- **Person C** owns `events`
- **Person D** owns `merch` + `comms` + `tasks`

Each person owns their app's models, serializers, views, admin, and matching frontend page — a clean vertical slice to show individual contribution.

---

## Notes / limitations

- This was authored without a live run environment, so the code is written to be correct and is syntax-checked, but you should run the Quick Start once and generate migrations on your machine (`makemigrations`) — standard Django workflow.
- The QR scanner needs camera permission and a `https` or `localhost` origin (localhost is fine for dev).
- For production: set `DEBUG=False`, a real `SECRET_KEY`, proper `ALLOWED_HOSTS`, and serve the built frontend (`npm run build`) behind your web server.
```
