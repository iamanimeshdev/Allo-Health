# Allo Health - Temporary Inventory Reservation System

A high-performance, concurrency-safe inventory reservation system built for high-traffic e-commerce scenarios where preventing overselling is critical.

## Features

- **Atomic Transactions:** Uses PostgreSQL `SELECT ... FOR UPDATE` row-level locks to completely prevent race conditions during concurrent reservations.
- **Temporary Holds:** Implements 10-minute temporary inventory holds. Stock is safely reserved during checkout but returned to the pool if payment is not completed.
- **Dynamic Restocking:** Background cron endpoints to automatically expire stale reservations and restock items.
- **Optimistic UI:** Beautiful, responsive frontend built with Next.js App Router and Tailwind CSS, featuring live countdown timers and optimistic status updates.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (with Prisma ORM)
- **Styling:** Tailwind CSS (v4)
- **API Validation:** Zod

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

1. **Clone and Install**
   ```bash
   git clone https://github.com/iamanimeshdev/Allo-Health.git
   cd Allo-Health
   npm install
   ```

2. **Database Setup**
   Update the `.env` file with your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/AlloHealth?schema=public"
   ```

3. **Migrate and Seed**
   Apply the database schema and populate with initial inventory:
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Core Workflows

- **Reserve (`POST /api/reservations`)**: Atomically verifies stock and creates a `PENDING` hold for 10 minutes. Returns HTTP 409 if two users contend for the final stock unit simultaneously.
- **Confirm (`POST /api/reservations/:id/confirm`)**: Marks the hold as `CONFIRMED` and permanently consumes the stock.
- **Release (`POST /api/reservations/:id/release`)**: Marks the hold as `RELEASED` and returns the stock to the available pool.
- **Cron (`GET /api/cron/expire`)**: Background job configured in `vercel.json` to routinely clean up `PENDING` holds that have exceeded their 10-minute TTL.
