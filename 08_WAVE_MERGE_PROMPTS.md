# After-Every-Wave Merge Prompts (Continuous Integration)

Instead of one big merge at the end, integrate after **each** wave (W1–W5). Smaller merges =
tiny, boring conflicts, and the final integration is almost free.

---

## The 3 rules that make per-wave merging safe
1. **Fixed order every wave:** merge to `main` in the order **P1 → P2 → P3 → P4**. Each person
   pulls the freshly-updated `main` *before* their own merge, so the shared append-only files
   (`settings.py` INSTALLED_APPS, `config/urls.py`, frontend route registry, `requirements.txt`,
   `package.json`) never produce a real conflict.
2. **Green before you merge:** only merge a branch that *runs* — migrations apply on a fresh DB,
   both servers boot, no import errors. A half-finished screen behind a nav item is fine; a
   broken build is not.
3. **Sync down, then push up:** every person runs the **Sync** prompt first, confirms green,
   then runs the **Publish** prompt. Never the reverse.

> **Bonus:** P1's `/api/members/me` reaches `main` at the end of **W1**, so from **W2** onward
> P2 & P3 replace their `// MOCK` stubs with the real call (see the W2 prompt). No more waiting
> until the end.

---

## REUSABLE — run these at the end of EVERY wave

### ▶ Wave Merge Prompt — SYNC (run first, before you merge up)
```
I'm at the end of wave N on branch feat/<mine>. Before I merge into main, bring my branch
up to date and prove it still runs. Do this step by step and show me each result:
1. Commit my current work with a Conventional Commit message.
2. git fetch origin, then git merge origin/main into my branch.
3. Resolve any conflicts — they should only be in append-only shared files (config/settings.py
   INSTALLED_APPS, config/urls.py, the frontend route registry, requirements.txt, package.json).
   Keep the UNION of both sides; never delete anyone else's line. Show me each resolved file.
4. Apply all migrations on a FRESH test database and boot both the Django server and the Vite
   dev server to confirm everything still runs. Run my tests.
Report green/red for each step. Do NOT push yet — stop when my branch is synced and green.
```

### ▶ Wave Merge Prompt — PUBLISH (run after SYNC is green)
```
My branch feat/<mine> is synced with main and green. Prepare and merge it:
1. Write a short PR description listing exactly what this wave added (endpoints, screens, models).
2. Give me the git commands to push and open a PR against main.
3. List what my reviewer (a different teammate) must verify before approving: it boots, all
   migrations apply, validation exists on BOTH layers, UI data comes from the API (no static
   JSON), my nav entry is registered once, and I only touched my own app/folder + append-only
   shared lines.
4. After approval, give me the merge commands (recommend squash vs merge-commit for a 4-person
   student team and explain why).
Finally, remind me to tell the next person in the P1→P2→P3→P4 order to pull main before they merge.
```

---

## PER-WAVE verification (run on `main` after all four have merged that wave)

### ✅ After W1 — models landed
```
All four apps' first models are now on main. Verify the foundation holds, don't add features:
on a fresh database, do migrations from every app (core, accounts, members, events, store,
tasks, finance, announcements) apply together with no conflict? Does Django admin load every
model? Does the backend boot and the frontend build? Report anything broken and the minimal fix.
```

### ✅ After W2 — money flows landed + DROP THE MOCKS
```
Two checks on main now that money flows exist:
1. Ledger integrity: buying a ticket and paying an order each record exactly ONE income
   Transaction (ticket / merch); approving a reimbursement records exactly ONE expense. No
   double-recording on retries.
2. Mock swap: main now contains P1's real GET /api/members/me. In events and store, replace
   every "// MOCK /api/members/me" stub with a real call, keeping the same pricing behaviour and
   handling the anonymous / non-member case. Show before/after and confirm member vs non-member
   prices and the merch discount are now correct against real membership data.
```

### ✅ After W3 — backend complete + first screens
```
All backend endpoints and the first screens are on main. Verify the shell holds together:
every feature's nav item appears exactly once (no duplicates, nothing missing), routes don't
collide, each page loads its data from the API (no static JSON), and officer-only pages are
gated by auth/role. If the route registry had a conflict, confirm it was resolved by keeping
ALL registrations. Report and fix anything broken.
```

### ✅ After W4 — most screens built
```
Run a cross-module smoke test on main with seed data: sign up a member and pay dues, buy a
member ticket and a non-member ticket, place and pay a merch order, submit a reimbursement,
post an announcement. Confirm each action appears where expected and the treasurer's finance
summary reflects the income and the expense. List any broken links between modules and the fix.
```

### ✅ After W5 — feature-complete → final integration
```
All branches are feature-complete and merged. Finish integration:
1. Build P4-9 (the overview dashboard) against the real endpoints now that they all exist.
2. Run the full end-to-end test (Merge Prompt H in 05_MERGE_GUIDE.md) covering all 6 PDF scenes.
Give me a pass/fail checklist per scene, plus a balance reconciliation: dues + tickets + merch
income − reimbursement expenses should equal the finance summary balance. Report any mismatch.
```

---

## What's left for "Phase 2" after doing this?
Almost nothing — because you integrated every wave, the old big-bang integration shrinks to just
**W5's final step** (overview dashboard + end-to-end test). Then go straight to Phase 3 polish
(responsive QA, validation audit, seed data, demo) and tag `v1.0`.
```
git tag v1.0 && git push --tags
```
