# Skyline Club — Monorepo

Unified platform for the Skyline Student Association managing events, members, store, tasks, announcements, and treasury in one place.

---

## Directory Layout

```
skyline-club/
├─ backend/                 # Django 5 backend project
│  ├─ config/               # Django settings, root URLs, WSGI/ASGI configuration
│  ├─ core/                 # Shared ledger + core utilities (P1, Phase 0)
│  ├─ accounts/             # Custom user model & authentication (P1, Phase 0)
│  ├─ members/              # Membership management & discount contracts (P1)
│  ├─ events/               # Events & ticketing (P2)
│  ├─ store/                # Merch store & orders (P3)
│  ├─ tasks/                # Volunteer task board & projects (P3)
│  ├─ finance/              # Treasury reporting & reimbursements (P4)
│  ├─ announcements/        # Announcements & email broadcasts (P4)
│  ├─ requirements.txt
│  └─ manage.py
├─ frontend/                # React 18 + Vite frontend
│  └─ src/
│     ├─ app/               # App shell, router, and central route registry (Phase 0)
│     ├─ components/ui/     # Shared design system components (Phase 0)
│     ├─ lib/               # Axios API client & Auth context (Phase 0)
│     └─ features/
│        ├─ auth/           # Login / Register screens (P1)
│        ├─ members/        # Membership management UI (P1)
│        ├─ events/         # Ticketing & QR check-in UI (P2)
│        ├─ store/          # Merch catalog & ordering UI (P3)
│        ├─ tasks/          # Volunteer Kanban board UI (P3)
│        ├─ finance/        # Treasury dashboard UI (P4)
│        ├─ announcements/  # Announcements & newsletter UI (P4)
│        └─ dashboard/      # Executive overview dashboard UI (P4)
├─ docker-compose.yml       # Local PostgreSQL 16 database configuration
├─ .env.example             # Example environment variable template
├─ .env                     # Local environment variables (git-ignored)
└─ README.md                # Project documentation & local setup instructions
```

---

## Local Setup Instructions

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/) installed
- [Python 3.11+](https://www.python.org/) installed
- [Node.js 18+](https://nodejs.org/) and `npm` installed

---

### Step 1: Start Local PostgreSQL Database

From the project root directory (`skyline-club/`), start PostgreSQL in detached mode:

```bash
docker-compose up -d
```

To verify PostgreSQL is running:
```bash
docker-compose ps
```

---

### Step 2: Set Up Backend (Django 5)

1. Navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   - Windows:
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - macOS / Linux:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run database migrations:
   ```bash
   python manage.py migrate
   ```
5. Start Django development server:
   ```bash
   python manage.py runserver 8000
   ```
Backend server will be accessible at: `http://localhost:8000/`

---

### Step 3: Set Up Frontend (React 18 + Vite)

1. Open a new terminal tab and navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start Vite development server:
   ```bash
   npm run dev
   ```
Frontend app will be accessible at: `http://localhost:5173/`

---

## Environment Variables

Copy `.env.example` to `.env` if not already created:
```bash
cp .env.example .env
```
Ensure database credentials match your docker-compose setting.
