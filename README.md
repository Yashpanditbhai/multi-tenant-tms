# Multi-Tenant Task Management System

A full-stack multi-tenant task management system with role-based access control (RBAC), built with Next.js, Express, and MongoDB Atlas.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Next.js 16     │────>│  Express API     │────>│  MongoDB Atlas  │
│  (Frontend)     │     │  (Backend)       │     │  (Cloud DB)     │
│  Port 3000      │     │  Port 8000       │     │                 │
│                 │     │                  │     │                 │
│  - Tailwind CSS │     │  - JWT Auth      │     │                 │
│  - ShadCN UI    │     │  - RBAC          │     │                 │
│  - Zustand      │     │  - Zod Validation│     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Application Flow

### 1. Authentication Flow

```
User visits /login or /register
        |
        v
Enters credentials (email + password)
        |
        v
Frontend (Axios) ──> POST /api/auth/login
        |
        v
Backend validates with Zod ──> Finds user in DB ──> bcrypt compares password ──> Signs JWT
        |
        v
Returns { user, token }
        |
        v
Frontend stores token + user in Zustand store + localStorage
        |
        v
Redirects to /dashboard
        |
        v
Every future API call: Axios interceptor auto-attaches "Authorization: Bearer <token>"
If 401 received: interceptor clears storage and redirects to /login
```

### 2. Request Lifecycle (Every Protected API Call)

Every request passes through a middleware chain before reaching business logic:

```
Incoming Request
      |
      v
┌─────────────────────────────────────────────────┐
│  1. authenticate()                              │
│     - Extracts JWT from Authorization header    │
│     - Verifies token signature                  │
│     - Finds user in DB                          │
│     - Attaches user object to req.user          │
│     - Returns 401 if invalid                    │
├─────────────────────────────────────────────────┤
│  2. authorize(roles...)                         │
│     - Checks if req.user.role is in the         │
│       allowed roles list for this route         │
│     - Returns 403 if not authorized             │
├─────────────────────────────────────────────────┤
│  3. tenantIsolation()                           │
│     - Super Admin: no filter (sees all data)    │
│     - Others: sets req.tenantId = user's orgId  │
│     - All subsequent queries scoped by orgId    │
├─────────────────────────────────────────────────┤
│  4. validate(zodSchema)                         │
│     - Validates request body against Zod schema │
│     - Returns 400 with field-level errors       │
└─────────────────────────────────────────────────┘
      |
      v
Controller ──> Service (business logic) ──> MongoDB ──> JSON Response
      |
      v (on any error)
Centralized errorHandler ──> { success: false, error: "message" }
```

### 3. Multi-Tenancy & Data Isolation

The system uses **single database, shared collections** multi-tenancy. Every document carries an `organizationId` field that acts as the partition key.

```
Super Admin (admin@taskflow.com)
│   organizationId: null (not bound to any org)
│   Can query ALL data without orgId filter
│
├── Organization: Acme Corp (orgId: "abc123")
│   │
│   ├── Tenant Admin: admin@acme.com
│   │   organizationId: "abc123"
│   │   Queries auto-filtered: { organizationId: "abc123" }
│   │   Can see/manage only Acme's users and tasks
│   │
│   ├── User: john@acme.com
│   │   organizationId: "abc123"
│   │   Queries filtered: { assignedTo: john's userId }
│   │   Can ONLY see tasks assigned to him
│   │   Can ONLY change task status (not title/priority)
│   │
│   └── Tasks:
│       ├── "Set up CI/CD"    (orgId: "abc123", assignedTo: John)
│       └── "Write API docs"  (orgId: "abc123", assignedTo: Admin)
│
└── Organization: Globex Inc (orgId: "xyz789")
    │
    ├── Tenant Admin: admin@globex.com
    │   Cannot see any Acme data (enforced server-side)
    │
    └── User: jane@globex.com
        Cannot see any Acme data
```

**How isolation works in code:**
- Tenant Admin queries tasks: `Task.find({ organizationId: user.organizationId })`
- Regular User queries tasks: `Task.find({ assignedTo: user._id })`
- Super Admin queries tasks: `Task.find({})` (no filter)
- The frontend CANNOT override this - the backend always uses the logged-in user's own orgId

### 4. Role Hierarchy & Permissions

