# Testing the distribution

`npm test` checks state transitions, including missing/closed IDs, maximization,
instance isolation, shrink recovery, content policies and timer disposal.

`npm run test:package` builds and packs the library, installs that tarball in two
fresh temporary consumers and checks public TypeScript declarations. Each consumer
runs in Chromium through Vite without source aliases. It checks stylesheet export
and actual computed style, pointer drag and resize, container bounds, focus,
background maximization, minimize/restore, keep-alive close/reopen, default close
unmounting and lazy initial content. The temporary installations are removed even
when a test fails.

Profiles:

- Vue 3.4.21 / Pinia 2.1.7.
- Vue 3.5.41 / Pinia 4.0.3 / Vuetify 4.1.10 (Agency dependency profile).

The Agency profile activates Vuetify but is not a full Agency application test.
These tests validate the window shell, not Studio's WebGL performance or an
external-content adapter. Chromium is currently the automated browser baseline;
Firefox/WebKit and full keyboard accessibility need separate coverage.

Install Chromium with `npx playwright install chromium` (CI uses `--with-deps`).
A local executable may be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
The test requires registry access to install the exact consumer versions. It does
not publish packages, change production applications or contact their backends.

Phase 2 adds core command availability/concurrency/modifier tests and external-content
lifecycle cleanup tests. The demo browser suite covers foreground maximization,
shared menu/toolbar/shortcut state, text-input isolation, nested/context menus and
theme switching. Packaged consumer type checks include the core and new UI exports.

Phase 3 adds workspace invariant, version validation, migration/storage and async
close-guard tests. `test:workspace` exercises real tab drag/drop, keyboard splitting
and floating movement, native canvas identity, retained documents, dialog dismissal
and compact bounds. Both packed dependency profiles now mount WorkspaceHost with
Vue document and native canvas content and round-trip an injected layout adapter.
