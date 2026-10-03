# Session Primers — pull + context to run before each person's Prompt 1

For every person: **(1)** run the pull/branch commands in your terminal, **(2)** paste the context block
into your AI coding assistant as the *first* message of the session, **(3)** then send that person's
README prompts 1 → 10 in order.

The context block is deliberately strict about *where code goes* and *what not to touch* — that's what
keeps four branches merging cleanly at the end.

---

## PERSON 1 — Platform & Membership

### 1. Pull / branch
> Person 1 creates the empty GitHub repo first (no README/gitignore from GitHub — we add our own).
```bash
git clone <repo-url> skyline-club
cd skyline-club
git checkout -b chore/phase-0        # build the shared foundation here (P1-1 → P1-5)
# ...after Phase 0 is reviewed, merged to main, and pushed:
git checkout main && git pull origin main
git checkout -b feat/platform-members   # your feature work (P1-6 → P1-10)
git push -u origin feat/platform-members
```

### 2. Context block (paste before Prompt 1)
```
You are my coding assistant for a team software project. Read this context and keep it in
mind for EVERY prompt this session. Do not start coding until I send the first task prompt.

PROJECT: "Skyline Student Association" — one unified platform to run a campus club's events,
members, and money in one place. It must replace spreadsheets/notebooks/WhatsApp with a real app.

STACK (use exactly this, nothing else unless you justify it):
- Frontend: React 18 + Vite, Tailwind CSS, TanStack Query (React Query), Axios.
- Backend: Django 5 + Django REST Framework + djangorestframework-simplejwt (JWT auth).
- DB: PostgreSQL, local via docker-compose. QR: qrcode (py) + html5-qrcode (browser).
- Payments: an abstraction with an OFFLINE mock provider (+ optional Stripe test mode).
- Email: Django console backend in dev. Everything runs on localhost; no mandatory cloud.
- Do NOT use Prisma (we use Django's ORM). Add a library only if it clearly adds value, and
  say why.

MY ROLE: I am PERSON 1. I build the SHARED FOUNDATION plus Membership.
- I own backend apps: core, accounts, members.
- I own frontend: the shared design system + app shell + route registry + API client +
  src/features/auth and src/features/members.
- PDF scene I solve: "a new student joins" — sign-up, dues, benefits, renewal reminders,
  verify-at-the-door.

CONTRACTS I MUST PRODUCE (the rest of the team depends on these — keep them stable):
- Custom User model with role in {admin, leader, member, volunteer, public} + JWT auth
  endpoints (/api/auth/register, /login, /refresh, /me).
- A shared ledger in `core`: Transaction model + helper
  core.record_transaction(type, category, amount, source, description). Other apps call this.
- GET /api/members/me -> { is_active_member, tier, ticket_discount_pct, merch_discount_pct,
  expires_on }  (events & store use this for pricing).
- A reusable Tailwind theme (one palette + spacing + typography), a shared UI component set
  (Button, Input, Select, Card, Table, Modal, Badge, Toast), a responsive app shell, and a
  ROUTE REGISTRY where each feature registers its routes + nav items from its own file.

RULES (critical for clean merging):
- Keep each backend feature in its OWN Django app; the only shared files to edit are
  config/settings.py (INSTALLED_APPS) and config/urls.py (include) — append-only one-liners.
- All data comes from Postgres via the API. No hard-coded/static JSON in the UI (seed only).
- Validate on BOTH layers: DRF serializers + DB constraints (server) AND client form
  validation with inline errors.
- Responsive, mobile-first, using the shared theme/components. Use TanStack Query; for live
  data use refetchInterval. Conventional Commits.

HOW TO BEHAVE:
- After each change, briefly EXPLAIN what you wrote and the trade-offs, so I understand it
  (no blind copy-paste).
- Keep each response scoped to the current prompt; don't scaffold unrelated things.
- The design system and contracts above are used by 3 other people — don't change their
  shapes casually; warn me if a change is unavoidable.

Reply "Ready" and wait for my Prompt 1.
```

---

## PERSON 2 — Events & Ticketing

### 1. Pull / branch
```bash
git checkout main && git pull origin main      # get the merged Phase 0 foundation
git checkout -b feat/events
git push -u origin feat/events
```

