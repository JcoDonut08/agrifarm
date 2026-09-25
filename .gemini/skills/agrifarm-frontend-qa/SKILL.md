---
name: agrifarm-frontend-qa
description: Validate an implemented or modified AgriFarm frontend in a rendered browser using the existing Playwright setup. Use after a frontend feature, localization change, responsive fix, or UI polish; not for backend-only changes.
---

# AgriFarm frontend QA

Inspect the existing Playwright configuration and relevant end-to-end tests before adding test code or running the browser suite. Validate real rendering rather than relying only on a successful build.

- Check the affected page at 390px, 768px, and 1440px widths, including content below the fold.
- Look for overflow, clipped or overlapping content, broken responsive layout, unreadable text, weak contrast, unusable controls, and modals, menus, or tables leaving the viewport.
- Exercise applicable interactions: navigation, mobile navigation, dialogs, menus, search/filtering, pagination, forms, validation, loading, and empty/error states.
- Verify the observable outcome, not only the presence of an element. Do not use or create fake production data to make a test pass.
- When a defect appears, fix its source and rerun the affected viewport and interaction checks. Keep any implementation fix scoped to the reported frontend behavior.
- Report the pages, viewports, and interactions actually checked, plus any limitation. Do not claim full responsiveness or visual polish if rendered validation did not occur.

Use `npm run test:e2e` for the existing browser suite when it is relevant. Do not retain unnecessary screenshots or test artifacts.
