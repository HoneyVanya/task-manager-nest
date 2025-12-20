# Task Management Backend

A high-concurrency, real-time task management backend built with **Node.js** and **NestJS**.
The system is engineered using **Hexagonal Architecture (Ports & Adapters)** and **Domain-Driven Design (DDD)** to enforce strict separation of concerns, dependency inversion, and long-term maintainability.

It supports **REST** and **gRPC** as parallel transport layers, implements **Optimistic Concurrency Control** to prevent lost updates in collaborative workflows, and uses **WebSockets** for real-time state synchronization.

---

## 🛡 Build Status & Quality

[![Build Status](https://img.shields.io/github/actions/workflow/status/your-username/task-manager-nest/ci.yml?style=flat-square)](https://github.com/your-username/task-manager-nest/actions)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-green?style=flat-square)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Coverage](https://img.shields.io/codecov/c/github/your-username/task-manager-nest?style=flat-square)](https://codecov.io/)
[![Docker](https://img.shields.io/badge/docker-ready-blue?style=flat-square&logo=docker)](Dockerfile)

---

## 📋 Project Overview

This service implements a collaborative task board system where users can:

1. **Collaborate** — create, update, and view tasks on a shared public board.
2. **Claim Work** — atomically assign tasks to private user boards.
3. **Sync in Real Time** — receive instant updates without polling or page refreshes.

The project focuses on solving **real-world backend problems** such as concurrent updates, transport-agnostic business logic, and real-time consistency.

---

## 🏗 Architectural Overview

The system is structured using **Hexagonal (Clean) Architecture**, ensuring that business rules remain isolated from frameworks, databases, and transport protocols.

┌────────────────────────────┐
│ Controllers │
│ REST / gRPC / WebSocket │
└─────────────┬──────────────┘
│
▼
┌────────────────────────────┐
│ Application Layer │
│ (Use Cases / Services) │
└─────────────┬──────────────┘
│
▼
┌────────────────────────────┐
│ Domain Layer │
│ Entities + Repositories │
│ (NO framework code) │
└─────────────┬──────────────┘
│
▼
┌────────────────────────────┐
│ Infrastructure Layer │
│ Prisma / DB / Gateways │
└────────────────────────────┘

### Layer Responsibilities

#### 1. Domain Layer (`src/**/domain`)

- **Responsibility:** Enterprise business rules
- **Contains:** Entities, Value Objects, Repository Interfaces (Ports)
- **Dependencies:** None (pure TypeScript)

#### 2. Application Layer (`src/**/application`)

- **Responsibility:** Orchestrates use cases
- **Contains:** Services
- **Depends on:** Domain abstractions only

#### 3. Infrastructure Layer (`src/**/infrastructure`)

- **Responsibility:** Technical implementations
- **Contains:** Prisma repositories, REST/gRPC controllers, WebSocket gateways
- **Depends on:** Application + Domain

> All dependencies point inward. Infrastructure is replaceable without touching business logic.

---

## 🛠 Technology Stack & Rationale

| Technology     | Role                  | Why It Was Chosen                                                                          |
| -------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| **NestJS**     | Application Framework | Enforces modularity, dependency injection, and testability suitable for enterprise systems |
| **Prisma**     | Data Access Layer     | Type-safe database access with schema-first migrations                                     |
| **PostgreSQL** | Database              | ACID compliance and strong transactional guarantees                                        |
| **Socket.io**  | Real-Time Transport   | Bi-directional event-driven communication with room partitioning                           |
| **gRPC**       | Internal RPC          | Strong typing, low latency, and efficient binary transport                                 |
| **Passport**   | Authentication        | Strategy-based authentication with JWT support                                             |
| **Docker**     | Containerization      | Environment parity across development and production                                       |

---

## 🧠 Key Design Decisions

### Rich Domain Models (Not Anemic)

Entities encapsulate both **state and behavior**.
Business rules (e.g., assignment, completion, version checks) live inside entities, not services.

**Result:** Invariants are enforced consistently, preventing logic leakage.

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

## ⚙️ Environment Variables

Configuration follows the **12-Factor App** methodology.

| Variable           | Purpose               | Example                                  |
| ------------------ | --------------------- | ---------------------------------------- |
| DATABASE_URL       | PostgreSQL connection | postgresql://user:pass@localhost:5432/db |
| JWT_ACCESS_SECRET  | JWT signing key       | access_secret                            |
| JWT_REFRESH_SECRET | Refresh token key     | refresh_secret                           |
| PORT               | HTTP port             | 3000                                     |
| GRPC_URL           | gRPC address          | localhost:50051                          |
| FRONTEND_URL       | CORS origin           | http://localhost:5173                    |

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js v20+
- Docker & Docker Compose

### 2. Installation

```bash
git clone https://github.com/your-username/task-manager-nest.git
cd task-manager-nest
npm install
```

### 3. Start Database

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
npm run start:dev
```

### Production build

```bash
npm run build
npm run start:prod
```

---

## 🧪 Testing

```bash
npm run test
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

## ⚡ Real-Time Updates

- Clients join board-specific WebSocket rooms
- Updates are broadcast only to relevant rooms
- No polling, no redundant traffic

---

## 🔮 Future Improvements

- Redis adapter for horizontal WebSocket scaling
- Read-through caching with Redis
- Background jobs via BullMQ
- OpenTelemetry tracing
- Rate limiting & circuit breakers
