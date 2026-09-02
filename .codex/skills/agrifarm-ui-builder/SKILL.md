---
name: agrifarm-ui-builder
description: Create, redesign, or substantially modify AgriFarm frontend pages, dashboards, forms, marketplace screens, or React components while preserving its Laravel, Inertia, and Tailwind architecture.
---

# AgriFarm UI Builder

Build AgriFarm interfaces that feel purposeful, trustworthy, and specific to the people using them. Use this as the primary implementation skill for frontend work, not for a review-only request or backend-only change.

## Understand the existing interface first

Before editing, inspect the relevant implementation and nearby patterns:

- React components and Inertia pages
- layouts and navigation
- Laravel routes and the props passed to pages
- Tailwind and CSS conventions
- typography, colors, spacing, buttons, forms, cards, and tables
- responsive behavior in related screens

Search for an existing component, layout, validation pattern, or route before creating one. Extend or compose existing work when it already serves the need. Do not create duplicate components, services, layouts, or database connections.

Preserve working behavior and limit changes to the requested feature. Do not restructure unrelated folders or silently remove functionality.

## Preserve the application boundary

Follow the existing Laravel + React + Inertia architecture:

- React displays data, collects input, and manages presentation-level UI state.
- Laravel validates, authorizes, performs business rules, and accesses PostgreSQL through Eloquent.
- Use Inertia for normal application pages; do not add an unnecessary REST API.
- Keep controllers small and use the project's existing Requests, Policies, Middleware, and Services when applicable.
- Do not make backend or database changes solely to achieve a visual effect.

Do not introduce Next.js, Vue, Bootstrap, Material UI, Ant Design, shadcn, Redux, Zustand, another frontend framework, another database, or another ORM unless the user explicitly requests it. Do not install a package unless the requirement cannot be handled cleanly with the current stack and the package is actually necessary.

Keep the implementation simple enough for undergraduate developers to understand, debug, maintain, and explain during a thesis defense.

## Visual direction

AgriFarm should feel agricultural, trustworthy, clean, modern, warm, community-oriented, professional, and appropriate for a local government client. It must remain understandable to ordinary customers and urban farmers.

Use:

- deep forest green as the primary color
- warm off-white or cream page backgrounds
- white surfaces
- subtle agricultural greens for secondary accents
- neutral dark text
- clear typography hierarchy
- deliberate whitespace and consistent spacing
- strong alignment
- restrained borders and shadows

Every visible element must have a functional or informational purpose.

Avoid defaulting to generic SaaS dashboard styling, giant gradient heroes, glowing blobs, glassmorphism, gradient text, excessive rounded rectangles, cards inside cards, giant shadows, meaningless pills, fake trends, fake activity, fake users or avatars, fake notifications, decorative charts, giant welcome sections, excessive microcopy, decorative sparkles, AI-themed icons, and filler elements.

## Design for the role

Do not give every role the same dashboard structure.

### Customer

Create a clean agricultural marketplace. Prioritize products, search, filters, imagery, product name, seller or urban farm, price, unit, availability, cart, ordering, and order status.

### Seller or urban farmer

Prioritize work that needs action: orders requiring attention, product management, inventory, low stock, sales, forecasting, analytics, crop and market recommendations, and store profile.

### Pasig City CENRO administrator

Create a professional, information-focused interface. Prioritize barangay and seller monitoring, transactions, product performance, sales, forecasts, recommendations, and reports.

## Build mobile-first

Design from the smallest viewport upward and explicitly account for:

- 390px mobile
- 768px tablet
- 1440px desktop

Use fluid sizing and Tailwind breakpoints. Avoid fixed widths that create horizontal scrolling. Make controls touch-friendly and keep important actions easy to reach.

- Convert desktop sidebars into a proper mobile drawer or compact navigation pattern.
- Give tables an intentional small-screen treatment such as responsive columns, stacked rows, or contained horizontal scrolling.
- Keep forms within the viewport and use suitable input sizes.
- Reflow grids deliberately rather than relying on accidental wrapping.
- Preserve hierarchy at every viewport instead of merely shrinking desktop UI.

## Finish responsibly

Run the relevant formatter, tests, and build checks. Do not claim the interface is responsive or polished based only on compilation. Validate the rendered result with `$agrifarm-playwright-qa` when frontend validation is part of the task or before making a final visual-quality claim.

Do not expose secrets, add fake production data, delete working functionality, change the architecture without permission, or modify unrelated behavior.
