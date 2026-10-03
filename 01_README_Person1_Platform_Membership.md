# Person 1 — Platform & Membership

**Branch:** `feat/platform-members`
**You own (backend):** `core`, `accounts`, `members`
**You own (frontend):** the **shared design system + app shell**, `features/auth`, `features/members`
**PDF scene you solve:** *"A new student joins"* — sign-up, dues, benefits, renewal reminders, verify-at-the-door.

> You also build **Phase 0** — the foundation everyone branches from. Do Phase 0 on `main` first (pair with the team / let them review), push, have everyone pull, **then** create `feat/platform-members`.

---

## Your slice of the contract
- `User { name, email, phone, role ∈ {admin, leader, member, volunteer, public} }`
- `MembershipTier { name, price, duration_days, ticket_discount_pct, merch_discount_pct }`
- `Membership { user, tier, status, start_date, end_date, dues_paid }`
- **You expose the discount contract everyone depends on:**
  `GET /api/members/me` → `{ is_active_member, tier, ticket_discount_pct, merch_discount_pct, expires_on }`
- You build the shared **ledger** (`core.record_transaction`) that P2/P3/P4 call.

---

## Build prompts (paste one at a time; finish/commit before the next)

**Prompt 1 — Scaffold the monorepo (do this on `main`, Phase 0)**
> Create a monorepo called `skyline-club` with a Django 5 backend in `backend/` and a React 18 + Vite frontend in `frontend/`, following this layout: [paste the repo layout from the master plan §7]. Add a root `docker-compose.yml` that runs PostgreSQL 16 locally, a `.env.example` (DB url, secret key, JWT settings) and a git-ignored `.env`, a `.gitignore` for Python + Node, and a root `README.md` with local setup steps. Everything must run on localhost with no cloud services. After generating, explain each file's purpose and how to start Postgres, the backend, and the frontend.

**Prompt 2 — Django base config (Phase 0)**
> In `backend/`, configure the Django project in `config/`: read settings from environment variables, connect to the Postgres DB from docker-compose, and install Django REST Framework, `django-cors-headers`, and `djangorestframework-simplejwt`. Set up a consistent JSON error format and default pagination. Create an empty `core` app for shared utilities. Explain the settings choices (especially CORS and JWT) and why env-based config matters for the offline/local requirement.

**Prompt 3 — The shared ledger (Phase 0, everyone depends on this)**
> In the `core` app, create a `Transaction` model with fields `type` (income/expense), `category` (dues/ticket/merch/fundraiser/reimbursement/other), `amount` (positive decimal), `date`, `source` (short string), `description`. Add a reusable helper `record_transaction(type, category, amount, source, description)`, register the model in Django admin, and expose a read-only `GET /api/finance/transactions` list endpoint (filterable by type/category/date). Add validation so `amount` must be positive. Explain how other apps should import and call `record_transaction`, and why the ledger is the single source of truth for money.

**Prompt 4 — Custom user + roles + auth (Phase 0)**
> In an `accounts` app, create a custom `User` model (extending `AbstractUser`) with `name`, `phone`, and a `role` choice field (admin, leader, member, volunteer, public). Add JWT auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, and `GET /api/auth/me`. Add DRF permission helpers like `IsOfficer` (admin/leader). Validate email format and uniqueness and enforce a strong-enough password. Explain the role model and how permissions will gate officer-only actions across the app.

**Prompt 5 — Frontend foundation & design system (Phase 0)**
> In `frontend/`, set up Tailwind with a single design theme: define a color palette (primary, accent, neutrals, success/warning/danger), a spacing scale, and typography in the Tailwind config. Build a shared UI component library in `src/components/ui/` (Button, Input, Select, Card, Table, Modal, Badge, Toast) that all four teammates will reuse. Build a responsive app shell in `src/app/` (sidebar nav on desktop, hamburger/drawer on mobile, topbar with the logged-in user menu) and a **route registry** where each feature registers its routes + nav items from its own file. Add `src/lib/` with an Axios API client (attaches the JWT) and a React Query provider, plus an auth context and Login/Register pages wired to the auth endpoints. Explain the route-registry pattern and how it keeps our four branches from fighting over navigation.

> ✅ **End of Phase 0.** Commit, push to `main`, have everyone pull, then `git checkout -b feat/platform-members`.

**Prompt 6 — Membership models & the discount contract**
> In a `members` app, create `MembershipTier` (name, price, duration_days, ticket_discount_pct, merch_discount_pct) and `Membership` (user FK, tier FK, status ∈ active/expired/pending, start_date, end_date, dues_paid boolean/amount). Add serializers, CRUD endpoints under `/api/members` and `/api/membership-tiers`, and Django admin. Add the contract endpoint `GET /api/members/me` returning `{ is_active_member, tier, ticket_discount_pct, merch_discount_pct, expires_on }`. Compute `status` from `end_date`. Validate that dates are coherent and discounts are 0–100. Explain how Ticketing and Store will use `/api/members/me` to price members vs non-members.

**Prompt 7 — Dues payment → ledger**
> Add an endpoint for recording a member's dues payment that marks `dues_paid`, activates the membership, sets `start_date`/`end_date` from the tier's `duration_days`, and calls `core.record_transaction(income, dues, …)` so the treasurer sees it automatically. Make it idempotent (paying twice shouldn't double-charge). Explain the flow and the validation you added.

**Prompt 8 — Expiry & renewal reminders**
> Add membership expiry logic and renewal reminders: a Django management command (`flag_expiring_memberships`) that finds memberships expiring within N days and creates a reminder record / queues an email (use Django's console email backend so it works offline). Expose the member's days-until-expiry via the API. Explain how this would be scheduled (cron / Celery beat) and why we keep it working offline.

**Prompt 9 — Member verification at the door**
> Add a quick verification endpoint `GET /api/members/verify?query=<email-or-id>` that returns whether the person is an active member and their tier, plus a `token`/QR for each member for instant scanning. Build a frontend "Verify member" page (officer-only) with a search box and a clear active/expired status badge. Validate and handle "not found" gracefully. Explain how this replaces checking a printed list.

**Prompt 10 — Members frontend + finish**
> Build the members UI in `src/features/members/`: a public **sign-up form** with robust client-side validation (name, email format, phone, tier select) plus inline server errors; a member **list/table** with search and status filter (data from the API, not static); and a member **profile** view showing dues status, benefits, and expiry with a "renew" action. Register the routes + nav item in the route registry. Add seed data (a few tiers + members) and make everything responsive. Explain the validation approach (client + server) and confirm no hard-coded data remains.

---

## Definition of done for you
- Phase 0 merged to `main` and pulled by everyone.
- Auth works; roles gate officer actions.
- A student can sign up, pay dues (→ appears in the ledger), and be verified at the door.
- Expiring memberships get flagged; renewal is possible.
- `/api/members/me` returns correct discounts (P2/P3 rely on this).
- All forms validate on client **and** server; UI is responsive and uses the shared theme.
