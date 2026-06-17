# Hybrid Session + JWT Authentication System

> Personal guide for building a production-inspired authentication system using:
>
> * Node.js
> * Express
> * TypeScript
> * PostgreSQL
> * Prisma
> * JWT
> * Argon2

---

# Why This Architecture?

Most JWT tutorials implement:

```text
Login
  ↓
Generate JWT
  ↓
Store JWT in frontend
  ↓
Done
```

This approach has problems:

* Difficult logout
* No session control
* No device management
* No refresh token rotation

This project uses a hybrid approach:

```text
Access Token + Refresh Token + Session Table
```

Benefits:

* Fast authentication
* Secure logout
* Session revocation
* Refresh token rotation
* Multiple device support

---

# Project Roadmap

Build features in this order:

```text
1. User Model
2. Session Model
3. Registration
4. Login
5. Authentication Middleware
6. Protected Routes
7. Refresh Token Flow
8. Logout
9. Logout All Devices (Optional)
10. RBAC (Future)
```

---

# Database Design

## User Model

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String

  sessions  Session[]
}
```

Purpose:

* Stores user credentials.
* Passwords are always hashed.

---

## Session Model

```prisma
model Session {
  id               String   @id
  userId           String

  refreshTokenHash String

  expiresAt        DateTime
  lastUsedAt       DateTime @default(now())

  isRevoked        Boolean  @default(false)

  user User @relation(
    fields: [userId],
    references: [id]
  )
}
```

Purpose:

* Tracks logged-in devices.
* Stores hashed refresh tokens.
* Supports logout.
* Supports token rotation.

---

# Authentication Overview

```text
User
 │
 ▼
Login
 │
 ├── Access Token (15m)
 │
 └── Refresh Token (30d)
          │
          ▼
      Session Table
```

---

# Step 1: Registration

Goal:

Create a user account.

---

## Flow

```text
Email + Password
        │
        ▼
Validate Input
        │
        ▼
Check Existing User
        │
        ▼
Hash Password
        │
        ▼
Store User
```

---

## Why Hash Passwords?

Never store:

```text
password123
```

Store:

```text
$argon2id$v=19$...
```

Even if the database is leaked, passwords remain protected.

---

# Step 2: Login

Goal:

Authenticate user and create a session.

---

## Flow

```text
Email + Password
        │
        ▼
Find User
        │
        ▼
Verify Password
        │
        ▼
Create Session ID
        │
        ▼
Generate Access Token
        │
        ▼
Generate Refresh Token
        │
        ▼
Hash Refresh Token
        │
        ▼
Store Session
        │
        ▼
Send Cookie
```

---

## Session Creation

Generate unique session id:

```ts
const sessionId = randomUUID();
```

Store:

```text
Session
 ├── id
 ├── userId
 ├── refreshTokenHash
 ├── expiresAt
 └── isRevoked
```

---

# JWT Design

## Access Token

Purpose:

Used for protected routes.

Payload:

```ts
{
  id: user.id,
  email: user.email
}
```

Expiry:

```text
15 minutes
```

---

## Refresh Token

Purpose:

Generate new access tokens.

Payload:

```ts
{
  id: user.id,
  sessionId: sessionId
}
```

Expiry:

```text
30 days
```

---

# Why Session ID?

Without sessionId:

```text
Refresh Token
    ↓
User ID
```

You cannot identify which device/session issued the token.

With sessionId:

```text
Refresh Token
     ↓
Session
     ↓
Device-specific control
```

Now:

* Logout works
* Session revocation works
* Multiple devices work

---

# Step 3: Authentication Middleware

Goal:

Protect routes.

---

## Flow

```text
Request
    │
Authorization Header
    │
Bearer Token
    │
Verify JWT
    │
req.user
    │
Controller
```

---

## Header Format

```http
Authorization: Bearer ACCESS_TOKEN
```

---

## Middleware Responsibilities

* Verify access token
* Reject expired tokens
* Attach user to request

Example:

```ts
req.user = decoded;
```

---

# Step 4: Protected Route

Goal:

Allow only authenticated users.

---

## Example

```http
GET /profile
```

Flow:

```text
Access Token
      │
      ▼
Authentication Middleware
      │
      ▼
Controller
      │
      ▼
Response
```

Controller:

```ts
res.json(req.user);
```

---

# Step 5: Refresh Token Flow

Goal:

Issue a new access token without forcing login.

---

## Why?

Access tokens expire quickly.

Example:

```text
15 minutes
```

When expired:

```http
401 Unauthorized
```

Instead of forcing login:

```http
POST /auth/refresh
```

---

## Refresh Flow

```text
Refresh Token Cookie
        │
        ▼
Verify JWT
        │
        ▼
Find Session
        │
        ▼
Check Revoked
        │
        ▼
Check Expiry
        │
        ▼
Verify Hash
        │
        ▼
Generate New Access Token
        │
        ▼
Generate New Refresh Token
        │
        ▼
Rotate Hash
        │
        ▼
Return Access Token
```

---

# Refresh Token Rotation

Old:

```text
refreshToken_1
```

After refresh:

```text
refreshToken_2
```

Database updates:

```text
hash(refreshToken_2)
```

Now:

```text
refreshToken_1
```

becomes useless.

This protects against stolen refresh tokens.

---

# Step 6: Logout

Goal:

Destroy session.

---

## Flow

```text
POST /auth/logout
        │
        ▼
Read Refresh Token
        │
        ▼
Verify JWT
        │
        ▼
Extract sessionId
        │
        ▼
Revoke Session
        │
        ▼
Delete Cookie
```

Database:

Before:

```text
isRevoked = false
```

After:

```text
isRevoked = true
```

---

## Why Revoke Session?

Deleting cookie alone is not enough.

Bad:

```text
Delete Cookie
```

Good:

```text
Delete Cookie
+
Revoke Session
```

Now no refresh token can be used again.

---

# Complete Request Lifecycle

```text
Register
    │
    ▼
Login
    │
    ├── Access Token
    │
    └── Refresh Token
            │
            ▼
       Session Table

Protected Route
        │
        ▼
Access Token Verification

Access Token Expired
        │
        ▼
Refresh Endpoint
        │
        ▼
Session Verification
        │
        ▼
Token Rotation
        │
        ▼
New Access Token

Logout
        │
        ▼
Session Revocation
        │
        ▼
Refresh Disabled
```

---

# API Routes

## Register

```http
POST /auth/register
```

Body:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

---

## Login

```http
POST /auth/login
```

Returns:

```json
{
  "accessToken": "..."
}
```

Sets:

```text
refreshToken cookie
```

---

## Get Profile

```http
GET /auth/profile
```

Headers:

```http
Authorization: Bearer ACCESS_TOKEN
```

Returns:

```json
{
  "id": "...",
  "email": "..."
}
```

---

## Refresh Token

```http
POST /auth/refresh
```

Uses:

```text
refreshToken cookie
```

Returns:

```json
{
  "accessToken": "..."
}
```

---

## Logout

```http
POST /auth/logout
```

Actions:

```text
Revoke Session
Delete Cookie
```

---

# Future Improvements

* Role-Based Access Control (RBAC)
* Logout All Devices
* Device Tracking
* CSRF Protection
* Email Verification
* Password Reset
* Account Locking
* OAuth (Google/GitHub)

---

# Key Concepts Learned

* Authentication vs Authorization
* Access Tokens vs Refresh Tokens
* Stateless vs Stateful Authentication
* Session Management
* Refresh Token Rotation
* JWT Security
* Password Hashing
* Cookie-Based Authentication
* Prisma + PostgreSQL
* Production Authentication Design

```
```
