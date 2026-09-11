# Contributing Guide

Thank you for contributing to this React, Express, and MySQL authentication project. This guide defines how our seven-person team creates branches, writes code, opens pull requests, reviews changes, and avoids merge conflicts.

## Table of Contents

- [Project workflow](#project-workflow)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Branch strategy](#branch-strategy)
- [Development process](#development-process)
- [Commit messages](#commit-messages)
- [Pull requests](#pull-requests)
- [Project architecture](#project-architecture)
- [API conventions](#api-conventions)
- [Coding standards](#coding-standards)
- [Database changes](#database-changes)
- [Security requirements](#security-requirements)
- [Testing](#testing)
- [Definition of done](#definition-of-done)

## Project workflow

All work should begin with a GitHub issue. Each issue must describe the goal, acceptance criteria, dependencies, and assigned contributor.

The normal delivery path is:

```text
GitHub issue
  -> feature branch
  -> implementation and local testing
  -> pull request into develop
  -> teammate review
  -> integration testing
  -> merge into develop
  -> release pull request into main
```

Do not push directly to `main` or `develop`.

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/eyob-github/ai-powered-forum.git
cd ai-powered-forum
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Configure the environment

Copy each example environment file and enter your local values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Never commit a `.env` file, database password, JWT secret, access token, or other credential.

### 5. Start the applications

Run the backend and frontend in separate terminals:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

## Environment variables

The backend `.env.example` should document variables such as:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
```

The frontend `.env.example` should contain only values safe to expose in the browser:

```env
VITE_API_URL=http://localhost:5000/api
```

Do not place secrets in a variable beginning with `VITE_`. Vite exposes those values to frontend code.

## Branch strategy

| Branch | Purpose |
| --- | --- |
| `main` | Stable, tested release code |
| `develop` | Integration branch for completed features |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation-only changes |
| `test/*` | Test additions or corrections |

Use short, descriptive branch names:

```text
feature/user-model
feature/auth-register-login
feature/user-profile-api
feature/axios-auth-service
feature/auth-context
feature/auth-ui
fix/login-validation
docs/api-contract
```

Create a branch from the latest `develop` branch:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/short-description
```

Keep one feature or fix per branch. Do not combine unrelated work in the same pull request.

## Development process

1. Select or create a GitHub issue.
2. Confirm that you understand its acceptance criteria and dependencies.
3. Assign the issue to yourself before writing code.
4. Create a branch from the latest `develop`.
5. Make focused changes only in files related to the issue.
6. Test the change locally.
7. Pull the latest `develop` and resolve conflicts on your branch.
8. Push your branch and open a pull request into `develop`.
9. Address reviewer feedback.
10. Merge only after approval and successful checks.

To update your feature branch before opening a pull request:

```bash
git checkout develop
git pull origin develop
git checkout feature/short-description
git merge develop
```

Resolve any conflicts on your feature branch, test again, and then push it.

## Commit messages

Use clear commit messages in this format:

```text
type: short description
```

Recommended types:

| Type | Use |
| --- | --- |
| `feat` | Add a feature |
| `fix` | Correct a bug |
| `refactor` | Restructure code without changing behavior |
| `test` | Add or update tests |
| `docs` | Update documentation |
| `style` | Make formatting-only changes |
| `chore` | Update tooling, dependencies, or configuration |

Examples:

```text
feat: add user registration endpoint
feat: protect profile routes with JWT
fix: normalize email before duplicate check
test: cover invalid login credentials
docs: document authentication API responses
```

Avoid messages such as `update`, `changes`, `work`, or `fixed stuff`.

## Pull requests

Open feature pull requests against `develop`, not `main`.

Each pull request must include:

- A short explanation of the change.
- The GitHub issue number, such as `Closes #12`.
- The files or areas affected.
- Testing steps and results.
- Screenshots for visible frontend changes.
- Notes about environment variables, database migrations, or dependencies.
- Any known limitations or follow-up work.

Keep pull requests small enough for a teammate to review carefully. Request at least one review from a contributor who did not write the change.

### Pull request checklist

```text
- [ ] My branch was created from the latest develop branch.
- [ ] My change is limited to the assigned issue.
- [ ] I tested the change locally.
- [ ] I did not commit credentials or a .env file.
- [ ] I added or updated tests where appropriate.
- [ ] I documented new API behavior or environment variables.
- [ ] I checked that password_hash is never returned by an API.
- [ ] I checked for console errors and debugging statements.
- [ ] I resolved merge conflicts on my feature branch.
- [ ] I requested at least one teammate review.
```

## Project architecture

Backend requests should follow this flow:

```text
Route -> Middleware -> Controller -> Service -> Model -> MySQL
```

Responsibilities must remain separated:

| Layer | Responsibility |
| --- | --- |
| Route | Defines the endpoint and attaches middleware |
| Middleware | Handles authentication, validation, and request-level checks |
| Controller | Reads the request, calls a service, and sends the response |
| Service | Contains application and authentication logic |
| Model | Runs parameterized database queries |
| Utility | Provides small reusable helpers |

Controllers should remain small. Do not place SQL queries, password hashing, or complex business logic directly in a controller.

## API conventions

The authentication milestone uses these endpoints:

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create an account |
| `POST` | `/api/auth/login` | Public | Authenticate and return a JWT |
| `GET` | `/api/users/me` | Protected | Return the authenticated user |
| `PUT` | `/api/users/me` | Protected | Update the authenticated user |
| `GET` | `/api/health` | Public | Check backend availability |

Use a consistent response format:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt-token",
    "user": {
      "userId": 1,
      "firstName": "Eyob",
      "lastName": "Berhe",
      "email": "eyob@example.com"
    }
  }
}
```

Use the same naming style in all API responses. This project uses camelCase in JavaScript and JSON, while the database uses snake_case.

Recommended status codes:

| Code | Meaning |
| --- | --- |
| `200` | Successful request |
| `201` | User created successfully |
| `400` | Invalid request data |
| `401` | Missing, invalid, or expired authentication |
| `403` | Authenticated but not allowed |
| `404` | Resource or route not found |
| `409` | Email already exists |
| `500` | Unexpected server error |

## Coding standards

### General

- Use ES modules with `import` and `export`.
- Use `const` unless a value must be reassigned.
- Use `async` and `await` for asynchronous operations.
- Use descriptive variable and function names.
- Remove unused imports, debug logs, and commented-out code.
- Do not mix unrelated formatting changes into a feature pull request.

### Backend

- Use parameterized MySQL queries with `?` placeholders.
- Send asynchronous errors to the centralized error handler.
- Validate all request data before using it.
- Keep HTTP response logic in controllers.
- Keep business logic in services.
- Keep SQL in models.
- Release database connections in a `finally` block when manually acquiring them.

### Frontend

- Use the shared Axios instance for API requests.
- Keep API calls in service files, not directly in page components.
- Access authentication through `AuthContext`.
- Use `ProtectedRoute` for private pages.
- Show useful loading and error states.
- Do not store passwords or sensitive user information in browser storage.

## Database changes

- Place schema changes in `backend/database/migrations/`.
- Never edit a migration that teammates may already have applied. Add a new migration instead.
- Use ordered names such as `001_create_users_table.sql` and `002_add_user_status.sql`.
- Document how to apply and reverse each database change.
- Update seeds only with non-sensitive test data.
- Do not commit a local database dump containing real user data.

Email addresses must be trimmed and converted to lowercase before database lookup or insertion:

```js
const normalizedEmail = email.trim().toLowerCase();
```

## Security requirements

The following rules are mandatory:

- Hash passwords with bcrypt before saving them.
- Never save or log a plaintext password.
- Never return `password_hash` in an API response.
- Keep `JWT_SECRET` in the backend environment only.
- Read protected user identity from the verified JWT, not from a client-supplied user ID.
- Validate and sanitize user input.
- Return a generic invalid-credentials message during login.
- Use the `Authorization: Bearer <token>` header for protected requests.
- Do not expose database errors, stack traces, or secrets to the frontend.
- Do not weaken authentication or validation to make a test pass.

## Testing

At minimum, authentication work should verify:

1. A valid user can register.
2. Email addresses are normalized to lowercase.
3. The database contains a password hash rather than the original password.
4. A duplicate email returns `409 Conflict`.
5. A registered user can log in with the correct password.
6. An incorrect password returns `401 Unauthorized`.
7. A valid JWT can access `GET /api/users/me`.
8. A missing, invalid, or expired JWT is rejected.
9. `PUT /api/users/me` updates only the authenticated user.
10. API responses never contain `password_hash`.
11. A frontend user without a valid session is redirected from protected pages.
12. A successful login displays the user's first name on the protected page.

When fixing a bug, add a test that would have caught it whenever practical.

## Definition of done

An issue is complete only when:

- Its acceptance criteria are satisfied.
- The implementation follows the project architecture.
- Local tests pass.
- Security requirements are satisfied.
- Documentation is updated when behavior changes.
- The pull request has been reviewed and approved.
- All review comments have been resolved.
- The branch merges cleanly into `develop`.
- The integrated application works without frontend or backend console errors.

If a task depends on unfinished work from another contributor, coordinate through the GitHub issue instead of creating conflicting temporary implementations.
