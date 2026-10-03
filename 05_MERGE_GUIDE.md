# Merge & Integration Guide

How the four branches come together on `main` without chaos. Read this before you start merging.

---

## 1. The golden rules
1. **`main` is sacred.** It must always run. Merge only via reviewed PRs.
2. **Merge in dependency order:** `P1 → P2 → P3 → P4`. P1 is the foundation; P4's finance consumes everyone's income, so it lands last.
3. **Before every merge, pull `main` into your branch first** and resolve conflicts *on your branch*, not on `main`:
   ```bash
   git checkout feat/<yours>
   git fetch origin
   git merge origin/main
   # resolve conflicts, run migrations + tests, commit
   git push
   ```
4. **PR reviewed by a non-author.** The reviewer must be able to explain the code (no rubber-stamping).
5. After each merge, **everyone re-pulls `main`** and merges it into their own branch so they stay current.

---

## 2. Integration order & checklist

### Step 0 — Freeze the contract
Confirm nobody changed the shared shapes in master plan §4 without telling the team. If a contract *did* change, announce it before merging.

### Step 1 — Merge `feat/platform-members` (P1)
Foundation is already on `main` from Phase 0; this merge adds the full members module.
- [ ] `/api/members/me` returns real discount data.
- [ ] Auth + roles work end-to-end.
- [ ] Dues payment writes to the ledger.

### Step 2 — Merge `feat/events` (P2)
- [ ] Swap any mocked `/api/members/me` call for the real one.
- [ ] Ticket purchase writes to the ledger (`record_transaction(income, ticket, …)`).
- [ ] Buy → QR → check-in → stats works against real members.

### Step 3 — Merge `feat/store-tasks` (P3)
- [ ] Swap mocked merch discount for the real `/api/members/me`.
- [ ] Paid order writes to the ledger (`record_transaction(income, merch, …)`).
- [ ] Fundraiser "raised so far" reads real fundraiser income from the ledger.

### Step 4 — Merge `feat/finance-comms` (P4)
- [ ] `GET /api/finance/summary` now sees dues + ticket + merch income automatically.
- [ ] Reimbursement approval writes an expense to the ledger (exactly once).
- [ ] Overview dashboard aggregates real numbers from all modules.
- [ ] Announcements send to real member emails.

### Step 5 — Full end-to-end test (the 6 PDF scenes)
Run the whole semester story on a clean DB + seed data:
1. New student signs up → pays dues → verified at the door.
2. Gala tickets sell (member vs non-member price) → QR check-in → stats show attendance + revenue.
3. Post one announcement → it reaches everyone → it's archived.
4. Member orders a hoodie by size → stock drops → order is paid.
5. Volunteers split a fundraiser into tasks → board shows progress.
6. Treasurer opens the dashboard → every income + the reimbursement expense is there → balance is correct.

---

## 3. Where conflicts will actually happen (and the fix)

| File | Why it conflicts | Resolution |
|---|---|---|
| `backend/config/settings.py` (`INSTALLED_APPS`) | Everyone adds their app | Keep **all** apps from both sides (union). |
| `backend/config/urls.py` | Everyone adds an `include()` | Keep **all** `include()` lines. |
| `backend/requirements.txt` | Added deps | Keep the **union**, de-duplicate, sort. |
| `frontend/package.json` | Added deps | Keep the **union** of dependencies; run `npm install` after. |
| Frontend **route registry** | Everyone registers routes/nav | Keep **all** registrations from both sides. |
| `tailwind.config` / theme | Only if someone edited shared tokens | Prefer the Phase-0 version; don't let a feature redefine global tokens. |
| Migrations | Rare, since apps are separate | If two migrations share a dependency, re-run `makemigrations` after merging and commit the merge migration. |

> If these stay **append-only one-liners** (as the master plan asks), each one is a 10-second resolution.

---

## 4. Copy-paste merge prompts

Use these with an AI assistant **while resolving a specific conflict or wiring step**. Paste the conflicting file / diff alongside.

**Merge Prompt A — settings / urls conflict**
> I'm merging `origin/main` into my feature branch and have a conflict in `config/settings.py` (INSTALLED_APPS) and/or `config/urls.py`. Both sides only *added* lines. Produce the resolved file that keeps **every** app and every URL include from both sides, with no duplicates, and nothing removed. Explain what you kept.

**Merge Prompt B — requirements / package.json conflict**
> Here are both versions of `requirements.txt` (or `package.json`) from a merge conflict. Produce a merged file that is the **union** of all dependencies, de-duplicated, with consistent versions (flag any version disagreements for me to decide). Explain any conflicts you couldn't auto-resolve.

**Merge Prompt C — frontend route registry conflict**
> Two feature branches both registered routes and nav items in the route registry and now conflict. Here are both versions. Merge them so **all** features' routes and nav entries are present, imports are all kept, and ordering is sensible. Explain the result.

**Merge Prompt D — replace a mocked contract with the real API**
> During parallel development I mocked `GET /api/members/me` to always return a non-member (0% discount). P1's real endpoint is now merged and returns `{ is_active_member, ticket_discount_pct, merch_discount_pct, expires_on }`. Here is my code that uses the mock: [paste]. Replace the mock with a real call to `/api/members/me`, keep the same pricing behaviour, handle the not-logged-in / non-member case, and explain the change.

**Merge Prompt E — wire income into the shared ledger**
> This module takes payments but isn't yet recording them in the treasury ledger. Here's the relevant view/service: [paste]. After a successful payment, call `core.record_transaction(type='income', category='<ticket|merch|dues|fundraiser>', amount=<total>, source='<ref>', description='<text>')`, exactly once, and make it safe against retries/double-submits. Explain where you placed the call and why.

**Merge Prompt F — reimbursement expense, exactly once**
> On reimbursement **approval** this should write one `expense`/`reimbursement` transaction to the ledger, and never again if approved twice. Here's the approve action: [paste]. Add the `core.record_transaction(expense, reimbursement, …)` call with idempotency, and explain how you guarantee it only records once.

**Merge Prompt G — migration conflict after merge**
> After merging `main` into my branch, `python manage.py makemigrations` reports conflicting/duplicate migrations across apps. Here's the output: [paste]. Tell me the safe sequence to resolve it (which migrations to keep, whether to create a merge migration), without losing anyone's schema changes. Explain each step before I run it.

**Merge Prompt H — final end-to-end smoke test script**
> Write a script (Django management command or pytest) that runs the full semester flow on a fresh seeded DB: create a member + pay dues, sell a member and a non-member ticket, check one in, place and pay a merch order, submit + approve a reimbursement, then assert that `GET /api/finance/summary` shows the correct income by category, the reimbursement as expense, and the right balance. Explain each assertion.

---

## 5. After the final merge
- Tag a release: `git tag v1.0 && git push --tags`.
- Freeze `main`, do a full responsive pass (mobile + desktop) and a validation audit (every form rejects bad input on the server too).
- Load the shared seed data and record the demo walking through all six PDF scenes.
- Update the root `README.md` with setup + a one-line description of each module and who built it.
