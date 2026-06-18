# Revitalize House Painting Corp

Central repo for Revitalize House Painting customer-facing tools and Monday-powered project interfaces.

## Main live interface

Primary private interface link:

https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/

Direct app link:

https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/app.html

## WhatsApp intake

Primary work cell / WhatsApp intake number:

573-908-9506

Direct WhatsApp link:

https://wa.me/15739089506

The home interface no longer uses a scheduling form. Customers should contact Revitalize through the WhatsApp link or call the work cell. Monday remains the internal source of truth for intake tracking, project data, materials, and account follow-up.

## Live admin and portal links

Monday-powered admin dashboard:

https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/admin-monday.html

Client / agent portal:

https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/portal-monday.html

Project progress interface:

https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/project-monday.html

Printable turnkey packets:

https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/turnkey-packets/

## Current build notes

- `index.html` routes the main public link into `app.html`.
- `app.html` is the private live data interface and WhatsApp intake landing page.
- `admin-monday.html` reads live Monday data through the Cloudflare Worker.
- `portal-monday.html` reads live Monday data through the Cloudflare Worker.
- `project-monday.html` shows project progress, 811 Hickory data, quote build, materials and review flags.
- `monday-bridge.js` keeps Monday data available to the old localStorage model.
- Private Monday credentials must stay in the Cloudflare Worker and must not be placed in static HTML.

## Lightweight app credentials

The current login is in-app role filtering only. It is for controlled viewing and account tracking, not hard security.

Default test credentials:

- admin / admin2026
- client / customer2026
- agent / agent2026
- manager / manager2026

## Active pricing loaded into the interface

- Walls Only: $1.36/sqft
- Walls + Trim: $2.25/sqft
- Walls + Trim + Ceilings: $4.15/sqft
- Exterior Painting: $3.75/sqft
- Standard booking: $500 secure + 25% due 72 hours before start
- Cabinet jobs: 50% deposit

## 811 Hickory project anchors

- Menards UCREATE kitchen package: $2,225.99
- Marked-up material charge at 25%: $2,782.49
- Cabinet install labor: $1,550
- Known kitchen subtotal: $4,332.49

This repo is the main place for Revitalize House Painting programs going forward.
