# JournalForge

A journal manuscript formatting platform that accepts a Springer Hydrogeology Journal formatting guide and a manuscript submission document, processes them through a three-stage AI pipeline using Claude Sonnet via OpenRouter, and returns a fully HJ-compliant formatted DOCX ready for submission.

## Monorepo Structure

```
journalforge/
├── .do/app.yaml                    # DigitalOcean App Platform spec
├── apps/api/                       # Node.js/Express/TypeScript API
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/schema.prisma
│   └── src/
│       ├── index.ts
│       ├── config.ts
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── prompts/
│       ├── types/
│       └── scripts/build_docx.py
└── apps/frontend/                  # Next.js 14 frontend
    └── src/
        ├── app/
        ├── components/
        ├── hooks/
        └── lib/
```

## Tech Stack

- **API**: Node.js 20, Express 4, TypeScript 5, Prisma 5 + PostgreSQL, BullMQ + Redis, Multer, mammoth, pdf-parse
- **AI**: OpenRouter → `anthropic/claude-sonnet-4.6`, three-stage pipeline
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, SWR
- **Infra**: DigitalOcean App Platform (API), Vercel (Frontend)

## Getting Started

### Prerequisites

- Node.js 20
- PostgreSQL
- Redis
- Python 3 with `python-docx`

### Setup

```bash
# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Install API dependencies
cd apps/api && npm install

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# Install frontend dependencies
cd ../frontend && npm install

# Start development servers
# API:
cd apps/api && npm run dev
# Frontend:
cd apps/frontend && npm run dev
```

## Deployment

- **API**: DigitalOcean App Platform via `.do/app.yaml` and `apps/api/Dockerfile`
- **Frontend**: Vercel — set `NEXT_PUBLIC_API_URL` to your DO App Platform URL

## Environment Variables

See `.env.example` for all required variables.
