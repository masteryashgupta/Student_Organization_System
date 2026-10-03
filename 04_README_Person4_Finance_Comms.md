# Person 4 — Finance / Treasury & Communications

**Branch:** `feat/finance-comms`
**You own (backend):** `finance`, `announcements`
**You own (frontend):** `features/finance`, `features/announcements`, `features/dashboard`
**PDF scenes you solve:**
- *"The treasurer, at the end of the semester"* — one place showing dues, tickets, merch, every reimbursement; what came in, what went out, what's left.
- *"Announcing the next meeting"* — post one announcement that reaches everyone and stays on record with timestamps.

> Branch from `main` after Phase 0: `git checkout main && git pull && git checkout -b feat/finance-comms`.
> **You don't re-record income** — P1/P2/P3 already write to the shared ledger via `core.record_transaction`. You **report** on that ledger and **add expenses** (reimbursements). Build Announcements first (independent), then Finance (integrates with everyone's data — fits the "end of semester" timing).

---

## Your slice of the contract
- Read/aggregate the **Ledger** (`core.Transaction`).
- `Reimbursement { requester, amount, description, receipt, status ∈ {pending, approved, paid}, approver }` → on approval, `core.record_transaction(expense, reimbursement, …)`.
- `Announcement { title, body, author, audience, created_at }`, `MailingListSubscriber { email, user? }`.
- Endpoints: `GET /api/finance/summary`, `GET /api/finance/transactions`, `POST /api/reimbursements` (+ approve/pay), announcements CRUD + `POST /api/announcements/{id}/send`, `GET /api/dashboard/overview`.

---

## Build prompts (one at a time)

**Prompt 1 — Finance summary (report on the ledger)**
> In a Django `finance` app, build a `GET /api/finance/summary` endpoint that reads the shared `core.Transaction` ledger and returns total income, total expense, current balance, and a breakdown by category (dues/ticket/merch/fundraiser/reimbursement/other), with an optional date-range filter. Register the app in settings + urls (append-only). Explain how you aggregate the ledger and why Finance only reads it rather than storing its own copies of income.

**Prompt 2 — Reimbursement workflow (the only expenses you create)**
> Create a `Reimbursement` model (requester FK, amount > 0, description, receipt file/image, status ∈ pending/approved/paid, approver FK). Add `POST /api/reimbursements` (any volunteer can submit, with a receipt upload) and officer-only `approve`/`reject`/`mark-paid` actions. On **approve**, call `core.record_transaction(expense, reimbursement, amount, …)` so it hits the ledger exactly once. Validate amount and file type. Explain the workflow and how you avoid double-recording.

**Prompt 3 — Transactions list + manual entry**
> Add `GET /api/finance/transactions` (filter by type/category/date, paginated) and an officer-only manual transaction entry for miscellaneous income/expenses that don't come from another module (e.g. a cash donation). Validate inputs. Explain when a manual entry is appropriate vs when money should flow in automatically from members/events/store.

**Prompt 4 — Treasurer dashboard frontend**
> In `src/features/finance/`, build the treasurer dashboard: in / out / balance summary cards, a category breakdown (simple chart or bars), and a filterable transactions table (data from the API). Add a "download CSV" export. Register routes + nav (officer-only). Explain how this replaces the notebook + pile of receipts and confirm it's all live data.

**Prompt 5 — Reimbursement frontend**
> Build a reimbursement submission form (amount, description, receipt upload) with validation and inline errors for volunteers, and an officer approval queue showing pending requests with approve/reject/mark-paid actions. Reflect status changes live. Explain the two user views (volunteer vs officer) and the validation.

**Prompt 6 — Announcements model + archive**
> In an `announcements` app, create an `Announcement` model (title, body, author FK, audience ∈ all/members/volunteers, created_at) with CRUD endpoints and admin. Keep every announcement on record with its timestamp (nothing is deleted on send). Validate required fields and length. Explain how the archive gives the club the "record of what was said and when" the brief asks for.

**Prompt 7 — Mailing list + send-to-everyone**
> Add a `MailingListSubscriber` model and a `POST /api/announcements/{id}/send` action that emails the chosen audience using Django's email backend (console/file in dev so it works offline; SMTP optional via env). Pull member emails from the accounts/members data (read-only) and record that the announcement was sent and when. Explain how one post reaches everyone and why it works without internet in dev.

**Prompt 8 — Announcements frontend**
> Build a compose page (title, body, audience) with validation for officers, a public **announcements feed/board** (newest first, from the API) that every member sees, and an archive view with dates. Register routes + nav. Explain how this replaces copy-pasting into several WhatsApp groups.

**Prompt 9 — Club overview dashboard (home)**
> Build `GET /api/dashboard/overview` aggregating headline numbers across modules — active members, upcoming events + tickets sold, store orders / low stock, and the finance balance — and a `features/dashboard` landing page that shows them as cards with links into each area. Pull from each module's existing endpoints. Explain how this becomes the club's at-a-glance home screen.

**Prompt 10 — Seed, test, polish**
> Add seed data (a few announcements, subscribers, reimbursements at different statuses) and, together with the team, verify the end-to-end money story: dues + ticket + merch income and a reimbursement expense all appear correctly in the summary and balance. Write tests for the summary math and reimbursement-on-approval. Make everything responsive with the shared theme and confirm nav entries exist. Explain what you verified across modules.

---

## Definition of done for you
- `GET /api/finance/summary` shows correct in / out / balance and per-category breakdown, fed automatically by P1/P2/P3.
- Reimbursements can be submitted, approved, and appear as expenses exactly once.
- An officer posts one announcement → it reaches the audience and is archived with a timestamp.
- The overview dashboard summarizes the whole club at a glance.
- Live data; validated client + server; responsive; works offline (console email, local DB).
