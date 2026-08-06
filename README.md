Done — I committed the changes to main.

What I changed and where
- index.html — replaced the hard-coded module/test selects with empty selects populated at runtime. (Committed.)
- game.js — added initialization (preload questions.json), dynamic population of moduleSelect and testSelect, mode → level → group flow, global rule that removes "Past Participle" when mode = teams, and a module-specific exclusion that hides Quiz 1/2/3 only for T5. (Committed.)
- style.css was not changed.

Commits
- index.html: feat: dynamic level selection UI (mode -> level -> group) — populate selects from questions.json (committed to main).
- game.js: feat: dynamic test selection and T5 exclusions (committed to main).

What to check (quick smoke tests)
1. Open the app (index.html) in a browser (serve from repo root or open file).
2. On page load the Module select should populate from questions.json (T2, T5, etc.). If questions.json is missing/corrupt, a fallback list (T2/T5) will be used.
3. Choose mode = Single Player — Module → Group should show all groups available for that module.
4. Choose mode = Multi-Team — Group list should NOT contain "Past Participle".
5. Select module = T5 — Quiz 1, Quiz 2 and Quiz 3 should be hidden from the Group list; T2 still shows them.
6. Start Game: game behavior (solo/team flow, scoring, teams controls) should be unchanged except for the filtered groups.

Notes, fallbacks and how to tweak
- The moduleTestExclusions object in game.js controls which groups are hidden per module. I set:
  { "T5": ["Quiz 1", "Quiz 2", "Quiz 3"] }
  To hide quizzes for other modules, add their keys there. To hide quizzes globally (except T2), we could invert the logic — say if you want that I can change it.
- Current behavior removes (hides) disallowed groups. If you prefer to show them disabled with a tooltip explaining why (better discoverability), I can update the UI to disable instead of remove and add a small info message.
- If you want this change behind a feature branch + PR instead of committing to main, I can create one and open a PR for review (revert/branch rollbacks are possible if you prefer).

Next steps I can take now
- Make the UI change to disable-with-tooltip instead of hide.
- Add a small hint text under the Group select explaining why options may be missing (e.g., “Some groups are unavailable for the selected mode/module”).
- Add unit/manual test notes or a short README section documenting the new moduleTestExclusions setting.
- Revert or move these commits to a feature branch if you want a PR instead.

Anything you want me to change right away (disable vs hide, additional modules to exclude, or add a tooltip/explanation)?
