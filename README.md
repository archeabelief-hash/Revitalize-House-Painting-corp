# Revitalize House Painting Corp

Central repo for Revitalize House Painting customer-facing tools and Monday-powered project interfaces.

## Main live interface

Primary private interface link:

https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/

Direct app link:

https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/app.html

## SMS intake number

Public text intake number:

573-908-9748

This number is the only number that should route public text requests into the Monday intake agent.

Desired SMS flow:

Customer texts 573-908-9748.
Twilio receives the SMS.
Twilio posts the SMS to the Cloudflare Worker endpoint.
The Worker creates a Monday Intake item.
The Monday intake agent works the lead inside Monday.
No customer login is required.
No public comments or outside posting are required.

Worker template included:

`sms-intake-worker.js`

Required Worker environment variables:

- `MONDAY_API_TOKEN`
- `MONDAY_INTAKE_BOARD_ID`
- `TWILIO_AUTH_TOKEN` if signature verification is added

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
- `app.html` is the private live data interface.
- `admin-monday.html` reads live Monday data through the Cloudflare Worker.
- `portal-monday.html` reads live Monday data through the Cloudflare Worker.
- `project-monday.html` shows project progress, 811 Hickory data, quote build, materials and review flags.
- `monday-bridge.js` keeps Monday data available to the old localStorage model.
- `sms-intake-worker.js` is the Twilio-to-Monday SMS intake Worker template for 573-908-9748.
- Private Monday credentials must stay in the Cloudflare Worker and must not be placed in static HTML.

## Lightweight app credentials

The current login is in-app role filtering only. It is for controlled viewing and account tracking, not hard security.

Default test credentials:

- admin / admin2026
- client / customer2026
- agent / agent2026
- manager / manager2026
- realtor / realtor2026
- landlord / landlord2026

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
