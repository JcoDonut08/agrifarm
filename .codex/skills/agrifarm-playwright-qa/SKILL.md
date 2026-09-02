---
name: agrifarm-playwright-qa
description: Validate an implemented or modified AgriFarm frontend in the actual rendered browser, including responsive behavior and interactions, using Playwright when available.
---

# AgriFarm Playwright QA

Validate frontend work after implementation. Do not declare a frontend task finished merely because the code compiles or tests pass; inspect the actual rendered interface.

Use Playwright when it is already available. First inspect the project's existing browser-test setup, commands, server workflow, and reusable helpers. Do not create duplicate configuration or install a browser-testing package unless it is necessary and authorized. If Playwright is unavailable, use the best available rendered-browser or screenshot tooling and clearly state what could not be validated.

## Required viewport coverage

Inspect the relevant page at these widths with a suitable representative height:

- 390px mobile
- 768px tablet
- 1440px desktop

Do not validate only the initial viewport. A fix at one width must be checked at the other two.

## Visual inspection checklist

Look for:

- horizontal overflow
- clipped content
- overlapping components
- broken grids or responsive transitions
- poor spacing or alignment
- tiny, oversized, or unreadable text
- insufficient contrast
- broken navigation
- oversized empty areas
- inconsistent card sizes
- broken tables
- unreadable charts
- controls or buttons that are too small to use comfortably
- forms that overflow
- modals, drawers, dropdowns, or menus outside the viewport

Inspect the whole relevant page, including content below the fold. Use screenshots or browser inspection where helpful, but do not retain unnecessary test artifacts in the repository.

## Interaction coverage

When the page contains them, exercise:

- navigation and mobile navigation
- sidebars and drawers
- modals and dialogs
- dropdowns
- search and filtering
- pagination and tabs
- forms and validation messages
- buttons and disabled states
- loading, success, empty, and error states that can be reached safely

Verify observable behavior rather than merely checking that an element exists. Do not alter real production data or bypass authorization to make a test pass.

## Required fix loop

Repeat this workflow until the relevant issues are resolved or a real blocker is reached:

1. Run or render the page.
2. Inspect it visually and exercise applicable interactions.
3. Identify concrete problems and the viewports affected.
4. Fix the actual cause, not the screenshot or symptom.
5. Render the page again.
6. Verify that the original issue is gone.
7. Check that the fix did not break another viewport or interaction.
8. Repeat when necessary.

Keep fixes scoped to the frontend issue. Preserve working functionality, reuse existing components and layouts, and do not make backend or database changes solely for visual purposes. Do not add fake data, unnecessary libraries, or unrelated refactors.

## Reporting standard

Report which pages, viewports, and interactions were actually checked, the problems fixed, and any remaining limitation. Never say `Fully responsive`, `Polished`, or `Looks good` unless the rendered page was inspected at the required viewports. If a server, account, route, dependency, or test state prevented inspection, name the blocker instead of implying validation succeeded.