```
                 ┌──────────────┐
                 │ Super Admin  │  Global access, no org bound
                 └──────┬───────┘
                        │ manages
           ┌────────────┼────────────┐
           v                         v
  ┌────────────────┐       ┌────────────────┐
  │  Acme Corp     │       │  Globex Inc    │
  │  (Tenant)      │       │  (Tenant)      │
  └───────┬────────┘       └───────┬────────┘
          │                        │
  ┌───────┴────────┐       ┌───────┴────────┐
  │ Tenant Admin   │       │ Tenant Admin   │
  │ Manages own    │       │ Manages own    │
  │ org only       │       │ org only       │
  └───────┬────────┘       └───────┬────────┘
          │                        │
  ┌───────┴────────┐       ┌───────┴────────┐
  │ Users          │       │ Users          │
  │ Own tasks only │       │ Own tasks only │
  │ Status change  │       │ Status change  │
  └────────────────┘       └────────────────┘
```

| Action                  | Super Admin | Tenant Admin | User           |
|-------------------------|:-----------:|:------------:|:--------------:|
| Create Organization     | Yes         | No           | No             |
| View All Organizations  | Yes         | No           | No             |
| Create User (any org)   | Yes         | No           | No             |
| Create User (own org)   | Yes         | Yes          | No             |
| View Users (all orgs)   | Yes         | No           | No             |
| View Users (own org)    | Yes         | Yes          | No             |
| Create Task             | Yes         | Yes          | No             |
| Edit Task (all fields)  | Yes         | Yes          | No             |
| Change Task Status      | Yes         | Yes          | Yes (own only) |
| Delete Task             | Yes         | Yes          | No             |
| View Tasks (all)        | Yes         | No           | No             |
| View Tasks (own org)    | Yes         | Yes          | No             |
| View Tasks (assigned)   | Yes         | Yes          | Yes            |

### 5. Complete User Journey

```
Step 1: First user registers at /register
        └── System auto-assigns "super_admin" role (first user = Super Admin)

Step 2: Super Admin creates organizations
        └── POST /api/organizations { name: "Acme Corp" }
        └── POST /api/organizations { name: "Globex Inc" }

Step 3: Super Admin creates Tenant Admins
        └── POST /api/users { name: "Acme Admin", role: "tenant_admin", organizationId: "acme_id" }

Step 4: Tenant Admin (Acme) logs in
        └── Sees Dashboard with only Acme's task stats
        └── Sees Users page with only Acme's users
        └── Does NOT see Organizations page (hidden in sidebar)

Step 5: Tenant Admin creates regular users
        └── POST /api/users { name: "John Doe", role: "user" }
        └── organizationId auto-set to Acme (server-side, cannot choose other org)

Step 6: Tenant Admin creates and assigns tasks
        └── POST /api/tasks { title: "Fix CI/CD", priority: "high", assignedTo: "john_id" }
        └── organizationId auto-set to Acme

Step 7: John (regular user) logs in
        └── Dashboard shows stats for ONLY tasks assigned to John
        └── Tasks page shows ONLY tasks assigned to John
        └── John can change task status: To Do -> In Progress -> Done (inline dropdown)
        └── John CANNOT edit title, priority, or reassign tasks
        └── John CANNOT see Users or Organizations pages
        └── John CANNOT see other Acme users' tasks

Step 8: Globex users see NOTHING from Acme
        └── Complete data isolation at the database query level
```

### 6. Frontend State Management

```
Zustand Store (auth.store.ts)
├── user: { _id, name, email, role, organizationId }
├── token: JWT string
├── isAuthenticated: boolean
│
├── setAuth(user, token)  ──> Saves to store + localStorage
├── logout()              ──> Clears store + localStorage
└── hydrate()             ──> Reads localStorage on page load (restores session)

AuthGuard Component (wraps every protected page)
├── On mount: calls hydrate() to restore session from localStorage
├── If no token: redirects to /login
├── If authenticated: renders Sidebar + page content
└── Sidebar nav items filtered by user.role:
    - Super Admin sees: Dashboard, Tasks, Users, Organizations
    - Tenant Admin sees: Dashboard, Tasks, Users
    - User sees: Dashboard, Tasks

Axios Interceptor (lib/api.ts)
├── Request: auto-attaches Authorization header from localStorage
└── Response: on 401, clears localStorage and redirects to /login
```

### 7. End-to-End Example: Creating a Task

