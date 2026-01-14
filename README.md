# Task Management Backend

A high-concurrency, real-time task management backend built with **Node.js** and **NestJS**.
The system is engineered using **Hexagonal Architecture (Ports & Adapters)** and **Domain-Driven Design (DDD)** to enforce strict separation of concerns, dependency inversion, and long-term maintainability.`

It supports **REST** and **gRPC** as parallel transport layers, implements **Optimistic Concurrency Control** to prevent lost updates, and utilizes a **Distributed Redis Infrastructure** for caching, rate limiting, and background processing.

---

## 🛡 Build Status & Quality

[![Build Status](https://img.shields.io/github/actions/workflow/status/HoneyVanya/task-manager-nest/ci.yml?style=flat-square&logo=github)](https://github.com/HoneyVanya/task-manager-nest/actions)
[![codecov](https://codecov.io/gh/HoneyVanya/task-manager-nest/graph/badge.svg?token=YOUR_TOKEN_HERE)](https://codecov.io/gh/HoneyVanya/task-manager-nest)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=flat-square&logo=Prisma&logoColor=white)](https://www.prisma.io/)

[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat-square&logo=docker&logoColor=white)](Dockerfile)
[![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

---

## 📋 Project Overview

This service implements a collaborative task board system where users can:

1.  **Collaborate** — create, update, and view tasks on a shared public board.
2.  **Claim Work** — atomically assign tasks to private user boards.
3.  **Sync in Real Time** — receive instant updates without polling or page refreshes.

The project focuses on solving **real-world backend problems** such as concurrent updates, distributed state management, and observability.

---

## 🧭 How to Navigate This Repository

If you are reviewing this codebase:

1. Start with `main.ts` to understand application bootstrap
2. Review `tasks/domain` for business rules
3. Inspect `tasks/application` for use cases
4. Look at `tasks/infrastructure` last for technical details

## 🏗 Architectural Overview

The system is structured using **Hexagonal (Clean) Architecture**, ensuring that business rules remain isolated from frameworks, databases, and transport protocols.

```text
┌───────────────────────────────────────────────────┐
│                   Controllers                     │
│          REST / gRPC / WebSocket / DTOs           │
└─────────────────────────┬─────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────┐
│                Application Layer                  │
│             (Use Cases / Services)                │
└─────────────────────────┬─────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────┐
│                  Domain Layer                     │
│           Entities + Repository Interfaces        │
│                (NO framework code)                │
└─────────────────────────┬─────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────┐
│              Infrastructure Layer                 │
│             Prisma / DB / Gateways                │
└───────────────────────────────────────────────────┘
```

### Layer Responsibilities

#### 1. Domain Layer (`src/**/domain`)

- **Responsibility:** Enterprise business rules & Invariants
- **Contains:** Entities, Value Objects, Repository Interfaces
- **Dependencies:** None (pure TypeScript)

#### 2. Application Layer (`src/**/application`)

- **Responsibility:** Orchestration & Use Cases
- **Contains:** Services, DTOs
- **Depends on:** Domain abstractions only

#### 3. Infrastructure Layer (`src/**/infrastructure`)

- **Responsibility:** Technical implementations
- **Contains:** Prisma Repositories, Redis Client, BullMQ Processors, Controllers
- **Depends on:** Application + Domain

---

## 🛠 Technology Stack & Rationale

| Technology     | Role         | Why It Was Chosen                                          |
| :------------- | :----------- | :--------------------------------------------------------- |
| **NestJS**     | Framework    | Modular architecture suitable for enterprise scale.        |
| **Prisma**     | ORM          | Type-safe database access with schema-first migrations.    |
| **PostgreSQL** | Primary DB   | ACID compliance for critical business data.                |
| **Redis**      | Ephemeral DB | Low-latency caching, rate limiting storage, and Pub/Sub.   |
| **BullMQ**     | Async Queues | Offloading heavy tasks (emails) to background workers.     |
| **Socket.io**  | Real-Time    | Event-driven communication with Redis Adapter for scaling. |
| **gRPC**       | Internal RPC | High-performance binary transport for microservices.       |

---

## 🧠 Key Design Decisions

### 1. Distributed Caching (Cache-Aside)

The "General Board" is a read-heavy view. To reduce database load:

- **Read:** The app checks Redis first (`GET general_board_p1`). If missing, it queries Postgres and populates Redis.
- **Invalidation:** Any mutation (Create/Update/Delete) on the board automatically invalidates the specific cache keys to ensure consistency.

### 2. Stateless Scalability

The application is fully stateless, allowing for horizontal scaling:

- **Rate Limiting:** Uses **Redis Throttler Storage** instead of memory, so limits apply across all instances.
- **WebSockets:** Uses **Redis Adapter** to broadcast events across multiple server instances.

### 3. Observability & Audit Logging

An **Interceptor-based Audit Log** automatically tracks all mutations (`POST`, `PATCH`, `DELETE`).

- **Mechanism:** Intercepts the response stream globally.
- **Storage:** Saves action, user ID, resource ID, and timestamp to `AuditLog` table in Postgres.
- **Benefit:** Zero-coupling with business logic; the service layer doesn't need to know logging exists.

### 4. Asynchronous Background Jobs

Heavy operations (like sending "Welcome Emails") are decoupled using **BullMQ**.

- **Producer:** API pushes a job to the queue and returns `201 Created` immediately.
- **Consumer:** A background worker picks up the job and processes it retry logic.

---

### Optimistic Concurrency Control

To prevent silent overwrites during concurrent edits, tasks use a `version` field.

**Mechanism**

- Every update checks `WHERE id = ? AND version = previousVersion`
- On mismatch, the operation fails safely

**Why:** Avoids database locking while preserving correctness.

---

### Repository Pattern & Dependency Inversion

Application services depend on **repository interfaces**, not Prisma directly.

```ts
{ provide: 'TaskRepository', useClass: PrismaTaskRepository }
```

## Benefits

- Infrastructure can be swapped
- Business logic is unit-testable
- Persistence is an implementation detail

## Hybrid Transport Layer (REST + gRPC)

Both REST and gRPC expose the same application services.

- **REST**: Public API, browser-friendly
- **gRPC**: Internal communication, high-performance

This validates that the application layer is **transport-agnostic**.

```text
.
├── prisma/                         <-- DB Schema & Migrations (Outside src)
│   └── schema.prisma
├── proto/                          <-- gRPC Definitions
│   └── tasks.proto
├── src/
│   ├── tasks/
│   │   ├── domain/                 <-- Pure Business Logic
│   │   │   ├── task.entity.ts
│   │   │   └── task.repository.ts
│   │   ├── application/            <-- Service Orchestration
│   │   │   └── tasks.service.ts
│   │   └── infrastructure/         <-- Framework Implementations
│   │       ├── persistence/
│   │       │   └── prisma-task.repository.ts
│   │       ├── presentation/
│   │       │   ├── tasks.controller.ts
│   │       │   └── tasks.gateway.ts
│   ├── common/
│   └── main.ts
└── docker-compose.yml
```

## ⚙️ Environment Variables

Configuration follows the **12-Factor App** methodology.

| Variable               | Purpose                    | Example                                    |
| :--------------------- | :------------------------- | :----------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection      | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL`            | Redis connection           | `redis://localhost:6379`                   |
| `PORT`                 | HTTP port                  | `3000`                                     |
| `GRPC_URL`             | gRPC address               | `localhost:50051`                          |
| `JWT_ACCESS_SECRET`    | JWT signing key            | `secret_key`                               |
| `JWT_REFRESH_SECRET`   | Refresh token key          | `refresh_secret`                           |
| `GOOGLE_CLIENT_ID`     | Google OAuth ID            | `client_id`                                |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret        | `client_secret`                            |
| `GOOGLE_CALLBACK_URL`  | Google Redirect URL        | `http://localhost:3000/...`                |
| `FRONTEND_URL`         | CORS Origin (Frontend App) | `http://localhost:5173`                    |

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js v20+
- Docker & Docker Compose

### 2. Installation

```bash
git clone https://github.com/HoneyVanya/task-manager-nest.git
cd task-manager-nest
npm install
```

### 3. Start Infrastructure (DB + Redis)

```bash
docker-compose up -d db
```

### 4. Database Setup

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Run the Application

```bash
# Development Mode
npm run start:dev

# Production Build
npm run build
npm run start:prod
```

---

## 🧪 Testing

```bash
# Unit Tests
npm run test

# End-to-End (E2E) Tests
npm run test:e2e
```

---

## 📡 API Documentation

### REST

Swagger UI (development only):

```bash
http://localhost:3000/docs
```

### gRPC

Protobuf definitions:

```bash
proto/tasks.proto
```

---

## 🔮 Future Improvements

- **OpenTelemetry:** Tracing for distributed debugging.
- **Circuit Breakers:** Handling failures in external service calls.
- **Frontend Implementation:** A visual UI using React/Vue (Coming Next!).
