# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RP Marketing - Social media management system where clients view Instagram performance metrics and paid traffic campaigns. Two user roles: **Admin** (RP Marketing team) and **Cliente** (end users viewing their metrics).

## Architecture

Monorepo with two main directories:

- **backend/** — Python FastAPI REST API (port 8000)
- **frontend/** — Next.js App Router with Tailwind CSS (port 3000)

Frontend communicates with backend via REST at `http://localhost:8000/api/v1/...` using JWT Bearer tokens. Backend returns standardized JSON: `{ success, data, message }`.

The architecture document at `docs/arquitetura-sistema.md` is the source of truth — consult it before implementing any feature.

## Development Commands

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Stack Constraints

- **Frontend**: Next.js (App Router) + Tailwind CSS — do not switch frameworks
- **Backend**: Python + FastAPI + SQLAlchemy + Alembic + Pydantic
- **Database**: PostgreSQL
- **Auth**: JWT (python-jose) with tokens stored client-side

## Environment Variables

- `backend/.env`: DATABASE_URL, SECRET_KEY, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET
- `frontend/.env.local`: NEXT_PUBLIC_API_URL