```
1. Tenant Admin clicks "New Task" button
        |
        v
2. TaskDialog opens -> fetches user list from GET /api/users?limit=100
   (dropdown shows user names, not IDs)
        |
        v
3. Admin fills form: title, description, status, priority, assigns to "John Doe"
        |
        v
4. Submit: POST /api/tasks
   Body: { title: "Fix CI/CD", priority: "high", assignedTo: "john_user_id" }
        |
        v
5. Backend middleware chain:
   authenticate() -> verify JWT, find user -> req.user = Acme Admin
   tenantIsolation() -> req.tenantId = "acme_org_id"
   validate() -> Zod checks: title exists, priority is valid enum
        |
        v
6. taskService.createTask():
   - Checks role: tenant_admin -> allowed
   - Sets organizationId = user.organizationId (NOT from request body)
   - Task.create({ ...data, organizationId: "acme_org_id", createdBy: admin_id })
        |
        v
7. MongoDB saves document -> returns created task
        |
        v
8. Response: { success: true, data: { _id, title, status, ... } }
        |
        v
9. Frontend: closes dialog, refreshes task list
        |
        v
10. John logs in -> sees "Fix CI/CD" in his task list
    -> changes status to "In Progress" via inline dropdown
    -> backend allows it (user can update status of own tasks)
```

### 8. Security Model

```
Layer 1: Authentication (WHO are you?)
  - JWT token required on every protected route
  - Token contains only user ID (role fetched from DB on each request)
  - Passwords hashed with bcrypt (12 salt rounds)
  - 401 if token missing, expired, or invalid

Layer 2: Authorization (WHAT can you do?)
  - authorize("super_admin", "tenant_admin") on route definitions
  - Blocks users before they reach business logic
  - 403 if role not in allowed list

Layer 3: Tenant Isolation (WHOSE data can you see?)
  - organizationId injected server-side on every query
  - Frontend cannot override - backend always uses user's own orgId
  - Super Admin bypasses this layer

Layer 4: Validation (IS the data valid?)
  - Zod schemas on every POST/PUT body
  - Type checking, required fields, enum validation
  - 400 with specific error messages

Layer 5: Business Logic Guards (edge cases)
  - Users can only update status of their own tasks
  - Tenant Admins cannot create super_admin users (blocks privilege escalation)
  - Users cannot delete themselves
  - Task edit verifies ownership before allowing changes
```

## Features Implemented

### Roles & Access Control
| Feature             | Super Admin | Tenant Admin | User |
|---------------------|:-----------:|:------------:|:----:|
| View all orgs       | Yes         | No           | No   |
| Manage orgs (CRUD)  | Yes         | No           | No   |
| View all users      | Yes         | Own org only | No   |
| Manage users        | Yes         | Own org only | No   |
| View tasks          | All         | Own org      | Own  |
| Create/edit tasks   | Yes         | Own org      | No   |
| Update task status  | Yes         | Own org      | Own  |
| Delete tasks        | Yes         | Own org      | No   |

### Backend
- JWT-based authentication (register/login)
- Role-based access control middleware
- Tenant isolation using `organizationId` on every query
- Zod request validation on all endpoints
- Centralized error handling with custom `AppError` class
- Paginated API responses with search & filtering
- Service layer pattern (controllers -> services -> models)

### Frontend
- Login / Register pages with split-panel layout
- Role-based dashboard with task statistics and progress bars
- Organization management (Super Admin only)
- User management with role assignment
- Task CRUD with inline status change for all users
- Filtering by status and priority with debounced search
- Pagination on all list views
- Responsive sidebar navigation (mobile + desktop)
- Modal forms for create/edit operations
- Dropdowns show human-readable names (not IDs)

### Task Schema
```json
{
  "title": "string",
  "description": "string",
  "status": "todo | in-progress | done",
  "priority": "low | medium | high",
  "assignedTo": "userId",
  "organizationId": "orgId",
  "createdBy": "userId",
  "createdAt": "date",
  "updatedAt": "date"
}
```

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, ShadCN UI, Zustand, Axios |
| Backend  | Node.js, Express, Mongoose, JWT, bcryptjs, Zod |
| Database | MongoDB Atlas (cloud) |

## Setup Steps

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone & Install

```bash
git clone <repo-url>
cd multi-tenant-tms

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```env
PORT=8000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/multi-tenant-tms?retryWrites=true&w=majority
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Seed Test Data

```bash
cd backend
npm run seed
```

This creates test accounts:

| Role         | Email              | Password |
|--------------|--------------------|----------|
| Super Admin  | admin@taskflow.com | admin123 |
| Tenant Admin | admin@acme.com     | admin123 |
| Tenant Admin | admin@globex.com   | admin123 |
| User         | john@acme.com      | user123  |
| User         | jane@globex.com    | user123  |

Plus 2 organizations (Acme Corp, Globex Inc) and 9 sample tasks.

### 4. Run the App

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

## API Endpoints

