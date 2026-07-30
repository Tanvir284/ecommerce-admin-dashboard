# Ecommerce Admin Dashboard

> Repository: https://github.com/Tanvir284/ecommerce-admin-dashboard

A complete, enterprise-grade **Ecommerce Admin Dashboard** backend and frontend system built for Trends Bird Limited Backend Developer Intern assignment.

## 🚀 Key Features & Architectural Highlights

1. **Complete Implementation**: All **9 Modules** built end-to-end (Authentication, Permission, Role, User, Media, Category, Brand, Attribute, Product).
2. **Access Control & RBAC (25%)**:
   - Global `JwtAuthGuard` enforcing token authentication across every route by default (Public routes explicitly opt out via `@Public()`).
   - `PermissionGuard` checking route permissions against the flat list of permissions held by the user's assigned role.
   - Standardized `401 Unauthorized` on missing/expired/inactive accounts and `403 Forbidden` on insufficient permissions.
   - Standardized error and success shapes produced centrally without leaking raw database traces or internal paths.
3. **Domain Modeling & Complex Product Catalog**:
   - **Simple Products**: Top-level price, sale price, stock count, SKU validation (sale price $\le$ price).
   - **Variable Products**: Variants with unique SKUs, price, sale price, stock count, and attribute combinations matrix.
   - **Atomic Transactions**: Multi-table product writes wrapped inside Prisma `$transaction`. If variants fail validation, no partial data survives.
   - **Category Tree & Cycle Rejection**: Unlimited depth nested category tree with recursive ancestor checking to reject cycles.
   - **Shared Media Library**: Uploaded files with mime validation, Sharp thumbnail generation, and clean detachment strategies.
4. **Token Management & Security**:
   - JWT Access Token (15m expiration) + Long-lived Refresh Token (7d expiration).
   - Server-side Refresh Token database storage enabling real revocation on logout and single-use rotation.
   - Password hashing using `bcrypt`.
   - Self-escalation protection: Users cannot change their own role or permissions.

---

## 🛠️ Technology Requirements & Environment

| Area | Choice | Description |
| --- | --- | --- |
| **Database** | PostgreSQL | Running locally on port `5433` (DB: `ecommerce_admin`) |
| **Runtime** | Node.js | v24.11.0 (LTS compatible) |
| **Backend Framework** | NestJS + TypeScript | NestJS v10 REST API |
| **Data Access** | Prisma ORM | Automated migrations and seed scripts |
| **Auth** | JWT + Refresh Token Rotation | Bearer Token strategy with server-side revocation |
| **Frontend** | React + Vite + Tailwind CSS | Permission-driven UI with Lucide React icons |

---

## 🔑 Seeded Account Credentials

The repository includes an automated seed script (`npm run seed` in `backend/`).

### 1. Super Administrator (Full Access)
- **Email**: `admin@admin.com`
- **Password**: `Admin123!`
- **Capabilities**: Holds all 41 system permissions across all 9 modules.

### 2. Catalog Manager (Deliberately Limited 403 Test User)
- **Email**: `catalog@admin.com`
- **Password**: `Catalog123!`
- **Capabilities**: Holds catalog permissions (`category:*`, `brand:*`, `attribute:*`, `product:*`, `media:*`, `dashboard:watch`). Has **NO** access to Permission, Role, or User management modules. Useful for testing **403 Forbidden** behavior.

---

## 📦 Setup & Execution Guide

### Prerequisites
- Node.js installed (`node -v` $\ge$ 18)
- PostgreSQL installed and running (or configured via `.env`)

### Backend Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure Environment (.env already provided)
# DATABASE_URL="postgresql://postgres@localhost:5433/ecommerce_admin?schema=public"

# 3. Synchronize Database Schema with Prisma
npm run prisma:push

# 4. Seed Database (Permissions, Roles, Admin & Limited Users)
npm run seed

# 5. Build & Start NestJS Backend Server
npm run build
npm run start:dev
```
Backend API will be running at `http://localhost:3000`.

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start Vite Frontend Dev Server
npm run dev
```
Frontend Dashboard will be running at `http://localhost:5173`.

---

## 📋 Module Completion Status

| # | Module Name | Permission Prefix | Status | Features Built |
| --- | --- | --- | --- | --- |
| 1 | **Authentication** | — | **Complete** | Login, JWT access (15m) + refresh token (7d), rotation, session `/auth/me`, real server-side logout. |
| 2 | **Permission** | `permission` | **Complete** | Grouping by module, bulk group creation with standard/custom actions, lower-case normalization, cascaded safe deletes. |
| 3 | **Role** | `role` | **Complete** | Role creation with module-by-action grid, grant-all shortcut, user count display, refusal to delete if users assigned, protection against stripping `role:update` from last holding role. |
| 4 | **User** | `user` | **Complete** | User account CRUD, required role selection, active/inactive toggle, self-escalation guard, hard deletion. |
| 5 | **Media** | `media` | **Complete** | Single & multi file upload, mime validation, Sharp thumbnail generation, library grid, search & type filter, metadata edit, file & record deletion with clean detachment. |
| 6 | **Category** | `category` | **Complete** | Unlimited depth category tree builder, parent selector, unique database slug, cycle detection on set parent, deletion refusal if children/products exist. |
| 7 | **Brand** | `brand` | **Complete** | Brand CRUD, logo attachment from media library, unique name and slug, status filter, deletion refusal if products reference brand. |
| 8 | **Attribute** | `attribute` | **Complete** | Attribute CRUD (Dropdown, Radio, Checkbox, Colour Swatch, Image Swatch), unique value per attribute, hex color swatch picker, deletion refusal if value used in product variants. |
| 9 | **Product** | `product` | **Complete** | Simple vs Variable product distinction, variant matrix generator, SKU/slug uniqueness, price/salePrice/stock validation, media & thumbnail selection, atomic transaction writes (`$transaction`). |

---

## 🐞 Known Issues

- **None**: All 9 modules build, run, and pass all validation and RBAC specifications.
