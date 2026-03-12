# HI — Phases

A living record of what's been built and what's next.

---

## Completed Phases

### Phase 0 — Foundation
- Static site scaffolded: `index.html`, `about.html`, `shop.html`, `cart.html`, `success.html`
- Global styles (`style.css`), nav (`nav.js`), footer (`footer.js`)
- Individual product pages under `/shop/` (cap, classic tee, long sleeve, vneck)
- Logo and images in place
- Deployed to Cloudflare Pages from `main` — live at [humintelligence.org](https://humintelligence.org)

### Phase 1 — Commerce
- Stripe Checkout integration via Netlify Functions (`/functions/api/checkout.js`)
- Webhook handler (`/functions/webhook.js`) for post-purchase events
- Cart logic (`cart.js`) — add to cart, quantity, checkout flow
- Inventory bulk management (`/functions/api/inventory-bulk.js`)
- Stripe SKUs seeded via `create_skus.sh` + `stripe_skus.csv`

---

## Active / In Progress

_(nothing currently tracked — add items here as work begins)_

---

## Upcoming Phases

### Phase 2 — Community & Content
- [ ] About page expanded with founder stories / video
- [ ] Embodiment resources section (meditations, practices, links)
- [ ] Email list / newsletter signup
- [ ] Social links + share flows

### Phase 3 — Growth
- [ ] Loyalty / referral mechanic ("spread the word")
- [ ] Limited drops / restocks with email alerts
- [ ] Partnership integrations (Celia / The Conscious Nest)

### Phase 4 — Experience
- [ ] Embodiment meditation page or embed
- [ ] "Meet up" / community map or events feature
- [ ] Mobile-first polish pass

---

## Ideas Parking Lot

_(raw ideas, not yet phased)_

- QR code on gear that links back to site / a moment of presence
- "hi" greeting wall — user-submitted eye contact stories
- Physical pop-up or activation concept
