# System Architecture

## High-level overview

```mermaid
graph TB
    subgraph Clients
        WEB[Browser PWA<br/>React + Vite]
        MOB[Mobile App<br/>Capacitor Android/iOS]
        DSK[Desktop App<br/>Electron Windows]
    end

    subgraph Edge
        NGX[Nginx<br/>HTTPS · SPA fallback<br/>WebSocket upgrade]
    end

    subgraph Backend [:4000]
        EXP[Express API<br/>auth · modules · sockets]
        BQ[BullMQ Workers<br/>email · notification]
        SW[Socket.io<br/>org:id · user:id rooms]
    end

    subgraph Data
        PG[(PostgreSQL 16<br/>Primary store)]
        RD[(Redis 7<br/>Sessions · Cache · Queues)]
    end

    subgraph Storage
        UP[uploads/<br/>Local disk or S3]
    end

    WEB -->|HTTPS| NGX
    MOB -->|HTTPS| NGX
    DSK -->|HTTPS| NGX
    NGX -->|/api/*| EXP
    NGX -->|/socket.io/*| SW
    EXP --> PG
    EXP --> RD
    EXP --> UP
    BQ --> RD
    BQ -->|SMTP| MAIL[Email provider]
    SW --> RD
```

## Request lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant N as Nginx
    participant MW as Middleware chain
    participant CTL as Controller
    participant SVC as Service
    participant DB as Prisma → Postgres

    C->>N: POST /api/employees
    N->>MW: authenticate
    MW->>MW: requirePermission(EMPLOYEE_CREATE)
    MW->>MW: validateRequest(CreateEmployeeSchema)
    MW->>CTL: req.body + req.user
    CTL->>SVC: EmployeeService.create(dto, orgId)
    SVC->>DB: prisma.$transaction([create, auditLog])
    DB-->>SVC: employee record
    SVC-->>CTL: employee
    CTL-->>C: 201 { success: true, data: employee }
    SVC--)Socket: emit('employee:created', org:orgId room)
```

## Authentication flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express
    participant DB as Postgres
    participant RD as Redis

    C->>API: POST /api/auth/login
    API->>DB: find user by email + org
    DB-->>API: user with passwordHash
    API->>API: bcrypt.compare (12 rounds)
    API->>DB: create refreshToken record
    API-->>C: accessToken (15m, Authorization header)<br/>refreshToken (7d, httpOnly cookie)

    Note over C,API: On 401 response
    C->>API: POST /api/auth/refresh (cookie)
    API->>DB: find + validate refreshToken
    API-->>C: new accessToken
```

## Multi-tenancy data isolation

Every request from an authenticated user carries `req.user.organizationId`.  
Every Prisma query on org-scoped data **must** include `{ organizationId: req.user.organizationId }`.  
This is enforced by `rule-security-rbac.md` and audited by `agent-api-security`.

```
User A (org: abc) → can only read/write rows where organizationId = "abc"
User B (org: xyz) → can only read/write rows where organizationId = "xyz"
Rows where organizationId is missing from the query = IDOR vulnerability
```

## Job queue architecture

```mermaid
graph LR
    SVC[Service layer] -->|queue.add| BQ[BullMQ Queue<br/>Redis-backed]
    BQ --> EW[Email Worker<br/>Nodemailer]
    BQ --> NW[Notification Worker<br/>Socket.io emit]
    EW -->|SMTP| EMAIL[Email provider]
    NW --> IO[Socket.io → user room]
```

Queues are defined in `backend/src/jobs/queues.ts`.  
Workers auto-start with the server in `backend/src/jobs/workers/`.
