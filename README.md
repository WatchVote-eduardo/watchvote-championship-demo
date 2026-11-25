# WatchVote World Championship of Watch Clubs

**Steps 1–2: mock engine, public landing and animated explainer.** A static, browser-only 2027 tournament demo. No backend, real authentication, real photographs, email notifications or connection to WordPress. All clubs and accounts are fictional. All wristwatch illustrations were created for this project; no Instagram or club images are used.

## Run

Node 20+ for tests; Python 3 for the static server. No runtime dependencies, build step or pre-commit hooks. Development dependencies are only needed to regenerate the committed videos.

```sh
npm test
npm start
```

Open `http://localhost:8765/?demo=1`. Without `?demo=1`, the toolbar and mock role switching are hidden and the public clock follows the real date. With it, role and phase controls simulate the chosen phase at noon on its opening day. Switch to **WatchVote admin** and open **Admin** to edit settings, calendar dates, round themes, cutoff, brand list, or the 8/12/16-club demo field. The club picker chooses the fictional membership for Club member and Club admin personas; Community voter is a fully registered account with no roster.

## Review the demo

- `engine.mjs`: schedule, category validation/review, qualification, rosters, replaceable submissions, hub ballots, sealed picks, seeded shuffle, byes, round advancement, Arena votes, tie-breaks, fairness settings.
- `mock.mjs`: one tournament, 16 international clubs, 12–25 registered members per club, four categories of illustrated entries, sample club ballots, storage and phase simulation.
- `app.mjs`: review shell, private-hub guard, sample club ballots, draw and matchup previews, settings console, role/phase controls, vote simulation and reset.
- `engine.test.mjs`: required rules plus schedule boundaries, storage failures and complete 8/12/16-club tournament advancement.
- `explainer.mjs`: deterministic 70-second SVG storyboard shared by the website and both Instagram exports.
- `explainer-player.mjs`: muted viewport autoplay, play/pause, replay, seeking, seven scene chips, optional voiceover slot and seven static cards for reduced motion.
- `applications.mjs`: validated fictional applications, optional raster logo (up to 2 MB), 256px metadata-free logo preview/storage and confirmation screen; applications persist in the existing admin queue.
- `explainer.test.mjs`: storyboard boundaries, configured round themes, end-card timing and application validation.
- `trivia.css` and local fonts: copied unchanged from `WatchVote-eduardo/watchvote-trivia-demo`; `championship.css` extends the same tokens and masthead.

Data is saved under `watchvote-championship-v1` in localStorage. Refresh retains rules, mock applications and votes, but intentionally starts as Guest on the real current phase. Reset restores the seed data. Rewinding the phase control clears the draw and Arena results before recreating the requested state. Advancing simulates completed earlier rounds. These are review conveniences, not production state transitions.

## Assumptions and choices

- Delivery follows the brief's five review steps; **Prompts 1–2** are implemented. The full member upload/crop/privacy flow, invitation management, live draw animation, PNG share exports and full moderation console remain for subsequent steps.
- Final closes at **20:00 America/New_York on April 5, 2027** (editable); dates carry explicit Miami offsets. Between scheduled windows the prior phase remains displayed, but voting/upload actions enforce their precise open/close dates.
- Defaults: blind and neutral voting on, live percentages hidden, 10-member minimum, 1996 cutoff, no account-age minimum, multiple category picks per member allowed. Eight-club fields omit Open; 9–15 use 16 slots with randomly placed byes.
- Draw method: UTF-16 seed characters hashed by FNV-1a, then Mulberry32 and Fisher–Yates. It is deterministic and tested, **not a cryptographic fairness guarantee**. Production needs server-owned randomness and an audit trail.
- Hub ties choose earliest upload. Arena ties use the winning shot's club-ballot share, then require an explicit recorded admin coin flip. The phase simulator supplies a documented deterministic A flip for simulated ties only.
- Turning off the multiple-picks default assigns used categories in configured round order, skipping an already-selected member; unused categories are considered last. This is a mock policy to review before production.
- The application form and confirmation screen are browser-local; the approval queue does not yet create private invites or new founder accounts. Logo is optional and uses a monogram fallback; Instagram is optional. Do not use real personal information.
- Brand edits and cutoff edits affect new validations; existing approved mock shots are not silently reclassified. Moderation/reclassification belongs in the later admin review step.

