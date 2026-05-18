# Database — Entity Relationship Diagram

All models live in `prisma/schema.prisma`. Generated Prisma client is at `@prisma/client`.

## ERD

```mermaid
erDiagram
    Organization {
        String id PK
        String name
        String slug UK
        String domain
        Boolean isActive
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }

    User {
        String id PK
        String organizationId FK
        String name
        String email UK
        String passwordHash
        UserRole role
        UserStatus status
        String managerId FK
        DateTime lastLoginAt
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }

    Department {
        String id PK
        String organizationId FK
        String name
        String managerId FK
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }

    Designation {
        String id PK
        String organizationId FK
        String title
        String departmentId FK
        DateTime createdAt
        DateTime updatedAt
        DateTime deletedAt
    }

    RefreshToken {
        String id PK
        String userId FK
        String tokenHash
        DateTime expiresAt
        DateTime createdAt
    }

    AuditLog {
        String id PK
        String organizationId FK
        String actorId FK
        AuditAction action
        String entity
        String entityId
        Json before
        Json after
        String ipAddress
        DateTime createdAt
    }

    Notification {
        String id PK
        String organizationId FK
        String userId FK
        NotificationType type
        String title
        String message
        Boolean isRead
        DateTime readAt
        DateTime createdAt
    }

    Organization ||--o{ User : "has many"
    Organization ||--o{ Department : "has many"
    Organization ||--o{ Designation : "has many"
    Organization ||--o{ AuditLog : "has many"
    Organization ||--o{ Notification : "has many"
    User ||--o{ RefreshToken : "has many"
    User ||--o{ AuditLog : "actor"
    User ||--o{ Notification : "recipient"
    User }o--o| User : "manager"
    Department ||--o{ Designation : "has many"
    Department }o--o| User : "managed by"
```

## Key constraints

| Rule | Enforcement |
|------|------------|
| Every org-scoped model has `organizationId` | `rule-database.md` |
| IDs are always UUID | `@default(uuid())` in schema |
| Soft delete only — no hard deletes | `deletedAt DateTime?` on every model |
| Sensitive fields end in `Encrypted` | `rule-database.md` naming convention |
| `@@index([organizationId])` on every org-scoped model | Required by `rule-database.md` |
| Enums defined in both `schema.prisma` AND `shared/src/enums.ts` | Must stay in sync |
| User foreign keys use `onDelete: Restrict` | Prevents accidental cascade deletes |

## Adding a new model (checklist)

```prisma
model MyModel {
  id             String    @id @default(uuid())
  organizationId String
  // ... your fields ...
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
  @@map("my_models")
}
```

Then run: `npm run db:migrate -- --name add-my-model && npm run db:generate`
