# Task Management Backend

A high-concurrency, real-time task management backend built with **Node.js** and **NestJS**.
The system is engineered using **Hexagonal Architecture (Ports & Adapters)** and **Domain-Driven Design (DDD)** to enforce strict separation of concerns, dependency inversion, and long-term maintainability.`

It supports **REST** and **gRPC** as parallel transport layers, implements **Optimistic Concurrency Control** to prevent lost updates, and utilizes a **Distributed Redis Infrastructure** for caching, rate limiting, and background processing.

---

## 🛡 Build Status & Quality

[![Build Status](https://img.shields.io/github/actions/workflow/status/HoneyVanya/task-manager-nest/ci.yml?style=flat-square)](https://github.com/HoneyVanya/task-manager-nest/actions)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-green?style=flat-square)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue?style=flat-square&logo=docker)](Dockerfile)
[![Redis](https://img.shields.io/badge/redis-caching%20%26%20queues-red?style=flat-square&logo=redis)](https://redis.io/)

---

## 📋 Project Overview

This service implements a collaborative task board system where users can:

1.  **Collaborate** — create, update, and view tasks on a shared public board.
2.  **Claim Work** — atomically assign tasks to private user boards.
3.  **Sync in Real Time** — receive instant updates without polling or page refreshes.

The project focuses on solving **real-world backend problems** such as concurrent updates, distributed state management, and observability.

---

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
src/
├── tasks/
│ ├── domain/
│ │ ├── task.entity.ts
│ │ └── task.repository.ts
│ ├── application/
│ │ └── tasks.service.ts
│ ├── infrastructure/
│ │ ├── persistence/
│ │ │ └── prisma-task.repository.ts
│ │ ├── presentation/
│ │ │ ├── tasks.controller.ts
│ │ │ └── tasks.gateway.ts
├── common/
│ ├── interceptors/
│ ├── filters/
│ └── decorators/
├── prisma/
│ └── schema.prisma
└── main.ts
```

## ⚙️ Environment Variables

Configuration follows the **12-Factor App** methodology.

| Variable            | Purpose               | Example                                    |
| :------------------ | :-------------------- | :----------------------------------------- |
| `DATABASE_URL`      | PostgreSQL connection | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL`         | Redis connection      | `redis://localhost:6379`                   |
| `JWT_ACCESS_SECRET` | Auth Signing Key      | `secret_key`                               |
| `PORT`              | HTTP port             | `3000`                                     |
| `GRPC_URL`          | gRPC address          | `localhost:50051`                          |

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js v20+
- Docker & Docker Compose

### 2. Installation

```bash
git clone [https://github.com/HoneyVanya/task-manager-nest.git](https://github.com/HoneyVanya/task-manager-nest.git)
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
http://localhost:3000/api
```

### gRPC

Protobuf definitions:

```bash
proto/tasks.proto
```

---

## 🔮 Future Improvements

- OpenTelemetry tracing for distributed debugging.
- Circuit Breakers for external service calls.
- Frontend implementation (React/Vue).
- CI/CD Pipeline (GitHub Actions).
