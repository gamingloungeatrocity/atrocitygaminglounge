# Atrocity Gaming Lounge — Web Application

Full-stack booking and management portal for **Atrocity Gaming Lounge** (PS4 & PS4 Pro rentals, group bookings, walk-in gaming, tournaments, and administrative dashboard).

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Backend**: Node.js, Express 5, Supabase JS Client (`@supabase/supabase-js`), Helmet, CORS, Rate Limiting, Zod.
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) and Supabase Auth.
- **Payment Gateway**: Cashfree Payment Gateway (PG v2023-08-01 API).

---

## Configuration & Environment Variables

### 1. Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and supply your credentials:

```bash
cp backend/.env.example backend/.env
```

| Variable | Description |
| :--- | :--- |
| `PORT` | Backend port (default: `5000`) |
| `FRONTEND_URL` | Frontend origin for CORS (e.g., `http://localhost:5173`) |
| `SUPABASE_URL` | Your Supabase Project URL (`https://xyzcompany.supabase.co`) |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable Key (replaces legacy `anon` key) |
| `SUPABASE_SECRET_KEY` | Supabase Secret Key (replaces legacy `service_role` key; keep secret!) |
| `CASHFREE_APP_ID` | Cashfree Merchant App ID / Client ID |
| `CASHFREE_SECRET_KEY` | Cashfree Client Secret Key |
| `CASHFREE_ENV` | Environment: `sandbox` (for testing) or `production` (for live) |
| `CASHFREE_API_VERSION` | API version (default: `2023-08-01`) |

### 2. Frontend (`.env`)

Optional if running frontend separately:

```env
VITE_API_URL=http://localhost:5000
```

---

## Database Migrations (Supabase)

Run the SQL scripts in your **Supabase SQL Editor** in the following order:

1. `supabase/migrations/001_schema.sql`: Base tables, atomic reservation RPC functions, and Cashfree support.
2. `supabase/migrations/002_seed.sql`: Initial pricing tiers, consoles, and lounge settings.
3. *(If upgrading an existing database)* `supabase/migrations/003_cashfree.sql`: Adds Cashfree columns and updates payment method constraints.
4. `supabase/migrations/004_content_library.sql`: Adds admin-managed games, tournament cover fields, and the `lounge-covers` Storage bucket integration used by the backend.
5. `supabase/migrations/005_remove_demo_tournaments.sql`: Removes the original demo tournament rows; admin-created tournaments are preserved.

---

## Running the Application

### 1. Install Dependencies

```bash
# Install frontend packages
npm install

# Install backend packages
npm --prefix backend install
```

### 2. Seed Initial Admin Account

```bash
cd backend
ADMIN_EMAIL=admin@atrocitygaming.example ADMIN_PASSWORD=ChangeThisPassword123! npm run seed:admin
```

### 3. Start Development Servers

In terminal 1 (Backend API):
```bash
npm --prefix backend run dev
```

In terminal 2 (Frontend Vite Server):
```bash
npm run dev
```

### 4. Run Backend Tests

```bash
npm --prefix backend test
```

### Keep-alive configuration

The frontend sends a lightweight backend health heartbeat every five minutes while the site is open. For a daily Supabase keep-alive when no browser is open, configure these GitHub repository secrets:

- `BACKEND_URL`: deployed backend URL, without a trailing slash.
- `KEEPALIVE_TOKEN`: the same long random value configured as `KEEPALIVE_TOKEN` in the Render backend environment.

The scheduled workflow calls the protected keep-alive endpoint once per day; that endpoint performs three lightweight database reads. This activity does not guarantee that a free Render instance will never sleep. The frontend heartbeat only runs while a browser has the site open.

### 5. Build for Production

```bash
npm run build
```
When built, the backend can serve the production SPA directly from the `dist/` directory.

---

## Cashfree Online Payments Flow

1. Customer books a slot (Console, Whole Lounge, or Tournament).
2. Customer clicks **Pay Online**.
3. Frontend requests `POST /api/payments/cashfree/order`.
4. Backend communicates with Cashfree (`POST /pg/orders`) using `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY`, returning a `payment_session_id`.
5. Frontend opens Cashfree Checkout Modal (`Cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" })`).
6. Upon completion, frontend calls `POST /api/payments/cashfree/verify`.
7. Backend verifies the payment status directly with Cashfree (`GET /pg/orders/{order_id}` and `GET /pg/orders/{order_id}/payments`) before updating booking status to `paid`.
8. Webhooks are also supported at `POST /api/payments/cashfree/webhook` with HMAC-SHA256 Base64 signature verification.
