---
name: agrifarm-feature-development
description: Implement or modify an AgriFarm Laravel and React/Inertia feature, including routes, controllers, validation, persistence, and role-aware pages. Use for customer, seller, administrator, catalog, inventory, review, and checkout work; not for a visual-only polish.
---

# AgriFarm feature development

Inspect the relevant route, controller, request, model, Inertia page, and existing feature test before editing. Keep the change narrow and preserve adjacent behavior.

- Laravel owns validation, authorization, business rules, database work, and transactions. React owns rendering and transient interaction state.
- Use Eloquent directly; do not introduce repositories. Keep ordinary CRUD in controllers. Use a service and transaction for a real multi-write workflow such as checkout or stock reservation.
- Enforce roles, ownership, account status, and data exposure on the server. Never make the client the only authorization check.
- Use Inertia pages and page props for normal application flows rather than introducing an unnecessary API.
- Preserve shareable storefront query parameters and pagination behavior.
- Reuse existing components, layout patterns, request classes, middleware, and CSS conventions before creating a new abstraction.
- Add or update focused feature tests for changed validation, authorization, persistence, and Inertia props. Run the most relevant test, then broader checks when practical.

Read `README.md` and `docs/architecture.md` for project boundaries. Read `docs/design-system.md` when the feature changes a user interface.
