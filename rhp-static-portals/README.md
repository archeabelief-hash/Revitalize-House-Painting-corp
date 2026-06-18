# RHP Static Portals

Static HTML/PWA portals for Revitalize House Painting.

## Core Rule

Monday stays the source of truth. These pages are only the public-facing UI layer.

- Static pages are hosted from GitHub Pages.
- Cloudflare Worker acts as the secure connector to Monday.
- Access is controlled by the Monday board `RHP Portal Links`.
- Pages refresh live data from Monday when opened or refreshed.

## User Pages

- `customer.html` — customer/project view
- `client.html` — property manager/client view
- `sales-agent.html` — sales agent/referral partner view
- `assistant.html` — Love/Merlin assistant view
- `vendor.html` — vendor/subcontractor view

## Worker Setup

Configure the Worker with the Monday credential in Cloudflare settings, not inside public HTML.

Optional Worker variables:

```text
PORTAL_LINKS_BOARD_ID=18418328159
ALLOWED_ORIGIN=https://archeabelief-hash.github.io
```

## Public URL Pattern

After GitHub Pages is enabled and this branch is merged:

```text
https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/rhp-static-portals/customer.html?access=ACCESS-CODE
https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/rhp-static-portals/client.html?access=ACCESS-CODE
https://archeabelief-hash.github.io/Revitalize-House-Painting-corp/rhp-static-portals/sales-agent.html?access=ACCESS-CODE
```

## Update Worker URL

In `app.js`, replace the placeholder Worker URL with the deployed Cloudflare Worker URL.

## Monday Control Board

`RHP Portal Links` — Board ID `18418328159`

The Worker checks:

- Access Code
- Access Status = Ready
- User Type
- Contact Link
- Work Link
- Sales Partner Link
- Submit Link
- Data View Link

To revoke access, set Access Status to `Revoked` or `Paused`.

## PWA

The portal includes:

- `manifest.json`
- `service-worker.js`
- mobile responsive layout
- save-to-home-screen support

The shell can cache, but live Monday data is fetched fresh on open/refresh.
