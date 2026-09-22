# Changelog

## Unreleased — Phase 2

- Default to foreground maximization; background world mode remains opt-in.
- Add framework-independent commands and external-content lifecycle adapters through `@nabla/desktop/core`.
- Add menu bar, nested/context menus, toolbar, scoped shortcuts and inherited theme tokens.
- Extend the interactive lab with native canvas content, linked commands and light/dark themes.
- Document input ownership, lifecycle, browser requirements and migration boundaries.

## Unreleased — Phase 1

- Export the stylesheet and place TypeScript declarations first in package exports.
- Validate packaged consumers with Pinia 2 and Agency's Vue/Pinia 4/Vuetify profile.
- Add explicitly named desktop store factories and isolate counters and timers.
- Repair active-window and registration/maximization invariants.
- Measure WindowHost containers, constrain geometry and support explicit viewport mode.
- Provide explicit background and exclusive maximization policies.
- Add hide/dispose close policies and opt-in retained content after close.
- Clean up pointer gestures and timers; avoid lagging drag/resize transitions.
- Add distribution/browser tests and document public contracts and migration differences.

Menus, tabs, docking, persistence and detached-browser-window adapters remain on
the shared roadmap and are not included in this phase.