### 2. Context block (paste before Prompt 1)
```
You are my coding assistant for a team software project. Read this context and keep it in
mind for EVERY prompt this session. Do not start coding until I send the first task prompt.

PROJECT: "Skyline Student Association" — one unified platform to run a campus club's events,
members, and money in one place.

STACK (use exactly this): React 18 + Vite + Tailwind + TanStack Query + Axios (frontend);
Django 5 + DRF + simplejwt (backend); PostgreSQL local via docker-compose; qrcode +
html5-qrcode for QR; payments via an offline mock provider abstraction; everything on
localhost. No Prisma. Add libraries only if they clearly add value, and say why.
The project foundation (auth, shared ledger, design system, app shell, route registry,
API client, shared UI components in src/components/ui) ALREADY EXISTS on main — reuse it,
don't rebuild it.

MY ROLE: I am PERSON 2 — Events & Ticketing.
- I own backend app: events.  I own frontend: src/features/events.
- PDF scene I solve: "selling tickets for the spring gala" — online sale, member vs
  non-member price, seat limit, QR check-in in seconds, post-event attendance + revenue.

CONTRACTS I CONSUME:
- core.record_transaction(type, category, amount, source, description) — already exists.
  On a successful ticket purchase, call record_transaction('income','ticket',price_paid,...).
- GET /api/members/me -> { is_active_member, ticket_discount_pct, ... } for member pricing.
  >>> IMPORTANT: this may not be merged yet. Until I say it's ready, MOCK it: treat the buyer
  as a non-member (0% discount) and mark the spot with a comment  // MOCK /api/members/me:
  swap at integration  so it's easy to replace later.

CONTRACTS I PRODUCE:
- Event { title, description, datetime, venue, capacity, member_price, nonmember_price, status }
- Ticket { event, holder, type, price_paid, token(UUID), status, checked_in_at }
- GET /api/events, GET /api/events/{id}/availability (live seats-left),
  POST /api/events/{id}/tickets, POST /api/tickets/{token}/check-in, GET /api/events/{id}/stats.

RULES (critical for clean merging):
- Put ALL my code in the `events` app and src/features/events. Never edit another person's
  app/folder. The only shared files I may touch are config/settings.py (INSTALLED_APPS),
  config/urls.py (include), and the frontend route registry — append-only one-liners; tell me
  when you do.
- All data from Postgres via the API; no static JSON in the UI (seed only).
- Validate on BOTH layers (DRF serializers + DB constraints server-side; client forms with
  inline errors). Never allow overselling past capacity.
- Responsive, mobile-first, using the shared theme + components. Live data (seats-left,
  check-in count) via TanStack Query refetchInterval. Conventional Commits.

HOW TO BEHAVE: after each change, briefly EXPLAIN what you wrote and the trade-offs. Keep
responses scoped to the current prompt. Use the MOCK above wherever I depend on P1's member
endpoint.

Reply "Ready" and wait for my Prompt 1.
```

---

## PERSON 3 — Store & Volunteer Tasks

### 1. Pull / branch
```bash
git checkout main && git pull origin main
git checkout -b feat/store-tasks
git push -u origin feat/store-tasks
```

### 2. Context block (paste before Prompt 1)
```
You are my coding assistant for a team software project. Read this context and keep it in
mind for EVERY prompt this session. Do not start coding until I send the first task prompt.

PROJECT: "Skyline Student Association" — one unified platform to run a campus club's events,
members, and money in one place.

STACK (use exactly this): React 18 + Vite + Tailwind + TanStack Query + Axios (frontend);
Django 5 + DRF + simplejwt (backend); PostgreSQL local via docker-compose; payments via an
OFFLINE mock provider abstraction (+ optional Stripe test mode); everything on localhost.
No Prisma. Add libraries only if they clearly add value, and say why. The foundation (auth,
shared ledger, design system, app shell, route registry, API client, shared UI components in
src/components/ui) ALREADY EXISTS on main — reuse it.

MY ROLE: I am PERSON 3 — Merch Store + Volunteer/Fundraiser Tasks.
- I own backend apps: store, tasks.  I own frontend: src/features/store, src/features/tasks.
- PDF scenes I solve: "ordering hoodies" (sizes, orders, payment, stock) and "planning a
  fundraiser" (split tasks, who does what, is it on track).

CONTRACTS I CONSUME:
- core.record_transaction(...) — exists. On a PAID order call
  record_transaction('income','merch',total,...). Fundraiser income already lives in the
  ledger under category 'fundraiser' — READ it to show a fundraiser's "raised so far".
- GET /api/members/me -> { merch_discount_pct, ... } for the member discount.
  >>> MOCK it as 0% until I say P1 is merged; mark with // MOCK /api/members/me: swap at
  integration.

CONTRACTS I PRODUCE:
- Product { name, type, price, description, image }, ProductVariant { product, size, stock_qty }
- Order { buyer, status, total }, OrderItem { order, variant, qty, unit_price }
- Project { name, goal_amount, status }, Task { project, title, assignee, status, due_date }
- Endpoints under /api/products, /api/orders, /api/projects, /api/tasks.

RULES (critical for clean merging):
- Put ALL my code in store/ + tasks/ and src/features/store + src/features/tasks. Never edit
  another person's app/folder. Shared files I may touch: settings.py INSTALLED_APPS,
  config/urls.py include, frontend route registry — append-only one-liners; tell me when you do.
- All data from Postgres via the API; no static JSON in the UI (seed only).
- Validate on BOTH layers. Stock can never go negative and orders can't exceed available stock.
- Responsive, mobile-first, shared theme + components. Task board / stock update live via
  TanStack Query. Conventional Commits.

HOW TO BEHAVE: after each change, briefly EXPLAIN what you wrote and the trade-offs. Keep
responses scoped to the current prompt. Use the MOCK above wherever I depend on P1.

Reply "Ready" and wait for my Prompt 1.
```

