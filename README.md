# e-Arzuhal – Smart Contract Management Platform

**CSE308 - Mobile Programming Course Project**  
Akdeniz University – 2024/2025 Spring Semester


## Team Members

- **20230808619 – Enes Burak Atay**
- **20210808051 – Burak Dere**


## Project Overview

e-Arzuhal is a full-stack mobile application for creating, managing, and approving legal contracts. It features NLP-based contract analysis, identity verification via NFC (Turkish ID cards), a legal chatbot, and PDF generation.

| Layer | Technology |
|-------|------------|
| **Mobile App** | React Native 0.81.5 / Expo SDK 54 |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL (managed via pgAdmin) |
| **Auth** | JWT (JSON Web Tokens) + bcrypt |


## Repository Structure

```
mobile-programming-e-arzuhal/
├── App.js                       # Mobile app entry point
├── package.json                 # Mobile app dependencies
├── app.json                     # Expo configuration
├── src/                         # ── Mobile Application ──
│   ├── components/              # Reusable UI components
│   │   ├── Badge.js
│   │   ├── Button.js
│   │   ├── Card.js
│   │   ├── DisclaimerModal.js
│   │   ├── Header.js
│   │   ├── Input.js
│   │   ├── ProgressBar.js
│   │   ├── ScreenWrapper.js
│   │   ├── StepIndicator.js
│   │   └── TextArea.js
│   ├── screens/                 # Application screens
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── CreateContractScreen.js
│   │   ├── ContractsScreen.js
│   │   ├── ContractDetailScreen.js
│   │   ├── ApprovalsScreen.js
│   │   ├── ChatbotScreen.js
│   │   ├── VerificationScreen.js
│   │   └── SettingsScreen.js
│   ├── services/                # API service layer
│   │   ├── api.service.js
│   │   ├── auth.service.js
│   │   ├── contract.service.js
│   │   ├── chatbot.service.js
│   │   └── verification.service.js
│   ├── hooks/
│   │   └── useVoiceInput.js
│   ├── utils/
│   │   ├── mrz-parser.js
│   │   └── nfc-mrtd.js
│   ├── config/
│   │   └── api.config.js
│   └── styles/
│       └── tokens.js
│
├── main-server/                 # ── Backend Server ──
│   ├── server.js                # Express entry point (port 8080)
│   ├── db.js                    # PostgreSQL connection & schema
│   ├── package.json             # Server dependencies
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   └── routes/
│       ├── auth.js              # Registration & login
│       ├── contracts.js         # Contract CRUD + workflow
│       ├── users.js             # Profile & TC Kimlik lookup
│       ├── verification.js      # Identity verification
│       ├── chat.js              # Chatbot (mock)
│       ├── analysis.js          # NLP analysis (mock)
│       └── disclaimer.js        # Legal disclaimer
│
└── assets/                      # App icons & splash screen
```


## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (pgAdmin recommended)
- Expo Go app on your phone (for testing)

### 1. Database Setup

1. Open **pgAdmin** and connect to your PostgreSQL server
2. Create a new database named **`mobile_programming`**
3. No manual table creation needed — tables are auto-created on server startup

Connection details (configured in `main-server/db.js`):

| Setting  | Value              |
|----------|--------------------|
| Host     | localhost          |
| Port     | 5432               |
| Database | mobile_programming |
| User     | postgres           |
| Password | EnesPassword       |

### 2. Start the Backend Server

```bash
cd main-server
npm install
npm start
```

Server runs at `http://localhost:8080`. You should see:

```
  e-Arzuhal Main Server
  ─────────────────────
  Port:     8080
  Database: PostgreSQL (mobile_programming)
```

### 3. Start the Mobile App

```bash
# In the project root (not main-server)
npm install
npx expo start
```

Scan the QR code with Expo Go. The app auto-detects the server IP.

#### Platform-Specific Commands

```bash
npx expo start --android    # Android emulator
npx expo start --ios        # iOS simulator (macOS only)
```


## Navigation Architecture

```
Stack.Navigator
├── Login
├── Register
└── Main → Tab.Navigator
    ├── Dashboard
    ├── CreateContract
    ├── Contracts → ContractsStack
    │   ├── ContractsList
    │   └── ContractDetail
    ├── Approvals
    ├── Chatbot
    └── Settings → SettingsStack
        ├── SettingsHome
        └── Verification
```


