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
- Login / Register pages
- Role-based dashboard with task statistics
- Organization management (Super Admin only)
- User management with role assignment
- Task CRUD with assignment to users
- Filtering by status and priority
- Search across tasks/users/organizations
- Pagination on all list views
- Responsive sidebar navigation (mobile + desktop)
- Modal forms for create/edit operations

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
│   │   ├── login/       # Login page
│   │   ├── register/    # Registration page
│   │   ├── tasks/       # Task management (CRUD + filters)
│   │   ├── users/       # User management
│   │   └── organizations/ # Organization management
│   ├── components/
│   │   ├── layout/      # Sidebar, AuthGuard
│   │   ├── tasks/       # TaskDialog (create/edit modal)
│   │   ├── users/       # UserDialog
│   │   ├── organizations/ # OrgDialog
│   │   └── ui/          # ShadCN UI components
│   ├── hooks/           # useApi, usePagination (reusable)
│   ├── lib/             # Axios API client, utilities
│   ├── store/           # Zustand auth store
│   └── types/           # TypeScript type definitions
├── .env.local
└── package.json
```

## Assumptions

- **First registered user** automatically becomes Super Admin (no manual setup needed)
- **Tenant Admins** are created by Super Admin or during registration with an organization name
- **Regular Users** can only update the **status** of tasks assigned to them (not title, priority, etc.)
- **Tenant isolation** is enforced at the service layer - Tenant Admins and Users can never access data from other organizations
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
