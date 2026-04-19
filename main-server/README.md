# e-Arzuhal — Main Server

Backend REST API server for the e-Arzuhal mobile application.

| Technology | Purpose |
|------------|---------|
| Node.js + Express | HTTP server & routing |
| PostgreSQL | Relational database |
| pg (node-postgres) | Database driver |
| jsonwebtoken | JWT authentication |
| bcryptjs | Password hashing |
| pdfkit | PDF generation |


## Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+ running locally (pgAdmin recommended)


## Database Setup (pgAdmin)

1. Open **pgAdmin** and connect to your PostgreSQL server
2. Right-click **Databases** → **Create** → **Database**
3. Name it **`mobile_programming`** and click **Save**
4. That's it — tables are created automatically when the server starts

### Connection Configuration

Defaults are set in `db.js`:

| Setting  | Value              | Env Variable |
|----------|--------------------|--------------|
| Host     | localhost          | `DB_HOST`    |
| Port     | 5432               | `DB_PORT`    |
| Database | mobile_programming | `DB_NAME`    |
| User     | postgres           | `DB_USER`    |
| Password | EnesPassword       | `DB_PASSWORD`|


## Installation & Run

```bash
cd main-server
npm install
npm start
```

The server starts on **port 8080** by default (`PORT` env variable to override).

You should see:

```
  e-Arzuhal Main Server
  ─────────────────────
  Port:     8080
  Database: PostgreSQL (mobile_programming)
  URL:      http://localhost:8080
  Health:   http://localhost:8080/api/health
```

For development with auto-restart on file changes:

```bash
npm run dev
```


## Database Schema

Both tables are auto-created via `CREATE TABLE IF NOT EXISTS` on server startup.

### users

```sql
CREATE TABLE users (
  id                  TEXT PRIMARY KEY,           -- UUID
  username            VARCHAR(100) UNIQUE NOT NULL,
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,              -- bcrypt
  first_name          VARCHAR(100) DEFAULT '',
  last_name           VARCHAR(100) DEFAULT '',
  tc_kimlik           VARCHAR(11) DEFAULT '',     -- Turkish national ID
  verified            BOOLEAN DEFAULT FALSE,
  verify_method       VARCHAR(50) DEFAULT '',     -- NFC / MRZ / MANUAL
  disclaimer_accepted BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);
```

### contracts

```sql
CREATE TABLE contracts (
  id                     TEXT PRIMARY KEY,         -- UUID
  owner_id               TEXT NOT NULL REFERENCES users(id),
  title                  TEXT NOT NULL,
  type                   VARCHAR(50) DEFAULT 'OTHER',
  content                TEXT DEFAULT '',
  amount                 VARCHAR(100) DEFAULT '',
  status                 VARCHAR(50) DEFAULT 'DRAFT',
  counterparty_name      VARCHAR(200) DEFAULT '',
  counterparty_role      VARCHAR(200) DEFAULT '',
  counterparty_tc_kimlik VARCHAR(11) DEFAULT '',
  counterparty_user_id   TEXT DEFAULT '',
  created_at             TIMESTAMP DEFAULT NOW(),
  updated_at             TIMESTAMP DEFAULT NOW()
);
```


## API Endpoints

### Authentication (public — no token required)

| Method | Endpoint | Request Body | Response |
|--------|----------|--------------|----------|
| POST | `/api/auth/register` | `{username, email, password, firstName, lastName}` | `{accessToken, userInfo}` |
| POST | `/api/auth/login` | `{usernameOrEmail, password}` | `{accessToken, userInfo}` |

### Contracts (JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts` | List all contracts of the authenticated user |
| POST | `/api/contracts` | Create a new contract |
| GET | `/api/contracts/stats` | Get dashboard statistics (total, draft, pending, approved, rejected) |
| GET | `/api/contracts/pending-approval` | List contracts awaiting approval |
| GET | `/api/contracts/:id` | Get a single contract by ID |
| PUT | `/api/contracts/:id` | Update a contract |
| DELETE | `/api/contracts/:id` | Delete a contract |
| POST | `/api/contracts/:id/finalize` | Change status from DRAFT to PENDING_APPROVAL |
| POST | `/api/contracts/:id/approve` | Change status to APPROVED |
| POST | `/api/contracts/:id/reject` | Change status to REJECTED |
| GET | `/api/contracts/:id/pdf` | Download generated PDF |

### Users (JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/lookup?tcKimlik=` | Lookup a registered user by TC Kimlik No |
| PUT | `/api/users/me` | Update authenticated user's profile |
| PUT | `/api/users/me/password` | Change password |

### Analysis (JWT required — mock NLP)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analysis/analyze` | Detect contract type + extract entities from text |

### Chat (JWT required — mock responses)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send a message and get a chatbot response |

### Verification (JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/verification/status` | Get current user's verification status |
| POST | `/api/verification/identity` | Submit identity verification data |

### Disclaimer (JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/disclaimer/status` | Check if user accepted the disclaimer |
| POST | `/api/disclaimer/accept` | Mark disclaimer as accepted |

### Health (public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |


## Authentication

All protected routes require the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are returned by `/api/auth/register` and `/api/auth/login`. They expire after **7 days**.

A `401` response automatically clears the token on the mobile app and redirects to the login screen.


## Folder Structure

```
main-server/
├── server.js          # Express app + startup
├── db.js              # PostgreSQL pool + schema init
├── package.json       # Dependencies
├── middleware/
│   └── auth.js        # JWT verify + token generation
└── routes/
    ├── auth.js        # /api/auth/*
    ├── contracts.js   # /api/contracts/*
    ├── users.js       # /api/users/*
    ├── verification.js# /api/verification/*
    ├── chat.js        # /api/chat
    ├── analysis.js    # /api/analysis/*
    └── disclaimer.js  # /api/disclaimer/*
```
