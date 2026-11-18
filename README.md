# Examination Management Portal V2 (EMP-V2)

Examination Management Portal V2 (EMP-V2) is a full-stack, enterprise-grade educational examination coordination and evaluation web application built for the **IIT Madras BS Degree in Data Science and Applications** (Course: **Modern Application Development II - MAD-II**).

The system manages the entire examination lifecycle from course and exam definition, rubric creation, examiner assignment, and slot scheduling, through student booking, rubric-based evaluation, result publication, asynchronous CSV reporting, Redis caching, and interactive Chart.js analytics.

---

## Architecture & Technology Stack

### Backend
- **Framework**: Python 3.14 / Flask (Application Factory pattern with Blueprints)
- **Database / ORM**: SQLite (`emp_v2.db`) via Flask-SQLAlchemy
- **Authentication & RBAC**: Flask-JWT-Extended (Role-Based Access Control: Admin, Examiner, Student)
- **Async Task Queue**: Celery with Redis broker and result backend (`redis-py`)
- **Caching**: Direct Redis caching with `X-Cache: HIT / MISS` telemetry
- **Email Dispatch**: Standard library `smtplib` and `email.message` with failsafe fallback logging (`outbox.log`)
- **Prohibited Libraries Strictly Excluded**: *Flask-RESTful, Marshmallow, Flask-Migrate, Flask-Security, Flask-Mail, Flask-Caching, Flask-CORS, requests, Pinia, Tailwind, jQuery, Docker.*

### Frontend
- **Framework**: Vue 3 (Options API, global production build, zero bundler/Vite/webpack overhead)
- **Routing**: Vue Router 4 (Hash mode: `#/route`)
- **Styling**: Bootstrap 5.3 CSS + Minimal custom CSS overrides
- **Visual Analytics**: Chart.js 4 (Bar, Doughnut, Line charts)
- **PWA**: Web App Manifest (`manifest.json`) + Service Worker (`sw.js`) for offline shell caching and home-screen installability
- **Template Engine**: Single Jinja2 entry point serving `templates/index.html`

---

## Directory Layout

```text
mad2-pro/
├── README.md                          # Comprehensive documentation & viva guide
├── requirements.txt                   # Frozen Python dependencies
├── .gitignore                         # Excludes virtual environments, SQLite WAL, caches
├── app.py                             # Flask application factory & blueprint registration
├── config.py                          # Environment settings, JWT, Redis, and Mail configurations
├── extensions.py                      # SQLAlchemy and JWTManager singletons
├── models.py                          # Relational data schema (8 normalized tables)
├── helpers.py                         # RBAC @role_required, Redis cache wrappers, email sender
├── tasks.py                           # Celery app, periodic beat schedules, and async CSV export
├── seed_demo.py                       # Standalone demo data seeder for viva evaluation
├── outbox.log                         # Email transmission audit log
├── exports/                           # Destination folder for asynchronous Celery CSV exports
├── templates/
│   └── index.html                     # Single Jinja2 entry point serving the Vue 3 SPA
├── static/
│   ├── css/
│   │   └── style.css                  # Custom responsive overrides and transitions
│   ├── img/
│   │   ├── icon-192.png               # PWA app icon (192x192)
│   │   └── icon-512.png               # PWA app icon (512x512)
│   ├── vendor/                        # Vendored offline JS/CSS assets (Zero CDN dependence)
│   │   ├── bootstrap.min.css
│   │   ├── bootstrap.bundle.min.js
│   │   ├── vue.global.prod.js
│   │   ├── vue-router.global.prod.js
│   │   └── chart.umd.min.js
│   ├── js/
│   │   ├── api.js                     # Centralized Fetch API client with Bearer JWT
│   │   ├── app.js                     # Vue Router setup, navigation guards, route mappings
│   │   └── components/                # Modular Vue 3 Options API components
│   │       ├── Navbar.js              # Role-aware navigation bar
│   │       ├── Login.js               # JWT login screen with role redirection
│   │       ├── Register.js            # Student registration screen
│   │       ├── AdminDashboard.js      # Metrics, Chart.js charts, Celery job triggers
│   │       ├── AdminCourses.js        # Course CRUD
│   │       ├── AdminExams.js          # Exam lifecycle, timelines, rubrics CRUD, publishing
│   │       ├── AdminExaminers.js      # Examiner provisioning, activation toggle, reset pass
│   │       ├── AdminStudents.js       # Student directory, search, block/unblock toggle
│   │       ├── AdminSlots.js          # Cross-examiner slot oversight & reassignment
│   │       ├── AdminBookings.js       # Cross-student booking oversight & rescheduling
│   │       ├── ExaminerDashboard.js   # Examiner metrics & assigned exam cards
│   │       ├── ExaminerExams.js       # Examiner assigned exams overview
│   │       ├── ExaminerSlots.js       # Slot creation & roster of booked candidates
│   │       ├── ExaminerEvaluate.js    # Rubric scoring, total calculation, marks lock
│   │       ├── StudentDashboard.js    # Candidate bookings summary & active notifications
│   │       ├── StudentProfile.js      # Candidate profile view & department update
│   │       ├── StudentExams.js        # Browse open exams & available slots booking
│   │       └── StudentHistory.js      # Booking history, published grades, Celery CSV export
│   ├── manifest.json                  # PWA metadata & display modes
│   └── sw.js                          # Service Worker for offline shell caching
└── routes/
    ├── auth.py                        # /api/auth/* (register, login, me)
    ├── admin.py                       # /api/admin/* (courses, exams, rubrics, examiners, students, slots, analytics)
    ├── examiner.py                    # /api/examiner/* (assigned exams, slots CRUD, evaluation)
    └── student.py                     # /api/student/* (profile, browse exams, book, cancel, export)
```