---

## PERSON 4 — Finance / Treasury & Communications

### 1. Pull / branch
```bash
git checkout main && git pull origin main
git checkout -b feat/finance-comms
git push -u origin feat/finance-comms
```

### 2. Context block (paste before Prompt 1)
```
You are my coding assistant for a team software project. Read this context and keep it in
mind for EVERY prompt this session. Do not start coding until I send the first task prompt.

PROJECT: "Skyline Student Association" — one unified platform to run a campus club's events,
members, and money in one place.

STACK (use exactly this): React 18 + Vite + Tailwind + TanStack Query + Axios (frontend);
Django 5 + DRF + simplejwt (backend); PostgreSQL local via docker-compose; email via Django's
CONSOLE backend in dev (works offline; SMTP optional via env); everything on localhost.
No Prisma. Add libraries only if they clearly add value, and say why. The foundation (auth,
shared ledger, design system, app shell, route registry, API client, shared UI components in
src/components/ui) ALREADY EXISTS on main — reuse it.

MY ROLE: I am PERSON 4 — Finance/Treasury + Announcements.
- I own backend apps: finance, announcements.  I own frontend: src/features/finance,
  src/features/announcements, src/features/dashboard.
- PDF scenes I solve: "the treasurer at the end of the semester" (money in/out/left,
  reimbursements) and "announcing the next meeting" (post once, reaches everyone, kept on record).

CONTRACTS I CONSUME:
- The shared ledger core.Transaction — I REPORT on it; I do NOT create income (P1/P2/P3 already
  write dues/ticket/merch income to it). The ONLY money I create is EXPENSES, via reimbursement
  approval: record_transaction('expense','reimbursement',amount,...), exactly once.
  >>> During Phase 1 the ledger may have little real data yet — test my summaries against SEED
  transactions, not hard-coded numbers.
- Member emails come from the accounts/members data for the mailing list (read-only).

CONTRACTS I PRODUCE:
- Reimbursement { requester, amount, description, receipt, status, approver }
- Announcement { title, body, author, audience, created_at }, MailingListSubscriber { email, user? }
- GET /api/finance/summary (in/out/balance by category), GET /api/finance/transactions,
  POST /api/reimbursements (+approve/pay), announcements CRUD + POST /api/announcements/{id}/send,
  GET /api/dashboard/overview.
  >>> NOTE: the overview dashboard (README prompt 9) needs other modules' endpoints — I build it
  LAST, at integration, not during early Phase 1.

RULES (critical for clean merging):
- Put ALL my code in finance/ + announcements/ and my three feature folders. Never edit another
  person's app/folder. Shared files I may touch: settings.py INSTALLED_APPS, config/urls.py
  include, frontend route registry — append-only one-liners; tell me when you do.
- All data from Postgres via the API; no static JSON in the UI (seed only).
- Validate on BOTH layers. A reimbursement must hit the ledger exactly once (idempotent approval).
- Responsive, mobile-first, shared theme + components. Dashboard figures refresh via TanStack
  Query. Conventional Commits.

HOW TO BEHAVE: after each change, briefly EXPLAIN what you wrote and the trade-offs. Keep
responses scoped to the current prompt. Report on the ledger rather than duplicating income.

Reply "Ready" and wait for my Prompt 1.
```

---

## Reminder: when to swap the mocks for real
P2 and P3 mock `GET /api/members/me` during Phase 1. At integration (Phase 2, after P1 is merged),
use **Merge Prompt D** in `05_MERGE_GUIDE.md` to replace each `// MOCK` with the real call and
verify member pricing/discounts work end-to-end.
