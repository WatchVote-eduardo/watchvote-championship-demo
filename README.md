# WatchVote World Championship of Watch Clubs

**Step 1: setup and mock engine.** A static, browser-only 2027 tournament demo. No backend, real authentication, real photographs, notifications or connection to WordPress. All clubs and accounts are fictional. The four original SVG wristwatch illustrations were created for this project; no Instagram or club images are used.

## Run

Node 20+ for tests; Python 3 for the static server. No dependencies, build step or pre-commit hooks.

```sh
npm test
npm start
```

Open `http://localhost:8765/?demo=1`. Without `?demo=1`, the toolbar and mock role switching are hidden and the public clock follows the real date. With it, role and phase controls simulate the chosen phase at noon on its opening day. Switch to **WatchVote admin** and open **Admin** to edit settings, calendar dates, round themes, cutoff, brand list, or the 8/12/16-club demo field. The club picker chooses the fictional membership for Club member and Club admin personas; Community voter is a fully registered account with no roster.

## Review this first step

- `engine.mjs`: schedule, category validation/review, qualification, rosters, replaceable submissions, hub ballots, sealed picks, seeded shuffle, byes, round advancement, Arena votes, tie-breaks, fairness settings.
- `mock.mjs`: one tournament, 16 international clubs, 12–25 registered members per club, four categories of illustrated entries, sample club ballots, storage and phase simulation.
- `app.mjs`: review shell, private-hub guard, sample club ballots, draw and matchup previews, settings console, role/phase controls, vote simulation and reset.
- `engine.test.mjs`: required rules plus schedule boundaries, storage failures and complete 8/12/16-club tournament advancement.
- `trivia.css` and local fonts: copied unchanged from `WatchVote-eduardo/watchvote-trivia-demo`; `championship.css` extends the same tokens and masthead.

Data is saved under `watchvote-championship-v1` in localStorage. Refresh retains rules, mock applications and votes, but intentionally starts as Guest on the real current phase. Reset restores the seed data. Rewinding the phase control clears the draw and Arena results before recreating the requested state. Advancing simulates completed earlier rounds. These are review conveniences, not production state transitions.

## Assumptions and choices

- Delivery follows the brief's five review steps; this PR is **Prompt 1 only**, with an editorial landing shell and lightweight previews so the engine is reviewable. The 70-second animation, MP4 exports, complete upload/crop/privacy flow, invitation management, live draw animation, PNG share exports and full moderation console remain for the next steps.
- Final closes at **20:00 America/New_York on April 5, 2027** (editable); dates carry explicit Miami offsets. Between scheduled windows the prior phase remains displayed, but voting/upload actions enforce their precise open/close dates.
- Defaults: blind and neutral voting on, live percentages hidden, 10-member minimum, 1996 cutoff, no account-age minimum, multiple category picks per member allowed. Eight-club fields omit Open; 9–15 use 16 slots with randomly placed byes.
- Draw method: UTF-16 seed characters hashed by FNV-1a, then Mulberry32 and Fisher–Yates. It is deterministic and tested, **not a cryptographic fairness guarantee**. Production needs server-owned randomness and an audit trail.
- Hub ties choose earliest upload. Arena ties use the winning shot's club-ballot share, then require an explicit recorded admin coin flip. The phase simulator supplies a documented deterministic A flip for simulated ties only.
- Turning off the multiple-picks default assigns used categories in configured round order, skipping an already-selected member; unused categories are considered last. This is a mock policy to review before production.
- A small demo application form and approval queue are included as previews; they do not yet create private invites or new founder accounts. Do not use real personal information.
- Brand edits and cutoff edits affect new validations; existing approved mock shots are not silently reclassified. Moderation/reclassification belongs in the later admin review step.

## Hosting and review

GitHub Pages serves the repository root, like the Daily Trivia demo. The review deployment may follow the PR branch so the demo can be reviewed without merging application code. After approval, change the Pages source to `main` after merging. The footer links to the source. All asset URLs are relative so a GitHub Pages project path works.

## Production boundary (programmer handoff preview)

Client role checks and sealed views are UX only. **Every mock object, hidden pick, vote and setting is inspectable and editable in the browser. Do not put real private data here.** Move authentication through the existing full WatchVote registration, membership approval, roster uniqueness, image processing/EXIF removal, category moderation, pick sealing, draw, immutable Arena votes, counters and tie-break audit logs to the server before launch. localStorage is not a security or integrity boundary. The complete WordPress/API handoff follows in Step 5.

Suggested API boundaries: `GET /tournaments/:id`, `POST /clubs/applications`, `POST /hubs/:id/join`, `POST /hubs/:id/submissions`, `PUT /hubs/:id/ballots/:category`, `POST /tournaments/:id/draw`, `GET /matchups/:id`, `POST /matchups/:id/votes`, and admin-only configuration/moderation routes. Only public revealed data should leave those APIs.
