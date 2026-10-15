# PGE Status

https://pgestatus.com/

A simple node app to search PGE's backend database for current outages.

## Status API

`GET /api/v1/status?location=Apple%20Park` checks the first California street address returned by Apple Maps. The OpenAPI description is at `/openapi.json`.

## Cloudflare

Add a Cache Rule for `GET /api/v1/status` on `pgestatus.com`: mark it eligible for cache and use the origin cache header for the edge TTL. Successful responses set `Cloudflare-CDN-Cache-Control: public, max-age=900`; errors and `/check` stay uncached. Do not set a fixed Edge TTL in the rule.

Allow `/api/v1/status` and `/openapi.json` through the browser challenge so API clients can reach them. The status route is limited to 30 requests per minute per IP at the origin.
