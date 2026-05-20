# Skill — Encryption & Sensitive Data Patterns

AES-256-GCM for field encryption, which fields to encrypt, how to search encrypted data.

---

## Encryption utility (already in boilerplate)

```typescript
// backend/src/utils/encryption.ts — already exists
import crypto from 'crypto';

const ALGORITHM  = 'aes-256-gcm';
const KEY_HEX    = process.env.ENCRYPTION_KEY!;   // 64 hex chars = 32 bytes
const KEY        = Buffer.from(KEY_HEX, 'hex');

if (KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
}

export function encrypt(plaintext: string): string {
  const iv         = crypto.randomBytes(12);                   // 96-bit IV for GCM
  const cipher     = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag    = cipher.getAuthTag();                      // 128-bit auth tag (tamper detection)

  // Format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid ciphertext format');

  const iv       = Buffer.from(ivHex, 'hex');
  const authTag  = Buffer.from(tagHex, 'hex');
  const data     = Buffer.from(dataHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

// Safe decrypt — returns null if decryption fails (corrupted or tampered)
export function safeDecrypt(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  try { return decrypt(ciphertext); }
  catch { return null; }
}
```

---

## Which fields MUST be encrypted

| Field | Why |
|-------|-----|
| Bank account number | Financial PII |
| Aadhaar / SSN / national ID | Government ID |
| PAN card number | Tax ID |
| Passport number | Government ID |
| Medical information | Health PII |
| Salary (optional — some prefer hashed or access-controlled) | Financial sensitivity |
| Emergency contact phone | PII |

**Field naming convention:** always suffix with `Encrypted`

```prisma
model Employee {
  id                      String  @id @default(uuid())
  // ... standard fields

  // Plain text — searchable, not sensitive
  firstName               String
  lastName                String
  email                   String  @unique
  phone                   String?

  // Encrypted — sensitive PII
  aadhaarEncrypted        String?
  panNumberEncrypted      String?
  bankAccountEncrypted    String?
  bankIfscEncrypted       String?
  passportNumberEncrypted String?
  medicalNotesEncrypted   String?
}
```

---

## Service — encrypt on write, decrypt on read

```typescript
import { encrypt, safeDecrypt } from '../../utils/encryption.js';

export class EmployeeService {
  static async create(dto: CreateEmployeeInput, actor: AuthUser) {
    return prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          ...dto,
          organizationId: actor.organizationId,
          // Encrypt sensitive fields before storing
          aadhaarEncrypted:     dto.aadhaar     ? encrypt(dto.aadhaar)     : null,
          panNumberEncrypted:   dto.panNumber   ? encrypt(dto.panNumber)   : null,
          bankAccountEncrypted: dto.bankAccount ? encrypt(dto.bankAccount) : null,
          bankIfscEncrypted:    dto.bankIfsc    ? encrypt(dto.bankIfsc)    : null,
          // Remove plain text from the stored object
          aadhaar:     undefined,
          panNumber:   undefined,
          bankAccount: undefined,
          bankIfsc:    undefined,
        },
      });
      return employee;
    });
  }

  // ── Decrypt for response ─────────────────────────────────────────────────
  static decryptEmployee(emp: EmployeeWithEncrypted): EmployeeResponse {
    return {
      ...emp,
      // Expose decrypted fields under their plain names
      aadhaar:     safeDecrypt(emp.aadhaarEncrypted),
      panNumber:   safeDecrypt(emp.panNumberEncrypted),
      bankAccount: safeDecrypt(emp.bankAccountEncrypted),
      bankIfsc:    safeDecrypt(emp.bankIfscEncrypted),
      // Remove encrypted versions from the response
      aadhaarEncrypted:     undefined,
      panNumberEncrypted:   undefined,
      bankAccountEncrypted: undefined,
      bankIfscEncrypted:    undefined,
    };
  }

  static async getOne(id: string, actor: AuthUser) {
    const employee = await prisma.employee.findFirst({
      where: { id, organizationId: actor.organizationId, deletedAt: null },
    });
    if (!employee) throw new NotFoundError('Employee not found');
    return this.decryptEmployee(employee);
  }
}
```

