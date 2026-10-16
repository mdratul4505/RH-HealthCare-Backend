# 🏥 PH Healthcare System — Backend REST API

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?style=for-the-badge&logo=vercel)](https://rh-healthcare-backend.vercel.app)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-5.x-lightgrey?style=for-the-badge&logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-7.x-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis)](https://redis.io/)

> **Live Production API:** [https://rh-healthcare-backend.vercel.app](https://rh-healthcare-backend.vercel.app)  
> **API Health Check:** [https://rh-healthcare-backend.vercel.app/](https://rh-healthcare-backend.vercel.app/)

---

## 📌 Overview

**PH Healthcare System** is a full-featured, enterprise-grade telehealth backend platform that bridges patients and medical specialists for online consultations. 

The system provides end-to-end appointment workflows: patients discover available doctor schedules, book 20-minute slots, process online payments, and receive automated PDF invoices and digital prescriptions. Doctors manage published schedules, consult with patients over video links, and issue digital prescriptions. Admins and Super Admins manage the platform's doctors, patients, and administrative staff under strict role hierarchies.

---

## 🚀 Core Features

### 1. Multi-Role Authentication & Access Control
- **4 Distinct Roles:** `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, and `PATIENT`.
- **JWT Authentication:** Short-lived access tokens (`1d`) and refresh tokens (`7d`) stored in secure cookies and returned in JSON response bodies.
- **Email OTP Verification:** 6-digit OTP verification powered by Nodemailer for patient credential registrations and prospective doctor applications.
- **Google OAuth:** Seamless Google sign-in exclusively for patients (linked by email to credential accounts).
- **Password Workflows:**
  - **Forgot / Reset Password:** Two-step OTP-verified password reset.
  - **Change Password:** Logged-in password update.
  - **Set Password:** Google-authenticated patients can set an initial password to enable credential login.

### 2. Admin & Super Admin Management
- **Role Hierarchy Enforcement:**
  - Both Admins and Super Admins can approve/reject doctor applications, block/unblock doctors, block/unblock patients, and create new Admins.
  - **Super Admin Exclusive:** Creating new Super Admins, blocking/unblocking Admins, and blocking/unblocking Super Admins.
- **Invitation Flow:** Admins are provisioned with an organization email and personal email. A secure temporary password is automatically generated and emailed to the person's inbox with a prompt to change it upon first login.

### 3. Doctor Application & Verification Flow
- Prospective doctors submit applications with BMDC license numbers, qualifications, experience, and specialization.
- Doctor accounts require email OTP verification and remain in `PENDING` state until formally reviewed and approved by an Admin or Super Admin.
- Automated email notification is dispatched when a doctor application is approved or rejected.
- Unapproved doctor applications are prevented from logging in.
- Automated cron job cleans up unverified doctor applications periodically.

### 4. Doctor Schedule Management
- **One Schedule Per Day:** A doctor can have at most one schedule per calendar date.
- **Strict Duration Bounds:** Schedules must be between **3 hours** (minimum) and **8 hours** (maximum) and cannot cross calendar days.
- **Auto-Slotting Engine:** Time ranges are automatically partitioned into uniform **20-minute consultation slots**.
- **State-Based Locking:**
  - Date is locked immediately upon publishing.
  - Time range locks once the first slot is booked to preserve serial integrity.
  - Meet links and statuses can be updated at any time.

### 5. Patient Appointment Booking & Discovery
- **Availability Window:** Patients can only see and book today's published schedules prior to their start time.
- **FIFO Serial Numbers:** Bookings are assigned consecutive serial numbers (`1, 2, 3...`) corresponding to consultation order.
- **Automatic PDF Invoicing:** Successful bookings generate a professional PDF invoice dispatched directly to the patient's email.
- **Cancellation Policy:** Patients can cancel appointments up to 2 hours before schedule start time, which automatically updates slot availability.

### 6. Payments & Invoicing
- **bKash Tokenized Checkout:** Sandbox and production payment gateway integration for appointment payments.
- **PDFKit Engine:** Server-side generated invoice PDFs containing appointment details, transaction IDs, doctor info, and meeting links.

### 7. Performance & High Availability
- **Redis Caching:** Distributed caching layer for fast schedule queries and temporary OTP storage.
- **Graceful In-Memory Fallback:** Resilient in-memory cache fallback prevents server downtime if the external Redis host becomes unreachable.

---

## 🏗️ Architecture & Database Schema

```mermaid
erDiagram
    User ||--o| Admin : "has (1-to-1)"
    User ||--o| Doctor : "has (1-to-1)"
    User ||--o| Patient : "has (1-to-1)"
    Doctor ||--o{ Schedule : "publishes (1-to-many)"
    Schedule ||--o{ Appointment : "contains (1-to-many)"
    Patient ||--o{ Appointment : "books (1-to-many)"
    Appointment ||--o| Payment : "has (1-to-1)"
    Appointment ||--o| Prescription : "receives (1-to-1)"

    User {
        string id PK
        string email UK
        string password
        Role role
        UserStatus status
        boolean emailVerified
        boolean needPasswordChange
    }

    Doctor {
        string id PK
        string email UK
        string name
        string licenseNumber UK
        DoctorVerificationStatus verificationStatus
        string specialization
        int experienceYears
    }

    Schedule {
        string id PK
        string doctorId FK
        datetime startDateTime
        datetime endDateTime
        ScheduleStatus status
        int totalSlots
        int availableSlots
        string videoCallLink
    }

    Appointment {
        string id PK
        string patientId FK
        string scheduleId FK
        int serialNumber
        AppointmentStatus status
    }
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Runtime & Language** | Node.js (v20+), TypeScript 5.x |
| **Framework** | Express.js 5.x |
| **Database & ORM** | PostgreSQL, Prisma ORM 7.x (`@prisma/adapter-pg`) |
| **Caching Layer** | Redis (`ioredis` / `redis` v6) + Custom In-Memory Fallback |
| **Authentication** | JWT (`jsonwebtoken`), `bcryptjs`, Google Auth Library |
| **Validation** | Zod (v4) schema validation |
| **Email Service** | Nodemailer (Gmail SMTP) with EJS HTML templates |
| **Media & Storage** | Cloudinary (Multer file upload) |
| **Document Generation** | PDFKit |
| **Payments** | bKash Payment Gateway |
| **Deployment** | Vercel Serverless Functions (`@vercel/node`) |

---

## 📡 API Endpoints

### 🔐 Authentication Module (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register a new patient account |
| `POST` | `/login` | Public | Login with email and password |
| `POST` | `/google-login` | Public | Patient login/register with Google token |
| `POST` | `/verify-otp` | Public | Verify registration email OTP |
| `POST` | `/resend-otp` | Public | Resend registration OTP email |
| `POST` | `/forgot-password` | Public | Send password reset OTP |
| `POST` | `/reset-password` | Public | Verify OTP and set new password |
| `POST` | `/change-password` | Logged In | Change password with current password |
| `POST` | `/set-password` | Patient Only | Set initial password for Google users |
| `POST` | `/refresh-token` | Public | Refresh expired access token |
| `GET` | `/me` | Logged In | Get profile of logged-in user |

### 👨‍💼 Admin & User Management (`/api/v1/user`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/create-admin` | Admin, Super Admin | Create new Admin with generated password |
| `POST` | `/create-super-admin` | Super Admin Only | Create new Super Admin account |
| `PATCH` | `/status/:userId` | Admin, Super Admin | Block/Unblock user (role hierarchy enforced) |
| `GET` | `/admins` | Admin, Super Admin | Retrieve list of all administrators |
| `GET` | `/patients` | Admin, Super Admin | Retrieve list of all registered patients |
| `PATCH` | `/admin-profile` | Admin, Super Admin | Update own admin profile details |

### 🩺 Doctor Management (`/api/v1/doctor`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/apply` | Public | Apply to become a doctor |
| `POST` | `/verify-doctor` | Public | Verify doctor application OTP |
| `GET` | `/` | Public | Browse approved doctors (search & filters) |
| `GET` | `/applications` | Admin, Super Admin | View pending doctor applications |
| `PATCH` | `/review/:id` | Admin, Super Admin | Approve or reject a doctor application |
| `PATCH` | `/profile` | Doctor Only | Update doctor profile details |

### 📅 Doctor Schedule Module (`/api/v1/schedule`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/` | Doctor Only | Create schedule (3–8 hrs, 20-min slots) |
| `GET` | `/my-schedules` | Doctor Only | Retrieve logged-in doctor's schedules |
| `GET` | `/available-today` | Patient Only | View today's open schedules before start time |
| `PATCH` | `/:id` | Doctor Only | Edit schedule (respecting published/booked locks) |
| `DELETE` | `/:id` | Doctor Only | Delete an unbooked draft schedule |

### 📋 Appointments & Prescriptions (`/api/v1/appointment`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/book` | Patient Only | Book a slot on a visible schedule |
| `GET` | `/my-appointments` | Patient, Doctor | List user's booked appointments |
| `PATCH` | `/cancel/:id` | Patient Only | Cancel appointment (allowed > 2 hrs before start) |
| `POST` | `/prescription` | Doctor Only | Create digital prescription for patient |
| `GET` | `/prescription/:id` | Patient, Doctor | View appointment prescription |

### 💳 Payments (`/api/v1/payment`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/create-payment` | Patient Only | Initiate bKash checkout for appointment |
| `POST` | `/execute-payment` | Patient Only | Complete bKash payment & generate PDF invoice |

---

## ⚙️ Environment Variables

Create a `.env` file in the project root with the following keys:

```env
NODE_ENV=production
PORT=5000

# Database Connection (Prisma Postgres / PostgreSQL)
DATABASE_URL="postgres://username:password@host:5432/dbname?sslmode=require"

# JWT Configuration
JWT_ACCESS_SECRET="your-super-secret-access-token-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key"
JWT_ACCESS_EXPIRES_IN="1d"
JWT_REFRESH_EXPIRES_IN="7d"
BCRYPT_SALT_ROUNDS=10

# URLs
BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# Default Seed Accounts
SUPER_ADMIN_NAME="Super Admin"
SUPER_ADMIN_EMAIL="superadmin@gmail.com"
SUPER_ADMIN_PASSWORD="Super@admin12345"

TESTER_ADMIN_NAME="Tester Admin"
TESTER_ADMIN_EMAIL="testeradmin@gmail.com"
TESTER_ADMIN_PASSWORD="Tester@admin12345"

TESTER_DOCTOR_NAME="Tester Doctor"
TESTER_DOCTOR_EMAIL="testerdoctor@gmail.com"
TESTER_DOCTOR_PASSWORD="Tester@doctor12345"

# Redis Cache
REDIS_USER="default"
REDIS_PASSWORD="your-redis-password"
REDIS_HOST="your-redis-host.cloud.redislabs.com"
REDIS_PORT=6379

# Email Service (Gmail SMTP)
SMTP_USER="your-email@gmail.com"
EMAIL_SENDER="your-email@gmail.com"
SMTP_PASSWORD="your-google-app-password"

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# bKash Payment Gateway
BKASH_BASE_URL="https://tokenized.sandbox.bka.sh/v1.2.0-beta"
BKASH_USERNAME="sandboxTokenizedUser02"
BKASH_PASSWORD="sandboxTokenizedUser02@12345"
BKASH_APP_KEY="your-bkash-app-key"
BKASH_APP_SECRET="your-bkash-app-secret"
BKASH_CALLBACK_URL="http://localhost:5000/api/v1"
```

---

## 💻 Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/mdratul4505/RH-HealthCare-Backend.git
cd RH-HealthCare-Backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Generate Prisma Client & Sync Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Start Development Server
```bash
npm run dev
```

The server will automatically connect to PostgreSQL, Redis, and Nodemailer, seed the initial Super Admin and tester accounts, and start listening on port `5000`:
```
Connected to the database successfully.
Connected to remote Redis successfully.
Nodemailer Connected Successfully.
Server is running on port 5000
```

---

## 🧪 Default Test Credentials

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `superadmin@gmail.com` | `Super@admin12345` |
| **Tester Admin** | `testeradmin@gmail.com` | `Tester@admin12345` |
| **Tester Doctor** | `testerdoctor@gmail.com` | `Tester@doctor12345` |

---

## 🌐 Production Deployment

This project is deployed to **Vercel Serverless Functions**:

- **Production URL:** [https://rh-healthcare-backend.vercel.app](https://rh-healthcare-backend.vercel.app)
- **Deployment Configuration:** Managed via [`vercel.json`](./vercel.json) using `@vercel/node` with serverless entry at `dist/server.js`.
- **Build Step:** `prisma generate && tsup` compiles TypeScript modules into an optimized serverless bundle.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