---

## Role-Based Feature Highlights

### 1. Administrator (`admin@emp.com`)
- **Dashboard & Analytics**: Real-time KPI counters + 3 dynamic Chart.js visualizations (Candidate Participation Bar Chart, Pass/Fail Doughnut Chart, Monthly Booking Trends Line Chart).
- **Course CRUD**: Create, edit, search, and delete academic courses.
- **Examination Lifecycle**: Transition exams across strict states: `Draft` $\rightarrow$ `Slot Creation` $\rightarrow$ `Booking Open` $\rightarrow$ `Closed` $\rightarrow$ `Completed`.
- **Rubrics Management**: Configure granular criteria with maximum marks and weightages per examination.
- **Examiner Provisioning**: Add examiners; automatically generates secure 8-character temporary passwords and dispatches notification emails; toggle active status.
- **Student Directory**: Search students; view booking history; toggle block/active status to prevent restricted students from booking.
- **Exceptional Rescheduling**: Reassign a student's booking to another available slot of the same exam without losing records.
- **Examiner Reassignment**: Reassign an existing slot and its booked candidates to another assigned examiner.
- **Results Publication**: One-click results publishing locks all evaluations from further tampering and reveals marks and feedback to students.
- **Celery Manual Triggers**: Directly dispatch background batch jobs from the UI for viva evaluation.

### 2. Examiner (`prof.sharma@emp.com`, `prof.anand@emp.com`)
- **Dashboard**: Track assigned examinations, upcoming scheduled slots, and pending evaluations.
- **Slot Management**: Create interview time slots with custom duration and capacity **strictly during the `Slot Creation` phase**. Update or delete unbooked slots.
- **Roster & Candidates**: View real-time booked students per slot with student names, emails, and phone numbers.
- **Rubric-Based Evaluation**: Grade students on a rubric-by-rubric breakdown, add qualitative remarks, auto-calculate totals, and mark slots as completed (auto-completing the examination when all slots finish).

### 3. Student (`student1@study.iitm.ac.in`, etc.)
- **Profile Management**: View account details and update phone/department information.
- **Browse Open Examinations**: View exams in `Booking Open` state with real-time seat availability.
- **Slot Booking**: Book an interview slot (strictly enforces **one active booking per examination**; atomic seat decrement).
- **Cancellation**: Cancel bookings prior to the deadline, atomically reclaiming the seat for other peers.
- **Results & History**: Review past bookings; view rubric score breakdowns and examiner feedback once results are published.
- **Asynchronous CSV Export**: Request full booking and evaluation history export via a background Celery task; poll status and download the generated CSV.

