# Revitalize House Painting Corp

Central repo for Revitalize House Painting customer-facing tools and Monday-powered project interfaces.

## Main live interface

Customer quote / booking interface:

https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/

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

- `index.html` is the main Revitalize quote interface.
- `admin-monday.html` reads live Monday data through the Cloudflare Worker.
- `portal-monday.html` reads live Monday data through the Cloudflare Worker.
- `project-monday.html` shows project progress, 811 Hickory data, quote build, materials and review flags.
- `monday-bridge.js` keeps Monday data available to the old localStorage model.
- Private Monday credentials must stay in the Cloudflare Worker and must not be placed in static HTML.

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