### Auth
| Method | Endpoint            | Description   | Auth Required |
|--------|---------------------|---------------|:---:|
| POST   | /api/auth/register  | Register user | No  |
| POST   | /api/auth/login     | Login         | No  |
| GET    | /api/auth/profile   | Get profile   | Yes |

### Organizations (Super Admin only)
| Method | Endpoint                      | Description   |
|--------|-------------------------------|---------------|
| POST   | /api/organizations            | Create org    |
| GET    | /api/organizations            | List orgs (paginated, searchable) |
| GET    | /api/organizations/:id        | Get org by ID |
| GET    | /api/organizations/:id/stats  | Get org stats |
| PUT    | /api/organizations/:id        | Update org    |
| DELETE | /api/organizations/:id        | Delete org    |

### Users (Admins only)
| Method | Endpoint          | Description    |
|--------|-------------------|----------------|
| POST   | /api/users        | Create user    |
| GET    | /api/users        | List users (paginated, searchable) |
| GET    | /api/users/:id    | Get user by ID |
| PUT    | /api/users/:id    | Update user    |
| DELETE | /api/users/:id    | Delete user    |

### Tasks (Role-scoped)
| Method | Endpoint           | Description    |
|--------|--------------------|----------------|
| POST   | /api/tasks         | Create task    |
| GET    | /api/tasks         | List tasks (paginated, filterable) |
| GET    | /api/tasks/stats   | Task statistics |
| GET    | /api/tasks/:id     | Get task by ID |
| PUT    | /api/tasks/:id     | Update task    |
| DELETE | /api/tasks/:id     | Delete task    |

**Query params for GET /api/tasks:** `page`, `limit`, `search`, `status`, `priority`, `assignedTo`, `organizationId`

## Sample API Requests

### Register
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"admin123"}'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@taskflow.com","password":"admin123"}'
```

### Create Organization
```bash
curl -X POST http://localhost:8000/api/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Acme Corp","description":"A test organization"}'
```

### Create Task
```bash
curl -X POST http://localhost:8000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Setup CI/CD","priority":"high","organizationId":"ORG_ID","assignedTo":"USER_ID"}'
```

### Get Tasks with Filters
```bash
curl "http://localhost:8000/api/tasks?status=todo&priority=high&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database connection & env config
│   ├── controllers/     # Route handlers (auth, org, user, task)
│   ├── middleware/       # Auth, RBAC, tenant isolation, validation, error handler
│   ├── models/          # Mongoose schemas (User, Task, Organization)
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic layer
│   ├── utils/           # Zod validators, AppError class, response helpers
│   ├── seed.js          # Database seeder with test data
│   └── server.js        # Express app entry point
├── .env
└── package.json

frontend/
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── dashboard/   # Stats dashboard (role-based)
│   │   ├── login/       # Login page (split-panel layout)
│   │   ├── register/    # Registration page
│   │   ├── tasks/       # Task management (CRUD + inline status change)
│   │   ├── users/       # User management
│   │   └── organizations/ # Organization management (Super Admin)
│   ├── components/
│   │   ├── layout/      # Sidebar, AuthGuard, PageHeader, Pagination
│   │   ├── tasks/       # TaskDialog (create/edit modal)
│   │   ├── users/       # UserDialog
│   │   ├── organizations/ # OrgDialog
│   │   └── ui/          # ShadCN UI components
│   ├── hooks/           # useApi, usePagination (reusable)
│   ├── lib/             # Axios API client with interceptors
│   ├── store/           # Zustand auth store
│   └── types/           # TypeScript type definitions
├── .env.local
└── package.json
```

## Assumptions

- **First registered user** automatically becomes Super Admin (no manual setup needed)
- **Tenant Admins** are created by Super Admin or during registration with an organization name
- **Regular Users** can update the **status** of tasks assigned to them via inline dropdown (not title, priority, etc.)
- **Tenant isolation** is enforced at the service layer - Tenant Admins and Users can never access data from other organizations, even via direct API calls
- **MongoDB Atlas** is used as the database (cloud-hosted, deployment-ready)
- **Passwords** are hashed with bcrypt (12 salt rounds) before storage
- **JWT tokens** expire after 7 days

## What Could Be Added (Skipped for scope)

- Unit & integration tests (Jest/Supertest)
- Password reset / forgot password flow
- Email verification on registration
- Real-time updates via WebSockets
- Task comments and activity log
- File attachments on tasks
- Rate limiting on API endpoints
- Docker setup for containerized deployment
- CI/CD pipeline configuration
