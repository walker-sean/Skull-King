---
status: accepted
---

# Railway over Fly.io for hosting

We're deploying to Railway rather than Fly.io. Both support a persistent volume for the SQLite file (ADR-0003) and a long-lived Node process for the websocket connection, so either would work technically.

Fly.io's differentiators — per-region deployment, fine-grained scaling — solve problems this project doesn't have: a handful of friends on a call have trivially low latency requirements, and SQLite's single-writer design means the app can't be horizontally scaled even if we wanted to. Railway's simpler, mostly-click-through setup gets the same outcome with less operational surface to learn. If this project ever needs multi-region latency or horizontal scaling, that's a sign the scale has changed enough to revisit this.
