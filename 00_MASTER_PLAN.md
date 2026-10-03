# Student Organization System — Master Plan

**Project:** A single unified platform for the Skyline Student Association to run
**events, members and money** in one place.
**Team:** 4 people · 4 feature branches · merged into `main` at the end.

---

## 1. What we are solving (straight from the PDF)

| Scene in the brief | Feature we build | Owner |
|---|---|---|
| A new student joins (sign-up, dues, benefits, renewal reminders, verify at the door) | **Membership** | Person 1 |
| Selling tickets for the spring gala (online sale, member/non-member price, seat limit, QR check-in, attendance + revenue) | **Events & Ticketing** | Person 2 |
| Ordering hoodies (sizes, orders, payment, stock) | **Merch Store** | Person 3 |
| Planning a fundraiser (split tasks, who does what, is it on track) | **Volunteer / Task Board** | Person 3 |
| Announcing the next meeting (post once → reaches everyone, kept on record) | **Announcements & Mailing List** | Person 4 |
| The treasurer at the end of the semester (money in, money out, what's left, reimbursements) | **Finance / Treasury** | Person 4 |

Nothing is left as "tracked in a spreadsheet / notebook / WhatsApp". Every scene maps to a real feature backed by a real database.

---

## 2. Tech stack (and *why* — not just because it's trendy)

| Layer | Choice | Why it earns its place here |
|---|---|---|
| Frontend | **React 18 + Vite** | Responsive single-page app, reusable components for the many dashboards/tables we need. Vite = fast local dev. |
| Styling / design system | **Tailwind CSS** with a shared config | Forces **one** color palette + spacing scale across all 4 people → satisfies "consistent color scheme and layout" automatically. |
| Data fetching | **TanStack Query (React Query)** + Axios | Gives us **dynamic, near-real-time** data cheaply via `refetchInterval` (live seats-left, live check-in counter, live dashboard) without hand-rolling state. |
| Backend | **Django 5 + Django REST Framework** | Built-in **admin panel** = instant CRUD for club officers (huge real value), built-in auth, migrations, mature ORM. |
| Auth | **JWT** (`djangorestframework-simplejwt`) | Clean token auth for an SPA + role system (admin/leader, member, volunteer, public). |
| Database | **PostgreSQL** (local, via Docker) | Money, inventory and relationships need a real relational DB. Runs 100% locally → supports the offline requirement. |
| QR | `qrcode` (Python) + `html5-qrcode` (browser camera) | Generate ticket QR + scan at the door. |
| Payments | **Abstraction layer**: a `manual/mock` provider (works offline) + optional Stripe **test mode** | Door-sale and offline demos work with zero internet; Stripe is plug-in optional. |
| Email / mailing list | Django email backend: **console/file in dev** (offline), SMTP optional | Announcements get stored in the DB regardless; sending works offline in dev. |

**Why NOT Prisma** (it was on the "maybe" list): Prisma is a *second* ORM for a *second* (Node) runtime. Django already ships a mature ORM + migrations + admin. Adding Prisma would be cost with no benefit — exactly the kind of "only if it adds real value" call the brief asks us to make. So we skip it. Same logic applies throughout: we add a tool only when it pays for itself.

> **Offline-first stance:** everything runs on `localhost` with a local Postgres. Internet is optional (only real Stripe/SMTP need it, and both have offline fallbacks).

---

## 3. How the work splits across 4 people

We split by **vertical feature slice**. Each person owns their own Django *app* and their own frontend `src/features/<x>/` folder. That means each person edits mostly their *own files* — the key to merging 4 branches without pain.

| Person | Branch | Owns (backend app) | Owns (frontend folder) |
|---|---|---|---|
| **P1 — Platform & Membership** | `feat/platform-members` | `core`, `accounts`, `members` | `features/auth`, `features/members`, + the **shared design system & app shell** |
| **P2 — Events & Ticketing** | `feat/events` | `events` | `features/events` |
| **P3 — Store & Tasks** | `feat/store-tasks` | `store`, `tasks` | `features/store`, `features/tasks` |
| **P4 — Finance & Comms** | `feat/finance-comms` | `finance`, `announcements` | `features/finance`, `features/announcements`, `features/dashboard` |

P1 front-loads the shared foundation in **Phase 0** (below), so during the main build everyone's load is balanced and P4's finance work — which depends on everyone's income data — lands last, which matches the "treasurer at the end of the semester" story.

---

## 4. Shared data model & API contract (the glue)

Everyone codes against **these contracts**, so branches integrate predictably. Define them in Phase 0; don't change them unilaterally.

### Core / shared (built in Phase 0, owned by P1)
- **User** (custom): `name, email, phone, role ∈ {admin, leader, member, volunteer, public}`
- **Ledger** — the single source of truth for money:
  - `Transaction { type ∈ {income, expense}, category ∈ {dues, ticket, merch, fundraiser, reimbursement, other}, amount, date, source, description }`
  - Helper: `core.record_transaction(type, category, amount, source, description)` — **every money-making/spending module calls this.** Finance only *reports* on it.

### Membership (P1) — exposes the discount contract everyone needs
- `MembershipTier { name, price, duration_days, ticket_discount_pct, merch_discount_pct }`
- `Membership { user, tier, status ∈ {active, expired, pending}, start_date, end_date, dues_paid }`
- **Contract endpoint:** `GET /api/members/me` → `{ is_active_member, tier, ticket_discount_pct, merch_discount_pct, expires_on }`
  → Ticketing and Store call this to price correctly. If P1 isn't ready, callers **mock** this response, then swap to the real one at integration.

### Events & Ticketing (P2)
- `Event { title, description, datetime, venue, capacity, member_price, nonmember_price, status }`
- `Ticket { event, holder, type ∈ {member, nonmember}, price_paid, token, status ∈ {valid, checked_in}, checked_in_at }`
- Key endpoints: `GET /api/events/{id}/availability` (seats left, dynamic), `POST /api/events/{id}/tickets` (→ `record_transaction(income, ticket, …)`), `POST /api/tickets/{token}/check-in`, `GET /api/events/{id}/stats`.

### Store & Tasks (P3)
- `Product { name, type, price, description, image }`, `ProductVariant { product, size, stock_qty }`
- `Order { buyer, status ∈ {pending, paid, fulfilled}, total }`, `OrderItem { order, variant, qty, unit_price }` (paid → `record_transaction(income, merch, …)`)
- `Project { name, goal_amount, status }`, `Task { project, title, assignee, status ∈ {todo, doing, done}, due_date }`

### Finance & Comms (P4)
- Reads/aggregates the **Ledger**; adds:
  - `Reimbursement { requester, amount, description, receipt, status ∈ {pending, approved, paid}, approver }` (approved → `record_transaction(expense, reimbursement, …)`)
  - `Announcement { title, body, author, audience, created_at }`, `MailingListSubscriber { email, user? }`
- Endpoints: `GET /api/finance/summary` (in/out/balance by category), `GET /api/finance/transactions`, `POST /api/reimbursements`, announcements CRUD + `POST /api/announcements/{id}/send`, `GET /api/dashboard/overview`.

---

## 5. Meeting the "Must-have" rules (mapped explicitly)

| Rule | How we satisfy it |
|---|---|
| **Real-time / dynamic data, no static JSON** | All data lives in Postgres and is served via the API. Live seats-left, live check-in counter, task board, and dashboards use React Query `refetchInterval` (near-real-time); optional WebSockets (Django Channels) for instant check-in. JSON is used **only** for seed/demo data. |
| **Responsive, clean UI, consistent colors/layout** | One Tailwind theme (palette + spacing + typography) defined in Phase 0; a shared component library (Button, Input, Card, Table, Modal, Badge, Toast); mobile-first, tested at `sm/md/lg`. |
| **Robust input validation** | **Two layers**: DRF serializers + DB constraints on the server (required fields, email format, positive prices, `stock ≥ 0`, no overselling, capacity limits, date logic) **and** React form validation on the client with inline errors. Never trust the client alone. |
| **Intuitive navigation, menu placement, spacing** | A single responsive app shell (sidebar on desktop, hamburger/bottom nav on mobile). Each person registers their nav item + route via a **route registry** (their own file), so menus are consistent and conflict-free. |
| **Proper Git by everyone (not one person)** | Feature branches, Conventional Commits, PRs reviewed by a **non-author** teammate, protected `main`. Every member commits to their own branch and reviews others'. See §7. |

### "Nice-to-have" (also covered)
- **Backend APIs + data modeling + local DB:** DRF + Django ORM + local Postgres. ✔
- **Understand snippets before using them:** every prompt in the READMEs ends by asking the assistant to *explain the code and the trade-offs*; reviewers must be able to explain any code they approve. ✔
- **Offline / local solutions:** Dockerized local Postgres, mock payment provider, console email backend, everything on localhost. ✔
- **Frameworks only if they add value:** justified in §2; Prisma dropped on purpose. ✔

---

## 6. Phases & timeline (suggested)

```
Phase 0  — Foundation on `main` (P1 leads, all 4 review/pair). ~2–3 days.
           Scaffold both apps, Postgres, auth, core ledger, design system,
           app shell + route registry, API client. Everyone PULLS main, THEN branches.

Phase 1  — Parallel build on 4 feature branches. ~1.5–2 weeks.
           Each person builds their module against the §4 contracts.
           Pull `main` into your branch regularly.

Phase 2  — Integration. ~3–4 days.
           Merge order: P1 → P2 → P3 → P4 (see MERGE_GUIDE).
           Replace mocked contracts with real ones; wire income into the ledger.
           End-to-end test the 6 PDF scenes.

Phase 3  — Polish. ~2–3 days.
           Responsive QA, validation audit, seed/demo data, record a demo.
```

> **Why Phase 0 is shared, not "parallel from minute 1":** 4 branches that all invent their own scaffold, auth and theme will *not* merge cleanly. Establishing the shared base once, on `main`, and branching from it is what makes the final merge boring (which is the goal).

---

## 7. Git workflow (everyone participates)

- **`main`** is protected and always runnable. Changes land only via reviewed PRs.
- **Branches:** `feat/platform-members`, `feat/events`, `feat/store-tasks`, `feat/finance-comms`.
- **Commits:** Conventional Commits — `feat: …`, `fix: …`, `docs: …`, `refactor: …`, `test: …`.
- **PRs:** opened by the author, **reviewed and approved by a different teammate** before merge. (This is how we satisfy "one member managing the repo is not enough" — everyone writes code *and* reviews.)
- **Stay current:** `git fetch origin && git merge origin/main` into your branch at least daily.
- **Never commit secrets:** use `.env` (git-ignored) + a committed `.env.example`.
- **GitHub branch protection on `main`:** require 1 approval + passing checks.

### Repo layout
```
skyline-club/
├─ backend/                 # Django project
│  ├─ config/               # settings, root urls, wsgi/asgi
│  ├─ core/                 # ledger + shared utils      (P1, Phase 0)
│  ├─ accounts/             # custom user + auth         (P1)
│  ├─ members/              # P1
│  ├─ events/               # P2
│  ├─ store/  tasks/        # P3
│  ├─ finance/ announcements/ # P4
│  ├─ requirements.txt
│  └─ manage.py
├─ frontend/                # React + Vite
│  └─ src/
│     ├─ app/               # shell, router, route registry (Phase 0)
│     ├─ components/ui/      # shared design system        (Phase 0)
│     ├─ lib/                # api client, auth context     (Phase 0)
│     └─ features/
│        ├─ auth/ members/   # P1
│        ├─ events/          # P2
│        ├─ store/ tasks/    # P3
│        └─ finance/ announcements/ dashboard/  # P4
├─ docker-compose.yml        # Postgres (+ optional services)
├─ .env.example
└─ README.md
```

### Low-conflict conventions (important)
- **One Django app per feature** → separate `models/serializers/views/urls` → migrations never collide.
- Only two shared backend files get touched by everyone: `config/settings.py` (`INSTALLED_APPS`) and `config/urls.py` (`include(...)`) — these are **append-only one-liners**; easy to merge.
- **Frontend route registry:** each feature exports its routes + nav items from its *own* file; a central loader imports them. Appending one import line = trivial merge.
- Keep `requirements.txt` / `package.json` additions on separate lines, alphabetical, so merges are unions not conflicts.

---

## 8. Definition of Done (per feature)
1. Data comes from the DB via the API (no hard-coded JSON in the UI).
2. Server-side **and** client-side validation present.
3. Responsive at mobile + desktop; uses shared components + theme.
4. Registered in nav + router; reachable from the shell.
5. Seed data exists so the feature is demoable.
6. At least one teammate has reviewed and can explain the code.
7. The relevant PDF scene can be performed end-to-end.

---

## 9. The deliverable files
- `00_MASTER_PLAN.md` — this file.
- `01_README_Person1_Platform_Membership.md`
- `02_README_Person2_Events_Ticketing.md`
- `03_README_Person3_Store_Tasks.md`
- `04_README_Person4_Finance_Comms.md`
- `05_MERGE_GUIDE.md` — integration order + copy-paste merge prompts + conflict fixes.

Each README contains the person's scope, their slice of the contract, and **8–10 sequential build prompts** you can paste into an AI coding assistant — each prompt asks the assistant to *explain what it wrote* so no one is blindly copy-pasting.