---

## Setup & Execution Guide

### 1. Environment Preparation
```powershell
# Open terminal in project root
cd "C:\Users\S.M.Suhail Akthar\Desktop\Documents\IITM BS Degree\Diploma Level Stuffs\Diploma in Programming\MAD2-Pro\CodeBase"

# Create and activate virtual environment
py -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

### 2. Start Redis Server
Redis is required for API caching and Celery queues. Ensure Redis is listening on port `6379`.
- **Windows Native / Memurai**: Launch `memurai.exe` or `redis-server.exe`.
- **WSL (Ubuntu)**: `wsl sudo service redis-server start`
- **Docker**: `docker run -d -p 6379:6379 --name emp-redis redis:alpine`

### 3. Seed Demo Data for Viva
Populate the database with pre-configured courses, examinations across all lifecycle states, examiners, students, bookings, and evaluations:
```powershell
.\venv\Scripts\python.exe seed_demo.py
```

### 4. Run Flask Application
```powershell
.\venv\Scripts\python.exe app.py
```
Open your browser and navigate to: `http://localhost:5000`

### 5. Run Celery Worker (Windows)
> **Crucial for Windows**: Always supply `-P solo` because the default prefork process pool is not supported on Windows.
```powershell
.\venv\Scripts\celery.exe -A tasks.celery worker -l info -P solo
```

### 6. Run Celery Beat Scheduler (Periodic Tasks)
```powershell
.\venv\Scripts\celery.exe -A tasks.celery beat -l info
```

---

## Pre-Seeded Demonstration Credentials

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@emp.com` | `Admin@123` | System Administrator |
| **Examiner 1** | `prof.sharma@emp.com` | `Examiner@123` | Dr. Ramesh Sharma (Computer Science) |
| **Examiner 2** | `prof.anand@emp.com` | `Examiner@123` | Dr. Kavita Anand (Data Science) |
| **Student 1** | `student1@study.iitm.ac.in` | `Student@123` | Aarav Kumar (Evaluated: 93/100, Passed) |
| **Student 2** | `student2@study.iitm.ac.in` | `Student@123` | Bhavna Patel (Evaluated: 32/100, Needs Improvement) |
| **Student 3** | `student3@study.iitm.ac.in` | `Student@123` | Chetan Singh (Active Booking in Python Viva) |

---

## Background Jobs & Caching Architecture

### Redis Caching with `X-Cache` Telemetry
Endpoints utilize Redis key-value caching with automatic cache invalidation upon mutations:
- `GET /api/admin/exams` $\rightarrow$ Cache key: `admin:exams` (Invalidated on exam CRUD / status changes)
- `GET /api/student/exams` $\rightarrow$ Cache key: `student:exams` (Invalidated on bookings / cancellations)
- `GET /api/admin/analytics` $\rightarrow$ Cache key: `admin:analytics` (60s TTL)
- Inspect cache telemetry: `curl.exe -i http://localhost:5000/api/admin/analytics -H "Authorization: Bearer <TOKEN>"` returns `X-Cache: HIT` or `X-Cache: MISS`.

### Periodic Celery Tasks
1. **Daily Slot Reminder (`daily_reminder_job`)**:
   - Scheduled every morning at **08:00 IST**.
   - Queries all bookings with slots scheduled for tomorrow and emails candidates their exam schedule and meeting link.
2. **Monthly Performance Summary (`monthly_report_job`)**:
   - Scheduled on the **1st of every month at 09:00 IST**.
   - Compiles an HTML report detailing total courses, exams, active bookings, completed evaluations, and pass rates, and emails it to `admin@emp.com`.
3. **User-Triggered CSV Export (`export_student_history_job`)**:
   - Asynchronously generates an official CSV file in `exports/` containing: `Student ID, Examination Name, Course, Examination Date, Examiner, Marks Obtained, Booking Status`.
   - Polled via `/api/student/export/<task_id>` and downloaded via authenticated download endpoint.

---

## Step-by-Step Viva Demonstration Walkthrough

Follow this scripted walkthrough during your viva to highlight every rubric requirement smoothly:

