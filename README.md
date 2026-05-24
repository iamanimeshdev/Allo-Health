# Allo Health — Inventory Reservation System

A concurrency-safe temporary inventory reservation system built for multi-warehouse e-commerce, designed to prevent overselling during checkout.

## 🚀 Live Demo & Deliverables

- **Repository**: [https://github.com/iamanimeshdev/Allo-Health](https://github.com/iamanimeshdev/Allo-Health)
- **Live URL**: *(Add your Vercel deployment URL after deploying — see [Deploy to Vercel + Neon](#-deploy-to-vercel--neon) below)*

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (end-to-end) |
| Database | PostgreSQL (hosted — Neon / Supabase) |
| ORM | Prisma 7 |
| Validation | Zod |
| Styling | Tailwind CSS v4 |
| Real-time | Pusher (WebSockets) |
| Caching | Upstash Redis (Idempotency) |

## 📦 How to run locally

### Prerequisites
- Node.js 18+
- A hosted PostgreSQL database (Neon, Supabase, or Railway free tier)

### Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/iamanimeshdev/Allo-Health.git
   cd Allo-Health
   npm install
   ```

2. **Environment variables**
   Create a `.env` file:
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/AlloHealth?schema=public"

   # Optional — for idempotency (bonus)
   UPSTASH_REDIS_REST_URL="https://..."
   UPSTASH_REDIS_REST_TOKEN="..."

   # Optional — for real-time WebSocket updates (bonus)
   PUSHER_APP_ID="..."
   NEXT_PUBLIC_PUSHER_KEY="..."
   PUSHER_SECRET="..."
   NEXT_PUBLIC_PUSHER_CLUSTER="ap2"
   ```

3. **Migrate and seed**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## 🚀 Deploy to Vercel + Neon

### 1. Neon (PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and create a project.
2. Copy the **connection string** (use the pooled connection string if offered; either works with Prisma).
3. Keep `?sslmode=require` on the URL.

### 2. Push your code to GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 3. Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Under **Environment Variables**, add everything from `.env.example`:

   | Variable | Required | Notes |
   |----------|----------|--------|
   | `DATABASE_URL` | **Yes** | Neon connection string |
   | `RESERVATION_TTL_MINUTES` | No | Default `10` |
   | `UPSTASH_REDIS_REST_URL` | No | Idempotency (recommended) |
   | `UPSTASH_REDIS_REST_TOKEN` | No | Idempotency (recommended) |
   | `PUSHER_APP_ID` | No | Real-time updates |
   | `NEXT_PUBLIC_PUSHER_KEY` | No | Real-time updates |
   | `PUSHER_SECRET` | No | Real-time updates |
   | `NEXT_PUBLIC_PUSHER_CLUSTER` | No | e.g. `ap2` |

4. **Build command** (Settings → General → Build & Development Settings):

   The repo `build` script already runs `prisma generate`, migrations, then `next build` — no extra Vercel build command needed.

5. Deploy. Vercel will assign a URL like `https://your-app.vercel.app`.

### 4. Seed production data (once)

After the first successful deploy, run the seed against Neon from your machine:

```bash
DATABASE_URL="your-neon-connection-string" npx prisma db seed
```

Or use Neon's SQL editor / a one-off Vercel shell if you prefer.

### 5. Cron (reservation expiry)

`vercel.json` runs `/api/cron/expire` **once per day** (`0 0 * * *`) so it works on **Vercel Hobby** (Hobby only allows daily crons, not every 5 minutes).

| Option | What to do |
|--------|------------|
| **Stay on Hobby (recommended)** | Keep the daily cron in `vercel.json` and deploy. Stock is still protected: confirming an expired hold returns **HTTP 410** and releases stock immediately (lazy expiry). |
| **Need cleanup every ~5 min** | Upgrade to [Vercel Pro](https://vercel.com/docs/plans/pro), then change the schedule in `vercel.json` back to `*/5 * * * *`. |
| **Free external cron** | Remove the `crons` block from `vercel.json`, deploy, then use [cron-job.org](https://cron-job.org) (or similar) to `GET https://your-app.vercel.app/api/cron/expire` every 5 minutes. |

You do **not** need Pro for the app to work correctly — Pro only makes background cleanup more frequent.

### 6. Verify after deploy

- Open `/` — products load from Neon.
- Reserve an item → `/checkout/:id` with countdown.
- To demo **409**: open two browser tabs, reserve the last unit of the glucose meter (seeded with very low stock) at the same time — one tab should show **Not enough stock (409 Conflict)**.
- To demo **410**: wait for the checkout timer to hit zero, then click **Confirm purchase** — you should see **Reservation expired (410 Gone)**.

## 🔒 Correctness under Concurrency

> If two requests come in simultaneously for the last unit of a SKU, exactly one should succeed and the other should get a 409.

The system guarantees this using **PostgreSQL row-level locking** (`SELECT ... FOR UPDATE`):

```
lib/reservation-service.ts → createReservation()
```

1. A Prisma `$transaction` begins.
2. `SELECT id, "totalQuantity", "reservedQuantity" FROM "Inventory" WHERE id = $1 FOR UPDATE` acquires an **exclusive row lock** on the inventory record.
3. Available stock is computed: `totalQuantity - reservedQuantity`.
4. If insufficient → the transaction rolls back and returns **HTTP 409**.
5. Otherwise → `reservedQuantity` is incremented, a `PENDING` reservation is created with a 10-minute TTL, and the transaction commits.

Because the `FOR UPDATE` lock serializes concurrent access at the database level, the second request physically waits for the first to commit before re-reading the row. Overselling is impossible.

**Verified**: We fired 10 simultaneous requests at the last available unit — exactly 1 returned `201 Created`, and the other 9 returned `409 Conflict`.

## ⏱️ How reservation expiry works

The system uses a **dual-layer** approach:

### 1. Active Cleanup (Vercel Cron)
A cron job configured in `vercel.json` hits `GET /api/cron/expire` (daily on Hobby; every 5 minutes on Pro if you change the schedule). It sweeps for all `PENDING` reservations where `expiresAt < now()`, decrements `reservedQuantity`, and marks them `EXPIRED`.

### 2. Lazy Cleanup (On Confirm)
When a user calls `POST /api/reservations/:id/confirm`, the handler checks if `expiresAt < now()`. If expired, it immediately releases the stock and returns **HTTP 410 Gone** — ensuring no stale reservation can consume inventory.

## 🎁 Bonus: Idempotency

Implemented using **Upstash Redis**. When the client sends an `Idempotency-Key` header:

1. The server checks Redis for `idempotency:reservation:{key}`.
2. If a cached response exists → returns it immediately (no side effect).
3. If not → executes the transaction, caches the result with a 24-hour TTL.

This prevents duplicate reservations from network retries or double-clicks. Applied to both `POST /api/reservations` and `POST /api/reservations/:id/confirm`.

The frontend generates a `crypto.randomUUID()` for each reserve/confirm action, so every intentional user action gets a unique key while retries reuse the same key.

> **Graceful degradation**: If Redis credentials are not configured, idempotency is silently disabled and the API functions normally.

## 🔄 Bonus: Real-Time Updates (WebSockets)

Stock changes are broadcast instantly to all connected clients via **Pusher**:

- Whenever stock mutates (reserve, confirm, release, expire), `reservation-service.ts` fires a `stock-update` event on the `inventory` channel.
- The `ProductGrid` and Reservations dashboard subscribe to this channel and re-fetch data on each event.
- No polling required — changes appear across all browser tabs instantly.

> **Graceful degradation**: If Pusher credentials are not configured, the reservations page falls back to 5-second polling.

## 📐 API Reference

| Method | Path | Behaviour |
|--------|------|-----------|
| `GET` | `/api/products` | List products with available stock per warehouse |
| `GET` | `/api/warehouses` | List all warehouses |
| `POST` | `/api/reservations` | Reserve units. Returns `409` if insufficient stock |
| `POST` | `/api/reservations/:id/confirm` | Confirm reservation (payment succeeded). Returns `410` if expired |
| `POST` | `/api/reservations/:id/release` | Release reservation early (payment failed or user cancelled) |
| `GET` | `/api/cron/expire` | Background cleanup of stale reservations |

## 🖥️ Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Product listing with stock-per-warehouse breakdown and "Reserve" buttons |
| `/checkout/:id` | Dedicated checkout page with live countdown timer, "Pay Now" and "Cancel" buttons |
| `/reservations` | Admin dashboard to view/filter all reservations and manually confirm/release |

## ⚖️ Trade-offs & What I'd do with more time

1. **Multi-item cart**: The current system reserves one item at a time. A production system would batch multiple items into a single checkout session.
2. **Rate limiting**: No rate limiting is implemented on the API. In production, I'd add middleware with sliding window counters.
3. **Observability**: I'd add structured logging (e.g., Pino) and traces (e.g., OpenTelemetry) to monitor lock contention and transaction latencies under load.
4. **Testing**: I'd add integration tests using Vitest + a test database to verify the concurrency guarantees programmatically as part of CI.
