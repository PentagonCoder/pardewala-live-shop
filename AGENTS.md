<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
<!-- LOVABLE:END -->

# Project Architecture Rules

- Keep commerce calculations in a shared, browser-safe pricing module so estimated values stay consistent across catalogue, cart, checkout, and admin views.
- Keep external payment and video providers behind authenticated server-side functions configured only through environment variables, so credentials never reach browser code.
- Use Lovable Cloud tables and realtime subscriptions as the durable source of truth for carts, orders, payment requests, and video-shopping sessions.
- Treat the authenticated cart as a durable Lovable Cloud resource, using user-scoped cart and cart-item rows; this lets storefront and checkout share the same source of truth.
- Send checkout verification codes through server-side functions and keep unverified codes server-only, so email credentials and verification state never reach the browser.