---

## Role-based field exposure — only admins see PII

```typescript
// Limit PII visibility by role
static async getOne(id: string, actor: AuthUser) {
  const employee = await prisma.employee.findFirst({
    where: { id, organizationId: actor.organizationId, deletedAt: null },
  });
  if (!employee) throw new NotFoundError('Employee not found');

  const base = this.decryptEmployee(employee);

  // Non-admin roles get a redacted view
  if (actor.role === UserRole.EMPLOYEE && actor.employeeId !== id) {
    return {
      id:        base.id,
      firstName: base.firstName,
      lastName:  base.lastName,
      email:     base.email,
      // Sensitive fields omitted entirely
    };
  }

  return base;
}
```

---

## Searching encrypted data — strategies

AES-GCM ciphertext is non-deterministic (different each time), so you CANNOT do `WHERE bankAccountEncrypted LIKE '%..%'`.

### Strategy 1 — Searchable hash (for exact match)

```typescript
// Store a SHA-256 hash alongside the encrypted value for exact-match search
const aadhaarHash = crypto.createHash('sha256')
  .update(dto.aadhaar + process.env.HASH_PEPPER)  // add pepper to prevent rainbow tables
  .digest('hex');

await tx.employee.create({
  data: {
    aadhaarEncrypted: encrypt(dto.aadhaar),
    aadhaarHash,      // searchable — add @@index([aadhaarHash])
  },
});

// Search by exact Aadhaar:
const hash = crypto.createHash('sha256').update(searchAadhaar + HASH_PEPPER).digest('hex');
const emp  = await prisma.employee.findFirst({ where: { aadhaarHash: hash, organizationId } });
```

### Strategy 2 — Search by non-encrypted fields only

For most searches: search by name, email, employee ID. Never offer full PII search in the UI.

### Strategy 3 — Decrypt in application for admin operations

For admin bulk export: fetch all records, decrypt in the service, format report. Never SQL-search decrypted values.

---

## Key rotation procedure

```typescript
// When ENCRYPTION_KEY changes, re-encrypt all existing records
// Run as a one-time migration script — NOT in the API server

async function rotateEncryptionKey() {
  const OLD_KEY = Buffer.from(process.env.OLD_ENCRYPTION_KEY!, 'hex');
  const NEW_KEY = Buffer.from(process.env.NEW_ENCRYPTION_KEY!, 'hex');

  const employees = await prisma.employee.findMany({ where: { aadhaarEncrypted: { not: null } } });

  for (const emp of employees) {
    // Decrypt with old key
    const plain = decryptWithKey(emp.aadhaarEncrypted!, OLD_KEY);
    // Re-encrypt with new key
    const reEncrypted = encryptWithKey(plain, NEW_KEY);
    await prisma.employee.update({ where: { id: emp.id }, data: { aadhaarEncrypted: reEncrypted } });
  }

  console.log(`Rotated ${employees.length} records`);
}
```

---

## Checklist

- [ ] `ENCRYPTION_KEY` is 64 hex chars (32 bytes) — validated on server start
- [ ] All PII field names end in `Encrypted` in Prisma schema
- [ ] `encrypt()` called on all sensitive fields BEFORE `prisma.create/update`
- [ ] `safeDecrypt()` used on all reads (not `decrypt()`) — handles corrupted data gracefully
- [ ] Encrypted ciphertext strings NEVER returned in API responses — always decrypted or omitted
- [ ] Role check before exposing PII — employees cannot see other employees' PII
- [ ] Searchable fields use SHA-256 hash with pepper, not the ciphertext
- [ ] Key rotation script exists and is tested in staging before production
- [ ] `ENCRYPTION_KEY` in GitHub secrets — never in `.env` committed to git
