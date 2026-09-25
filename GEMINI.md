# AgriFarm: instructions for Gemini

## Project overview

AgriFarm is a Laravel 12 monolith with a React 19/Inertia frontend for a Pasig barangay marketplace. Its stack is PHP 8.2+, PostgreSQL, Laravel/Eloquent, React, Inertia, Tailwind CSS 4, Vite, PHPUnit, and Playwright.

Before editing a feature, read the relevant existing page/component, route, controller, request/model, and test. Also consult `README.md`, `docs/architecture.md`, and `docs/design-system.md` when they apply.

## Architecture and implementation rules

- Laravel owns validation, authorization, business rules, transactions, and persistence. React owns rendering and temporary UI state.
- Use Eloquent directly. Do not add repository layers. Keep ordinary CRUD in controllers; use a service and a database transaction only for genuinely multi-step or multi-write workflows.
- Follow the existing role boundaries: public/customer, seller, and CENRO admin. Enforce ownership, roles, account status, and sensitive-field protection on the server; never rely on the UI alone.
- Add or update Inertia props deliberately. Public routes must expose only mapped, safe fields and safe image responses.
- Preserve existing URL/query-string behavior, especially storefront filters and pagination.
- Match the existing React component patterns, CSS organization, Tailwind usage, accessibility labels, responsive behavior, and light/dark theme support. Prefer extending existing reusable components rather than duplicating them.

## Translation and Filipino UI work

- Edit the target React pages/components directly. Do not create temporary `fix.py`, `fix2.py`, `translate.js`, or other bulk-rewrite scripts in the repository root.
- Keep translations inside the component's established language mechanism (for example a `filipino` prop/state), with an English fallback.
- Translate visible UI copy, headings, labels, placeholders, button text, helper text, empty states, tooltips, and accessible labels consistently. Do not translate route names, database fields, APIs, CSS class names, code identifiers, or user-entered data.
- After editing JSX, inspect the final markup carefully: props must close with `}`, tags with `>`, and self-closing components with `/>`.

## Quality bar

- Make the smallest coherent change; avoid unrelated formatting and refactors.
- Add or update feature tests for changed validation, authorization, persistence, and Inertia props. Update Playwright coverage when a user-visible flow changes.
- Run the focused test first, then relevant checks where practical:

  ```powershell
  php artisan test
  vendor\bin\pint --test
  npm run build
  npm run test:e2e
  ```

- Never commit `.env`, credentials, research data, generated test artifacts, or temporary transformation/debug scripts.
- At the end, state which files changed, what was verified, and any checks not run.
