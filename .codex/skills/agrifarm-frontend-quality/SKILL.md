---
name: agrifarm-frontend-quality
description: Review and polish an existing working AgriFarm frontend when it needs stronger UI/UX, typography, hierarchy, spacing, consistency, responsiveness, or removal of generic AI-generated design patterns.
---

# AgriFarm Frontend Quality

Act as AgriFarm's dedicated UI/UX review and polish pass. Use this after an interface exists and substantially works. Its primary job is not to invent the feature, change business rules, or redesign unrelated pages.

## Establish context

Inspect the implemented page, its layout, shared components, neighboring pages, routes, and Tailwind conventions. Understand the page's primary user, primary task, and most important information before judging its visual treatment.

Reuse and improve the existing design system. Do not create duplicate components, services, or layouts. Preserve working functionality and keep changes scoped to supported visual or usability improvements.

## Review the interface

Evaluate:

- typography hierarchy and readability
- spacing rhythm and alignment
- component and control consistency
- content density and scanability
- visual and information hierarchy
- colors, contrast, borders, and shadows
- primary, secondary, and destructive button hierarchy
- form labels, inputs, help text, validation, and error consistency
- responsive behavior and mobile usability
- table, chart, and navigation behavior at narrow widths

Identify the few issues with the greatest effect first. Prefer coherent improvements over many decorative changes. Do not make every section visually equal: primary information and actions should stand out, while secondary content should be quieter.

## Anti-AI-slop checklist

Actively search for and remove or justify:

- too many cards
- nested cards
- excessive border radius
- oversized shadows
- random gradients
- glass panels
- meaningless badges
- fake statistics
- random `+12%` values or similar invented trends
- fake activity feeds
- fake avatars
- unnecessary hero sections
- giant welcome banners
- decorative or meaningless charts
- excessive tiny gray text
- excessive microcopy
- visual elements added only because space is empty
- inconsistent icon styles
- excessive pills
- random accent colors

Also check for filler notifications, fake users, decorative sparkles, AI-themed icons, and generic SaaS patterns that do not support AgriFarm's real workflows.

## Preferred result

Favor:

- fewer but stronger visual sections
- intentional whitespace
- obvious information hierarchy
- consistent typography
- consistent controls and states
- consistent spacing
- meaningful grouping
- restrained forest-green, cream, white, and neutral colors
- restrained borders and shadows

The result should feel agricultural, trustworthy, warm, professional, community-oriented, and suitable for customers, urban farmers, and Pasig City CENRO. Preserve meaningful differences between customer, seller, and administrator interfaces.

## Project constraints

Follow the current Laravel, React, Inertia, Tailwind, PostgreSQL, and Eloquent architecture. Keep React focused on presentation and UI behavior. Do not make backend or database changes solely for visual polish.

Do not add fake production data, remove functionality, install unnecessary packages, introduce another framework or state library, expose secrets, or change unrelated code. Prefer a simple implementation that the thesis team can maintain and explain.

## Completion boundary

Run relevant formatting, tests, and build checks after changes. A code review or successful build is not rendered-interface validation. Use `$agrifarm-playwright-qa` for the actual responsive and interaction check before describing the page as fully responsive or polished. If rendered validation was not possible, state that limitation precisely.
