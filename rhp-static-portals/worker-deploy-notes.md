# Cloudflare Worker Deployment Notes

The portal HTML calls a Cloudflare Worker so Monday stays the database and no private Monday credential is placed in public browser code.

## Worker Routes

- `GET /health`
- `GET /portal?access=ACCESS-CODE&type=customer`
- `POST /portal/request-update`

## Required Cloudflare Setting

Add the Monday credential as a Cloudflare Worker secret.

## Optional Worker Variables

```text
PORTAL_LINKS_BOARD_ID=18418328159
ALLOWED_ORIGIN=https://archeabelief-hash.github.io
```

## Control Board

`RHP Portal Links` controls access.

The Worker should only return data when:

- Access Code matches
- Access Status is Ready
- Linked Monday records are attached to that portal access row

Full Worker source is kept in the deploy package, not pasted into this public browser folder.
