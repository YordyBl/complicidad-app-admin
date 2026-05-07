# Complicidad Admin

Next.js 14 frontend for Complicidad — internal inventory, sales, customers, and financial reporting app.

## Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: Session-based with JWT
- **State**: React Server Components + client hooks

## Quick Start

```bash
# Install
npm install

# Environment
cp .env.example .env.local

# Dev
npm run dev
```

Server starts at `http://localhost:3000`.

## Docker

```bash
docker compose up -d
```

Builds and starts both frontend and backend services.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3000` | Backend API URL |
| `SESSION_SECRET` | **Yes** | — | Secret for session encryption |

## Project Structure

```
app/
├── (app)/          # Protected routes (require auth)
├── (public)/      # Public routes (login, register)
└── api/           # Next.js API routes (proxy to backend)
components/        # shadcn/ui components
features/          # Feature modules (auth, sales, inventory, etc.)
shared/
├── api/           # Backend API client
├── auth/          # Session utilities
└── config/        # Environment config
```

## License

Private — internal use.