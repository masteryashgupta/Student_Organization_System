# Parallel Execution Schedule — which prompt runs when

How the 4 people run their README prompts **at the same time** with the fewest blocks.
Prompt IDs = `P<person>-<prompt#>` (e.g. `P2-3` = Person 2, prompt 3).

---

## The only hard rule about order
1. **Phase 0 blocks everything.** No one can branch until `P1-1 → P1-5` are merged to `main`.
2. **P2 and P3 don't wait on P1's member endpoint** — they *mock* `GET /api/members/me` during Phase 1 and swap it for the real one at integration. So they start immediately.
3. **P4 doesn't wait on income data** — it reports on the shared ledger and tests with seed transactions; real income flows in at integration.
4. The only prompt that *must* come last is **P4-9 (overview dashboard)** — it needs everyone's endpoints merged.

---

## GATE 0 — Phase 0 (mob all 4 people, on `main`)
Do these **together / pair-program**, in order. They're sequential (each builds on the last). ~2–3 days.

```
P1-1  Scaffold monorepo
P1-2  Django base config
P1-3  Shared ledger (core.record_transaction)
P1-4  Custom user + roles + auth
P1-5  Frontend foundation, design system, route registry, API client, auth pages
```
**If you'd rather not mob:** P1 drives the 5 prompts; P2/P3/P4 spend the time on env setup, reading the §4 contracts, sketching their UI, and listing seed data. Nobody writes feature code yet.

> ✅ Merge Phase 0 to `main`. **Everyone pulls, then branches:**
> `feat/platform-members`, `feat/events`, `feat/store-tasks`, `feat/finance-comms`.

---

## PHASE 1 — parallel waves (one row = everyone works at once)

| Wave | Person 1 (members) | Person 2 (events) | Person 3 (store+tasks) | Person 4 (finance+comms) |
|---|---|---|---|---|
| **W1** · backend models | `P1-6` members models + `/api/members/me` | `P2-1` event model · `P2-2` availability | `P3-1` product/variant · `P3-2` inventory | `P4-1` finance summary · `P4-6` announcement model |
| **W2** · money flows | `P1-7` dues→ledger · `P1-8` expiry/reminders | `P2-3` purchase + pricing *(mock /members/me)* · `P2-4` QR | `P3-3` orders + discount *(mock)* · `P3-4` payment | `P4-2` reimbursement · `P4-3` tx list + manual |
| **W3** · finish backend | `P1-9` verify · `P1-10` members frontend | `P2-5` check-in · `P2-6` stats | `P3-5` storefront UI · `P3-7` tasks model | `P4-7` mailing send · `P4-8` announcements UI |
| **W4** · frontend | *done → floating reviewer* | `P2-7` browse/buy · `P2-8` scanner | `P3-6` checkout/orders · `P3-8` kanban board | `P4-4` treasurer dashboard · `P4-5` reimbursement UI |
| **W5** · finish + self-test | *help + integration prep* | `P2-9` manage/stats · `P2-10` seed/test | `P3-9` fundraiser progress · `P3-10` seed/test | `P4-10` seed/test  *(P4-9 deferred ↓)* |

**Checkpoint after each wave:** everyone commits + pushes their branch, and pulls `main` (`git merge origin/main`) to stay current. Keep `settings.py` / `urls.py` / route-registry edits to append-only one-liners.

**Why this works in parallel**
- W1 is pure models/admin per app — zero cross-talk.
- W2 writes money into the **shared ledger** (built in Phase 0), so P4 can already test `P4-1`/`P4-2` against it.
- Member pricing (`P2-3`, `P3-3`) is mocked, so P2/P3 never block on P1.
- P1 finishes early (only 5 feature prompts) and becomes the floating reviewer / integration lead for Phase 2.

---

## PHASE 2 — integration (ordered, NOT parallel)
Merge one branch at a time, in dependency order. Use the copy-paste prompts in `05_MERGE_GUIDE.md`.

```
1. Merge feat/platform-members → main          (real /api/members/me is now live)
2. Merge feat/events → main
      ↳ Merge Prompt D: swap P2 mock → real /api/members/me
      ↳ verify ticket income lands in the ledger
3. Merge feat/store-tasks → main
      ↳ Merge Prompt D: swap P3 mock → real
      ↳ verify merch income + fundraiser "raised" figure
4. Merge feat/finance-comms → main
      ↳ NOW run P4-9  (overview dashboard — needs all module endpoints)
      ↳ verify finance summary = dues + tickets + merch − reimbursements
5. Merge Prompt H: full end-to-end smoke test of all 6 PDF scenes
```
Resolve conflicts with Merge Prompts A/B/C/G as they come up.

---

## PHASE 3 — polish (parallel again)
Split freely: responsive QA on mobile + desktop, server-side validation audit, shared seed data, record the demo, update root `README.md`.

---

## One-screen summary
```
GATE 0 (all 4, sequential)      P1-1 → P1-5  ──merge──▶ branch out
        │
PHASE 1 (parallel, 5 waves)     P1: 6,7,8,9,10
        │                       P2: 1,2 → 3,4 → 5,6 → 7,8 → 9,10
        │                       P3: 1,2 → 3,4 → 5,7 → 6,8 → 9,10
        │                       P4: 1,6 → 2,3 → 7,8 → 4,5 → 10
        │                       (P2-3/P3-3 use MOCK member discount)
        ▼
PHASE 2 (ordered merges)        P1▶P2▶P3▶P4, swap mocks→real, then P4-9, then E2E
        ▼
PHASE 3 (parallel)              responsive + validation + seed + demo
```