## Explainer and Instagram exports

The seven scenes follow the supplied timing exactly: **0–6, 6–14, 14–24, 24–34, 34–42, 42–60, 60–70 seconds**. The final scene shows the champion until 68 seconds, followed by the two-second WatchVote / watchvote.com end card, keeping the full film at 70 seconds. Page captions are real text; video captions are burned in. Both exports are silent by design, with no music or third-party media.

- [Reels / Stories — 1080 × 1920](assets/video/watchvote-championship-reels.mp4)
- [Instagram feed — 1080 × 1350](assets/video/watchvote-championship-feed.mp4)

Both are H.264, 24 fps, yuv420p, with fast-start metadata. They share the exact SVG scene renderer used in the page. The vertical cut centers the feed composition on the WatchVote warm background, keeping captions out of the top and bottom interface zones. The committed cuts use the Registration call to action, **Enter your club**. The web end card follows the selected phase; regenerate later cuts with the appropriate CTA:

```sh
npm install
# FFmpeg must be installed and on PATH.
npm run export:instagram -- --cta="Enter your club"
# Other supported CTAs: "Get notified" or "Vote now".
```

`tools/fonts/` contains static TTF instances derived from the bundled OFL-licensed Jost and Cormorant Garamond variable fonts, solely for offline rendering. Their original licenses are in `assets/fonts/`. No fonts or images are downloaded during export.

The player starts muted on first scroll into view, pauses when out of view or when the tab is hidden, and rests on the final frame rather than looping. Scene chips and the timeline seek while paused; Replay restarts playback. With reduced motion, all seven illustrations and captions are static, including a list of the round themes. An optional future voiceover can be passed as `voiceoverSrc` to `mountExplainer`; its sound control only appears when a track is supplied. No audio permission or remote service is needed.

The landing countdown targets the next phase opening and refreshes every 15 seconds without restarting the explainer. Phase changes, timeline highlights, themes, cutoff and FAQ rules follow the tournament engine and saved admin settings. On and after Draw day, public mode projects a fictional draw and closed-round results in memory, so a new visitor gets the bracket/champion preview without opening demo controls. This read-only projection never publishes a draw, overwrites saved applications or locks the admin’s custom seed. Applications reload canonical storage immediately before saving. These are mock results, not a live tournament. The Get notified preview offers a calendar download; it does not claim to send email.

## Hosting and review

GitHub Pages serves the repository root from `main`, like the Daily Trivia demo. The project owner merges the reviewed PR; GitHub Pages must be enabled in repository settings using **Deploy from a branch → main → / (root)**. The footer links to the source. All asset URLs are relative so a GitHub Pages project path works.

## Production boundary (programmer handoff preview)

Client role checks and sealed views are UX only. **Every mock object, hidden pick, vote and setting is inspectable and editable in the browser. Do not put real private data here.** Move authentication through the existing full WatchVote registration, membership approval, roster uniqueness, image processing/EXIF removal, category moderation, pick sealing, draw, immutable Arena votes, counters and tie-break audit logs to the server before launch. localStorage is not a security or integrity boundary. The complete WordPress/API handoff follows in Step 5.

Suggested API boundaries: `GET /tournaments/:id`, `POST /clubs/applications`, `POST /hubs/:id/join`, `POST /hubs/:id/submissions`, `PUT /hubs/:id/ballots/:category`, `POST /tournaments/:id/draw`, `GET /matchups/:id`, `POST /matchups/:id/votes`, and admin-only configuration/moderation routes. Only public revealed data should leave those APIs.