### Step 1: Admin Workflow & Chart.js Analytics
1. Log in as `admin@emp.com` / `Admin@123`.
2. Inspect the **Admin Dashboard**:
   - Note the real-time KPI counter cards.
   - Show the **Chart.js Visualizations**: Bar chart (Candidate Bookings per Examination), Doughnut chart (Pass vs Fail), and Line chart (Monthly Booking Volume Trends).
3. Navigate to **Exams & Rubrics** (`#/admin/exams`):
   - Review examinations in different statuses: `Draft`, `Slot Creation`, `Booking Open`, `Closed`, `Completed`.
   - Click **Manage Rubrics** on *MAD-II Capstone Project Viva* to show criteria max marks and weightages.
   - Show the **Publish Results** badge.
4. Navigate to **Examiners** (`#/admin/examiners`):
   - Show the provisioning interface. Demonstrate creating an examiner and show the password dispatch logged in `outbox.log`.
5. Demonstrate **Exceptional Actions**:
   - Navigate to **Bookings & Reschedule** (`#/admin/bookings`). Show how an admin can reschedule any candidate's booking to another slot.
   - Navigate to **Slots Oversight** (`#/admin/slots`). Show how an admin can reassign a slot to another examiner.

### Step 2: Examiner Workflow & Rubric Evaluation
1. Log in as `prof.sharma@emp.com` / `Examiner@123`.
2. View the **Examiner Dashboard** and assigned exams.
3. Open **Slot Management** (`#/examiner/slots`):
   - For an exam in `Slot Creation` status (*Shell Scripting Lab Demo*), show the **Create Slot** form.
   - For exams not in `Slot Creation`, explain how the UI disables slot addition to enforce the timeline rule.
4. Click **View Booked Candidates**:
   - Click **Evaluate** on a booked candidate.
   - Show the **Rubric Scoring Form**: Enter scores per criterion, write qualitative remarks, and click **Submit Evaluation**.
   - Show how the total marks are computed and how the slot status updates to `Completed`.

### Step 3: Student Workflow & CSV Export
1. Log in as `student1@study.iitm.ac.in` / `Student@123`.
2. Navigate to **History** (`#/student/history`):
   - Show the completed evaluation with published marks (93/100) and examiner remarks.
3. Click the **Export History (CSV)** button:
   - Celery worker receives the job asynchronously.
   - The UI polls and presents a **Download CSV** button upon completion.
   - Download and open the CSV to show the required columns.
4. Log in as `student3@study.iitm.ac.in` / `Student@123`:
   - Navigate to **Available Exams** (`#/student/exams`).
   - Show active booking detection (cannot double-book the same exam).
   - Cancel the booking and show the available seat count increment atomically.

### Step 4: Celery Batch Jobs Manual Trigger
1. Return to the **Admin Dashboard**.
2. Under **Celery Batch Jobs (Viva Demo)**, click **Trigger Daily Slot Reminders** and **Trigger Monthly Activity Report**.
3. Point out the Celery worker terminal logs showing the task received and succeeded, and open `outbox.log` to demonstrate the email dispatch.

### Step 5: Caching & PWA Verification
1. Open Chrome DevTools $\rightarrow$ Network tab.
2. Request `/api/admin/analytics`. Show the response header `X-Cache: HIT` on subsequent reloads.
3. Open Chrome DevTools $\rightarrow$ Application tab:
   - Show **Manifest**: Name, icons (192, 512), theme color `#0d6efd`, display `standalone`.
   - Show **Service Workers**: `sw.js` active and running.
   - Click the browser install icon in the URL bar to demonstrate PWA desktop/mobile installability.

---

## Complete API Endpoint Reference

