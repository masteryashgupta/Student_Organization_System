# Person 3 — Merch Store & Volunteer Tasks

**Branch:** `feat/store-tasks`
**You own (backend):** `store`, `tasks`
**You own (frontend):** `features/store`, `features/tasks`
**PDF scenes you solve:**
- *"Ordering hoodies for the club"* — collect sizes, take orders + payment, know how many of each size are left.
- *"Planning a fundraiser"* — split tasks (who bakes, who buys, who runs the table), see at a glance what's done, who's doing it, and whether it's on track.

> Branch from `main` after Phase 0: `git checkout main && git pull && git checkout -b feat/store-tasks`.
> You depend on `core.record_transaction` (ledger) and `GET /api/members/me` (merch discount). Mock the discount as 0% if P1 isn't ready, then swap at integration.

---

## Your slice of the contract
- `Product { name, type, price, description, image }`, `ProductVariant { product, size, stock_qty }`
- `Order { buyer, status ∈ {pending, paid, fulfilled}, total }`, `OrderItem { order, variant, qty, unit_price }`
- `Project { name, goal_amount, status }`, `Task { project, title, assignee, status ∈ {todo, doing, done}, due_date }`
- On order paid → `core.record_transaction(income, merch, …)`.

---

## Build prompts (one at a time)

**Prompt 1 — Store models (products + sized variants + stock)**
> In a Django `store` app, create `Product` (name, type e.g. hoodie/tee, price, description, image) and `ProductVariant` (product FK, size, stock_qty ≥ 0). Add serializers, CRUD endpoints under `/api/products`, Django admin, and register the app in settings + urls (append-only). Validate price > 0 and stock_qty ≥ 0. Explain the product/variant split and why stock lives on the variant (per size), not the product.

**Prompt 2 — Inventory logic (no overselling)**
> Add stock handling: a reusable function that decrements variant stock when an order is paid, rejects orders that exceed available stock, and a restock endpoint for officers. Expose current stock per variant in the product API so the storefront is always accurate. Explain how you prevent two buyers taking the last item at once, and how "out of stock" is surfaced.

**Prompt 3 — Cart & orders + member discount + ledger**
> Create `Order` (buyer, status, total) and `OrderItem` (order, variant, qty, unit_price). Add `POST /api/orders` that takes a cart of variant+qty, validates stock, applies the member merch discount from `GET /api/members/me` (or mocked 0%), computes the total, and creates a pending order. Add status transitions (pending → paid → fulfilled). When an order becomes **paid**, decrement stock and call `core.record_transaction(income, merch, amount=total, …)`. Explain the order lifecycle and where validation happens.

**Prompt 4 — Payment abstraction (offline-first)**
> Add a small payment abstraction with two providers: a `manual/mock` provider that marks the order paid instantly (works fully offline, for demos and cash/transfer) and an optional Stripe **test-mode** provider behind an env flag. Wire "pay" to flip the order to paid via the chosen provider. Explain the abstraction and how it keeps us working without internet while leaving room for a real gateway.

**Prompt 5 — Storefront frontend**
> In `src/features/store/`, build a responsive product catalog (grid of cards from the API, showing live stock) and a product detail page with a **size selector that reflects per-size stock** and an add-to-cart action. Build a cart drawer/page. Disable buying sizes that are out of stock. Register routes + nav. Explain how stock stays accurate and confirm nothing is hard-coded.

**Prompt 6 — Checkout + my orders + officer view**
> Build a validated checkout flow (buyer details, order summary, pay via the abstraction), an order confirmation screen, and a "my orders" list for logged-in users. Add an officer-only order-management view (update status to fulfilled) and a **low-stock** view. Explain the validation and how an officer fulfills orders.

**Prompt 7 — Tasks models (fundraiser boards)**
> In a Django `tasks` app, create `Project` (name, goal_amount, status) representing a fundraiser, and `Task` (project FK, title, assignee FK to user, status ∈ todo/doing/done, due_date). Add serializers, CRUD endpoints under `/api/projects` and `/api/tasks`, and admin. Validate that a task belongs to a project and has a valid assignee. Explain the data model and how it maps to "who's baking / buying / running the table".

**Prompt 8 — Task board frontend (Kanban)**
> Build a Kanban board in `src/features/tasks/` with Todo / Doing / Done columns, showing each task's title, assignee and due date. Let officers create tasks and assign people, and let assignees move their tasks between columns. Keep it dynamic — refetch on focus + a short interval (and/or optimistic updates). Register routes + nav. Explain the "at a glance" view and how updates stay in sync across users.

**Prompt 9 — Fundraiser progress tracking**
> Add a progress indicator per project: raised-so-far vs `goal_amount`. Raised-so-far should come from the ledger (fundraiser-category income) rather than being typed in, so it's real. Show a progress bar + a done/total task count so officers can see if the fundraiser is "on track". Explain where the raised figure comes from and why we don't duplicate it.

**Prompt 10 — Seed, test, polish**
> Add seed data (a few products with sizes/stock, a fundraiser with tasks), write tests for no-oversell and order totals/discounts, make all pages responsive with the shared components/theme, and confirm nav entries are registered. Explain what you tested and the edge cases (out-of-stock size, discount applied, task reassignment).

---

## Definition of done for you
- Members order hoodies online by size; stock is accurate and can't go negative.
- Paid orders appear in the treasurer's ledger.
- A fundraiser's tasks are visible on a board with owners and status.
- Fundraiser progress (raised vs goal) reflects real ledger data.
- Payments work offline via the mock provider; Stripe optional.
- Live data; validated client + server; responsive.
