# Person 2 — Events & Ticketing

**Branch:** `feat/events`
**You own (backend):** `events`
**You own (frontend):** `features/events`
**PDF scene you solve:** *"Selling tickets for the spring gala"* — online sale, member vs non-member pricing, a seat limit, QR check-in in seconds (no printed list), and after the event: how many showed up and how much it made.

> Branch from `main` **after** Phase 0 is merged: `git checkout main && git pull && git checkout -b feat/events`.
> You depend on two Phase-0/P1 things: `core.record_transaction` (ledger) and `GET /api/members/me` (discount). If P1's `/api/members/me` isn't ready yet, **mock** it (assume non-member) and swap to the real call at integration.

---

## Your slice of the contract
- `Event { title, description, datetime, venue, capacity, member_price, nonmember_price, status }`
- `Ticket { event, holder, type ∈ {member, nonmember}, price_paid, token, status ∈ {valid, checked_in}, checked_in_at }`
- Endpoints: `GET/POST /api/events`, `GET /api/events/{id}/availability`, `POST /api/events/{id}/tickets`, `POST /api/tickets/{token}/check-in`, `GET /api/events/{id}/stats`.
- On ticket purchase → `core.record_transaction(income, ticket, …)`.

---

## Build prompts (one at a time)

**Prompt 1 — Events app & model**
> In a new Django `events` app, create an `Event` model with title, description, datetime, venue, capacity (positive int), member_price, nonmember_price (non-negative decimals) and status (draft/published/closed). Add a serializer, CRUD endpoints under `/api/events`, Django admin, and register the app in `INSTALLED_APPS` and `config/urls.py` (append-only). Add validation: event datetime must be in the future on creation, capacity ≥ 1, prices ≥ 0. Explain the model and the validation rules you added.

**Prompt 2 — Live availability (dynamic, no oversell)**
> Add `GET /api/events/{id}/availability` returning `{ capacity, sold, remaining }` computed live from ticket counts. Add a reusable check that prevents selling when `remaining == 0`. Explain why this is computed from the DB on every request (so it's always real-time) rather than cached in a column, and when you'd reconsider for performance.

**Prompt 3 — Ticket purchase with member pricing → ledger**
> Create a `Ticket` model (event FK, holder, type, price_paid, token=UUID, status, checked_in_at) and `POST /api/events/{id}/tickets`. On purchase: call `GET /api/members/me` (or the mocked version) to decide member vs non-member price, re-check availability to prevent overselling under concurrency, generate a unique token, and call `core.record_transaction(income, ticket, amount=price_paid, …)`. Validate buyer details. Explain the pricing logic and how you prevent two people buying the last seat at once.

**Prompt 4 — QR code generation**
> Add QR generation for each ticket using the `qrcode` library, encoding the ticket `token`. Expose it via an endpoint (`GET /api/tickets/{token}/qr`) returning a PNG or data URL, and include the token in the purchase response so the frontend can show it. Explain what's encoded in the QR and why we use an opaque token rather than a sequential ID.

**Prompt 5 — Door check-in (fast, idempotent)**
> Add `POST /api/tickets/{token}/check-in` that validates the token, marks the ticket `checked_in` with `checked_in_at`, and **rejects double check-ins and invalid/unknown tokens** with clear messages. Add `GET /api/events/{id}/checkin-feed` returning the live checked-in count and recent check-ins. Explain the idempotency handling and the officer-only permission.

**Prompt 6 — Post-event stats**
> Add `GET /api/events/{id}/stats` returning tickets sold, attendance (checked-in count), attendance rate, and revenue (sum of price_paid, split by member/non-member). Explain how these numbers are derived from the same tables (single source of truth) rather than stored separately.

**Prompt 7 — Events frontend: browse + buy**
> In `src/features/events/`, build an event list (cards, from the API) and an event detail page that shows **live seats-left** using React Query with a short `refetchInterval`, the member vs non-member price (based on the logged-in user), and a buy-ticket flow with validated inputs and inline errors. On success, show the ticket + its QR. Register routes + nav. Explain how the live counter works and confirm nothing is hard-coded.

**Prompt 8 — Door scanner page**
> Build an officer-only "Check-in" page using `html5-qrcode` to scan a ticket QR with the device camera, POST to the check-in endpoint, and show instant ✅ valid / ❌ invalid / ⚠️ already-checked-in feedback, plus a live attendance counter that updates as people are scanned. Handle camera-permission errors. Explain how this works on a phone on the local network and replaces the printed list.

**Prompt 9 — Event management + stats dashboard**
> Build officer-only create/edit event forms (validated) and an event stats view that visualizes attendance and revenue (simple bar/number cards; a lightweight chart lib is fine if it adds value). Pull everything from the stats endpoint. Explain the UI and how an officer uses it after the gala.

**Prompt 10 — Seed, test, polish**
> Add seed data (a couple of events with tiers of tickets, some checked in), write a few tests for pricing and no-oversell, make all pages responsive with the shared components/theme, and confirm the nav entry is in the registry. Explain what you tested and any edge cases (sold-out, expired member, double scan).

---

## Definition of done for you
- Tickets sell online at the correct member/non-member price.
- Capacity is enforced — no overselling.
- A ticket checks in from a phone camera in seconds; double scans are blocked.
- After the event, sold/attendance/revenue are visible.
- Every ticket sale shows up in the treasurer's ledger.
- Live data everywhere (seats-left, check-in counter); validated client + server; responsive.