| Method | Endpoint | Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Student account registration |
| `POST` | `/api/auth/login` | Public | JWT login with role redirection |
| `GET` | `/api/auth/me` | Authenticated | Current user profile |
| `GET` | `/api/admin/dashboard` | Admin | Summary counts |
| `GET` | `/api/admin/analytics` | Admin | Aggregated Chart.js dataset with Redis caching |
| `GET` | `/api/admin/courses` | Admin | List all courses with optional `?q=` search |
| `POST` | `/api/admin/courses` | Admin | Create a course |
| `PUT` | `/api/admin/courses/<id>` | Admin | Update a course |
| `DELETE` | `/api/admin/courses/<id>` | Admin | Delete a course |
| `GET` | `/api/admin/exams` | Admin | List examinations with Redis caching |
| `POST` | `/api/admin/exams` | Admin | Create an examination |
| `PUT` | `/api/admin/exams/<id>` | Admin | Update examination details |
| `POST` | `/api/admin/exams/<id>/status` | Admin | Advance examination lifecycle status |
| `POST` | `/api/admin/exams/<id>/publish-results`| Admin | Publish results and lock evaluations |
| `GET` | `/api/admin/exams/<id>/rubrics` | Admin | List rubrics for an exam |
| `POST` | `/api/admin/exams/<id>/rubrics` | Admin | Add rubric criterion |
| `PUT` | `/api/admin/rubrics/<id>` | Admin | Update rubric criterion |
| `DELETE` | `/api/admin/rubrics/<id>` | Admin | Delete rubric criterion |
| `GET` | `/api/admin/examiners` | Admin | List examiners |
| `POST` | `/api/admin/examiners` | Admin | Provision new examiner (auto password) |
| `POST` | `/api/admin/examiners/<id>/toggle-active` | Admin | Toggle examiner approval status |
| `POST` | `/api/admin/examiners/<id>/reset-password` | Admin | Reset examiner password & email |
| `GET` | `/api/admin/students` | Admin | Student directory with `?q=` filter |
| `POST` | `/api/admin/students/<id>/toggle-block` | Admin | Block/unblock student |
| `GET` | `/api/admin/slots` | Admin | Slot oversight across all examiners |
| `POST` | `/api/admin/slots/<id>/reassign-examiner`| Admin | Reassign slot to another examiner |
| `GET` | `/api/admin/bookings` | Admin | All student bookings |
| `POST` | `/api/admin/bookings/<id>/reschedule` | Admin | Reschedule student booking to another slot |
| `POST` | `/api/admin/trigger-job/daily-reminder` | Admin | Manually trigger Celery reminder job |
| `POST` | `/api/admin/trigger-job/monthly-report` | Admin | Manually trigger Celery report job |
| `GET` | `/api/examiner/dashboard` | Examiner | Examiner metrics & assigned exams |
| `GET` | `/api/examiner/exams` | Examiner | Examiner assigned exams |
| `GET` | `/api/examiner/slots` | Examiner | List examiner slots |
| `POST` | `/api/examiner/slots` | Examiner | Create slot (only during `Slot Creation`) |
| `PUT` | `/api/examiner/slots/<id>` | Examiner | Update unbooked slot |
| `DELETE` | `/api/examiner/slots/<id>` | Examiner | Delete unbooked slot |
| `GET` | `/api/examiner/slots/<id>/bookings` | Examiner | Candidate roster for a slot |
| `GET` | `/api/examiner/bookings/<id>/rubrics` | Examiner | Fetch rubrics & existing score |
| `POST` | `/api/examiner/bookings/<id>/evaluate` | Examiner | Submit rubric marks & remarks |
| `POST` | `/api/examiner/slots/<id>/complete` | Examiner | Mark slot and exam as completed |
| `GET` | `/api/student/profile` | Student | Candidate profile |
| `PUT` | `/api/student/profile` | Student | Update candidate profile |
| `GET` | `/api/student/exams` | Student | Browse open exams & available slots (Cached) |
| `POST` | `/api/student/book` | Student | Book slot (single active per exam check) |
| `POST` | `/api/student/bookings/<id>/cancel` | Student | Cancel booking & reclaim seat |
| `GET` | `/api/student/history` | Student | Booking history, scores & remarks |
| `POST` | `/api/student/export` | Student | Initiate Celery async CSV export |
| `GET` | `/api/student/export/<task_id>` | Student | Poll Celery task progress |
| `GET` | `/api/student/export/download/<task_id>`| Student | Download generated CSV file |

---

*Developed for the IIT Madras BS Degree Modern Application Development II (MAD-II) Course.*