## API Endpoints

### Authentication (public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login with username/email + password |

### Contracts (requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts` | List user's contracts |
| POST | `/api/contracts` | Create a new contract |
| GET | `/api/contracts/stats` | Dashboard statistics |
| GET | `/api/contracts/pending-approval` | Contracts awaiting approval |
| GET | `/api/contracts/:id` | Get single contract detail |
| PUT | `/api/contracts/:id` | Update a contract |
| DELETE | `/api/contracts/:id` | Delete a contract |
| POST | `/api/contracts/:id/finalize` | Send to approval |
| POST | `/api/contracts/:id/approve` | Approve a contract |
| POST | `/api/contracts/:id/reject` | Reject a contract |
| GET | `/api/contracts/:id/pdf` | Download contract as PDF |

### Users (requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/lookup?tcKimlik=` | Lookup user by TC Kimlik No |
| PUT | `/api/users/me` | Update profile |
| PUT | `/api/users/me/password` | Change password |

### Analysis (requires JWT — mock NLP)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analysis/analyze` | Analyze contract text |

### Chat (requires JWT — mock responses)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send chatbot message |

### Verification (requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/verification/status` | Get verification status |
| POST | `/api/verification/identity` | Submit identity verification |

### Disclaimer (requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/disclaimer/status` | Check disclaimer acceptance |
| POST | `/api/disclaimer/accept` | Accept legal disclaimer |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |


## Database Schema

### users
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| username | VARCHAR(100) | Unique username |
| email | VARCHAR(255) | Unique email |
| password_hash | TEXT | bcrypt hashed password |
| first_name | VARCHAR(100) | First name |
| last_name | VARCHAR(100) | Last name |
| tc_kimlik | VARCHAR(11) | Turkish national ID number |
| verified | BOOLEAN | Identity verification status |
| verify_method | VARCHAR(50) | NFC / MRZ / MANUAL |
| disclaimer_accepted | BOOLEAN | Legal disclaimer accepted |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### contracts
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| owner_id | TEXT | FK → users.id |
| title | TEXT | Contract title |
| type | VARCHAR(50) | SALES, RENTAL, SERVICE, EMPLOYMENT, NDA, OTHER |
| content | TEXT | Full contract text |
| amount | VARCHAR(100) | Contract monetary amount |
| status | VARCHAR(50) | DRAFT, PENDING_APPROVAL, APPROVED, REJECTED |
| counterparty_name | VARCHAR(200) | Other party's name |
| counterparty_role | VARCHAR(200) | Other party's role |
| counterparty_tc_kimlik | VARCHAR(11) | Other party's TC Kimlik No |
| counterparty_user_id | TEXT | Other party's user ID (if registered) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |


## Application Features

- **User Authentication** — Registration and login with JWT tokens and bcrypt-hashed passwords
- **Contract CRUD** — Create, read, update, and delete contracts stored in PostgreSQL
- **Contract Workflow** — Draft → Pending Approval → Approved / Rejected lifecycle
- **NLP Analysis** — Automatic contract type detection and entity extraction (mock)
- **GraphRAG Suggestions** — Recommended missing clauses based on contract type (mock)
- **PDF Generation** — Server-side PDF creation and download
- **Identity Verification** — NFC-based Turkish ID card reading (ICAO 9303 MRTD)
- **Chatbot Assistant** — Legal Q&A chatbot with conversation history (mock)
- **Voice Input** — Speech-to-text for contract content and chat (Turkish)
- **Dashboard** — Real-time contract statistics from database
- **Profile Management** — Edit profile and change password
- **Legal Disclaimer** — Required acceptance before contract finalization
- **Session Management** — Automatic logout on 401 (token expiry)


## Authentication Flow

1. User registers or logs in → server returns JWT `accessToken` + `userInfo`
2. Token stored in `expo-secure-store` (encrypted device storage)
3. Every API request includes `Authorization: Bearer <token>` header
4. If any response returns 401 → token deleted, user redirected to login


## Contract Lifecycle

```
DRAFT  ──(finalize)──►  PENDING_APPROVAL  ──(approve)──►  APPROVED
                                           ──(reject)───►  REJECTED
```

Only the contract owner can finalize. Identity verification is required before finalize/approve/reject actions.
