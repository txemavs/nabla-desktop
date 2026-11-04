# AGENTS.md

## IMPORTANT: Rule zero: look first, reuse, no stopgaps

> **IMPORTANT. This rule is mandatory for every change, every day, by everyone. Read it before you write a single line.**

- **Look first.** Before writing any new system, helper, path or format, search this repo and the other Nabla repos for one that already exists. Reuse or extend it. Inventing a parallel system that duplicates an existing one is **forbidden**.
- **No stopgap fixes.** Fix the root cause in the shared, generic code path, not with special cases, early returns or scene-specific hacks.
- **One path per concern.** For example, every shot is resolved by the engine's shot query, and every wound comes from its impact events.
- **If you are unsure whether something already exists, ask before building it.**
- **This rule is repeated on purpose, and it applies to every change.** Do not do it. Look first. Look first.

