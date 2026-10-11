# AABHA CLOTHING — Next.js Full-Stack COD Store

A luxury Indian women's ethnic-wear e-commerce storefront with a **pure Cash on Delivery (COD)** checkout flow, unified backend API, and a Store Owner Admin Dashboard — all inside a single **Next.js (App Router)** codebase.

---

## Tech Stack
* **Framework:** Next.js 15 (App Router)
* **Styling:** Tailwind CSS v4
* **Backend:** Next.js Route Handlers (`/api/orders`)
* **Icons & Animation:** Lucide React + Motion
* **Order Persistence:** Unified backend order storage in `data/orders.json`

---

## Getting Started

### 1. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Routes Available
* **Storefront:** [http://localhost:3000](http://localhost:3000) — Full catalog, 17 artisanal garments, editorial hero slider, cart, wishlist, and pure COD checkout.
* **Store Owner Admin Panel:** [http://localhost:3000/admin/orders](http://localhost:3000/admin/orders) — View all received COD orders, customer details, one-click WhatsApp confirmation, call customer, and update order dispatch status.
* **Backend Orders API:**
  * `GET /api/orders` — Retrieve all orders
  * `POST /api/orders` — Record new COD order
  * `PATCH /api/orders` — Update order status (Pending / Confirmed / Dispatched / Delivered)

---

## Building for Production
```bash
npm run build
npm run start
```
