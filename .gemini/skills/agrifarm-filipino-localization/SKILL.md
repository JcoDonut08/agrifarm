---
name: agrifarm-filipino-localization
description: Add or correct Filipino and English UI copy in AgriFarm React/Inertia pages and components. Use when translating customer, seller, or CENRO administrator interfaces; not for translating database content, APIs, routes, or user-entered data.
---

# AgriFarm Filipino localization

Inspect the target component and its existing locale mechanism first. Make the translation change directly in the component or its established shared translation source.

- Preserve English as the fallback and use the existing locale prop/state convention, such as `filipino`, when it exists.
- Translate every visible part of the affected control or state consistently: headings, labels, placeholders, buttons, helper text, empty states, tooltips, dialog copy, pagination, and accessible labels.
- Keep language natural for Philippine users and consistent with nearby Admin, Seller, or Customer copy.
- Do not translate code identifiers, class names, route names, API payloads, database fields, user-generated text, or brand/product names unless the product explicitly has a localized name.
- Do not create root-level rewrite or cleanup scripts such as `fix.py`, `fix2.py`, or `translate.js`. If a repeated change truly needs automation, ask before adding a maintained tool in an appropriate scripts directory.
- Review edited JSX before finishing. Verify braces, opening/closing tags, and self-closing components; then run `npm run build` when practical.

Keep the behavior, layout, light/dark support, and accessibility of the original interface intact.
