# Examination Management Portal V2 (EMP-V2)

**Target Course**: Modern Application Development II (MAD-II) — IIT Madras BS Degree in Data Science and Applications  
**Recommended Python Version**: **Python 3.10 to 3.14** *(Tested and verified on Python 3.14.3)*  
**Specification & Build Artifacts**: OpenAPI 3.0: [`api.yaml`](api.yaml) | Packager: [`make_zip.py`](make_zip.py)

---

## Project Overview

Examination Management Portal V2 (EMP-V2) is an educational examination coordination and management system. It models the entire lifecycle of multi-format assessments (Viva, Practical, Project Demo, Assessment):
- **Administrator**: Academic courses CRUD, examination timelines, rubrics configuration, examiner provisioning, student oversight & blocking, slot reassignment, exceptional rescheduling, results publication, and Chart.js analytics.
- **Examiner**: Time slot scheduling with capacity limits during the designated `Slot Creation` phase, candidate roster inspection, multi-criteria rubric grading with qualitative remarks, and slot completion.
- **Student**: Account self-registration, exam browsing, slot booking (with strict single-active booking enforcement per exam), cancellation before deadlines, published score reviews, and asynchronous CSV export.

---

## Tech Stack & Allowed Constraints

- **Backend**: Python 3.14, Flask, Flask-SQLAlchemy (SQLite database), Flask-JWT-Extended, Celery, Redis (`redis-py`).
- **Standard Library**: `os`, `sys`, `csv`, `datetime`, `re`, `json`, `smtplib`, `email.message`, `secrets`, `string`, `zipfile`.
- **Frontend**: Vue 3 (Options API, global build, zero bundler/Vite/webpack), Vue Router 4 (hash mode), Bootstrap 5.3 CSS, Chart.js 4.
- **PWA**: Web App Manifest (`manifest.json`) and Service Worker (`sw.js`) for offline shell caching and home-screen installability.
- **Prohibited Stack Compliance**: Strictly excludes *Flask-RESTful, Marshmallow, Flask-Migrate, Flask-Security, Flask-Mail, Flask-Caching, Flask-CORS, requests, Pinia, Tailwind, jQuery, Docker.*

---

## Directory Layout

```text
mad2-pro/
├── README.md                          # Documentation & viva walkthrough
├── requirements.txt                   # Direct pinned dependencies (Flask, SQLAlchemy, JWT, Celery, Redis)
├── .gitignore                         # Excludes venv, pycache, SQLite databases, logs, archives
├── api.yaml                           # OpenAPI 3.0 specification (100% of 54 API endpoints documented)
├── make_zip.py                        # Automated submission packager (standard library only)
├── app.py                             # Flask application factory, database initialization, default admin seed
├── config.py                          # Environment settings & dynamic BASE_DIR path resolution
├── extensions.py                      # SQLAlchemy and JWTManager singletons
├── models.py                          # Relational data schema (8 normalized tables)
├── helpers.py                         # RBAC @role_required, Redis cache wrappers, email sender
├── tasks.py                           # Celery app, periodic beat schedules, and async CSV export
├── seed_demo.py                       # Standalone demo data seeder for viva evaluation
├── exports/                           # Destination directory for generated CSV exports
│   └── .gitkeep
├── templates/
│   ├── .gitkeep
│   └── index.html                     # Single Jinja2 entry point serving the Vue 3 SPA
├── static/
│   ├── manifest.json                  # PWA metadata & display modes
│   ├── sw.js                          # Service Worker for offline shell caching
│   ├── css/
│   │   ├── .gitkeep
│   │   └── style.css                  # Custom responsive overrides
│   ├── img/
│   │   ├── icon-192.png               # PWA icon (192x192)
│   │   └── icon-512.png               # PWA icon (512x512)
│   ├── js/
│   │   ├── api.js                     # Centralized Fetch API client with Bearer JWT
│   │   ├── app.js                     # Vue Router setup, navigation guards, route mappings
│   │   └── components/                # Modular Vue 3 Options API components
│   │       ├── .gitkeep
│   │       ├── Navbar.js              # Global navigation bar
│   │       ├── Login.js               # Login component with role redirection
│   │       ├── Register.js            # Student registration component
│   │       ├── AdminDashboard.js      # Metrics & Chart.js visualizations (Bar, Doughnut, Line)
│   │       ├── AdminCourses.js        # Course CRUD
│   │       ├── AdminExams.js          # Exam lifecycle, timelines, rubrics CRUD, publishing
│   │       ├── AdminExaminers.js      # Examiner provisioning
│   │       ├── AdminStudents.js       # Student directory & block toggle
│   │       ├── AdminSlots.js          # Slot oversight & reassignment
│   │       ├── AdminBookings.js       # Booking oversight & rescheduling
│   │       ├── ExaminerDashboard.js   # Examiner overview
│   │       ├── ExaminerExams.js       # Examiner assigned exams
│   │       ├── ExaminerSlots.js       # Slot creation & roster view
│   │       ├── ExaminerEvaluate.js    # Rubric-based grading form
│   │       ├── StudentDashboard.js    # Student home & notifications
│   │       ├── StudentProfile.js      # Student profile management
│   │       ├── StudentExams.js        # Exam browsing & slot booking
│   │       └── StudentHistory.js      # Booking history & CSV export
│   └── vendor/                        # Vendored offline JS/CSS assets (Zero external CDN)
│       ├── .gitkeep
│       ├── bootstrap.min.css
│       ├── bootstrap.bundle.min.js
│       ├── vue.global.prod.js
│       ├── vue-router.global.prod.js
│       └── chart.umd.min.js
└── routes/
    ├── .gitkeep
    ├── auth.py                        # /api/auth/* (register, login, me)
    ├── admin.py                       # /api/admin/* (courses, exams, rubrics, examiners, students, slots, analytics)
    ├── examiner.py                    # /api/examiner/* (assigned exams, slots CRUD, evaluation)
    └── student.py                     # /api/student/* (profile, browse exams, book, cancel, export)
```

---

## Setup & Run from a Fresh Extract

### Windows (PowerShell)
```powershell
# 1. Navigate to the extracted project folder
cd mad2-pro

# 2. Create and activate a fresh virtual environment
py -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install direct dependencies
pip install -r requirements.txt

# 4. (Optional) Populate realistic viva demonstration data
python seed_demo.py

# 5. Start the Flask server
python app.py
```

### macOS / Linux (Bash)
```bash
# 1. Navigate to the extracted project folder
cd mad2-pro

# 2. Create and activate a fresh virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install direct dependencies
pip install -r requirements.txt

# 4. (Optional) Populate realistic viva demonstration data
python3 seed_demo.py

# 5. Start the Flask server
python3 app.py
```

Access the application in your browser at: **`http://localhost:5000`**

---

## Starting Redis & Celery

### 1. Redis Server
Redis is required for background task queues and `X-Cache` telemetry.
- **Windows (Memurai / Redis native)**: Start `redis-server.exe` (port 6379).
- **WSL (Ubuntu)**: `wsl sudo service redis-server start`
- **Docker**: `docker run -d -p 6379:6379 --name emp-redis redis:alpine`
- **macOS (Homebrew)**: `brew services start redis`

*(Note: If Redis is offline, the core web portal continues operating smoothly; cache requests gracefully degrade to dynamic queries with `X-Cache: MISS`).*

### 2. Celery Worker
Open a new terminal, activate the venv, and run:
- **Windows**: (Must include `-P solo` because Windows does not support prefork):
  ```powershell
  celery -A tasks.celery worker -l info -P solo
  ```
- **macOS / Linux**:
  ```bash
  celery -A tasks.celery worker -l info
  ```

### 3. Celery Beat (Periodic Scheduler)
Open another terminal, activate the venv, and run:
```bash
celery -A tasks.celery beat -l info
```

---

## Default Credentials & Pre-Seeded Accounts

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin (Default)** | `admin@emp.com` | `Admin@123` | System Administrator (Auto-created on first run) |
| **Examiner 1** | `prof.sharma@emp.com` | `Examiner@123` | Dr. Ramesh Sharma (Computer Science) *(Seeded)* |
| **Examiner 2** | `prof.anand@emp.com` | `Examiner@123` | Dr. Kavita Anand (Data Science) *(Seeded)* |
| **Student 1** | `student1@study.iitm.ac.in` | `Student@123` | Aarav Kumar (Passed 93/100, Results Published) *(Seeded)* |
| **Student 2** | `student2@study.iitm.ac.in` | `Student@123` | Bhavna Patel (32/100, Results Published) *(Seeded)* |
| **Student 3** | `student3@study.iitm.ac.in` | `Student@123` | Chetan Singh (Active Booking in Python Viva) *(Seeded)* |

---

## How to Trigger Celery Jobs Manually for Viva

### 1. Daily Slot Reminder Job (`daily_reminder_job`)
- **Via Admin UI**: Log in as `admin@emp.com`, open Dashboard, click **Trigger Daily Slot Reminders**.
- **Via Terminal / Python**:
  ```powershell
  python -c "from tasks import daily_reminder_job; print(daily_reminder_job())"
  ```
- **Via cURL**:
  ```powershell
  curl.exe -X POST http://localhost:5000/api/admin/trigger-job/daily-reminder -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
  ```

### 2. Monthly Summary Report Job (`monthly_report_job`)
- **Via Admin UI**: On Admin Dashboard, click **Trigger Monthly Activity Report**.
- **Via Terminal / Python**:
  ```powershell
  python -c "from tasks import monthly_report_job; print(monthly_report_job())"
  ```
- **Via cURL**:
  ```powershell
  curl.exe -X POST http://localhost:5000/api/admin/trigger-job/monthly-report -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
  ```

### 3. Student Async CSV Export (`export_student_history_job`)
1. Log in as a student (`student1@study.iitm.ac.in` / `Student@123`).
2. Navigate to **History** (`#/student/history`).
3. Click **Export History (CSV)**.
4. The client polls the Celery task ID and provides a green **Download CSV** link once complete.
5. Generated CSVs contain: `Student ID, Examination Name, Course, Examination Date, Examiner, Marks Obtained, Booking Status`.

---

## Automated Packaging Utility (`make_zip.py`)

To generate the clean submission archive outside the repository:
```powershell
python make_zip.py
```
This utility automatically excludes virtual environments, git metadata, SQLite database files, logs, and compiled bytecode, outputting `../mad2-pro_submission.zip` containing the project rooted in a single `mad2-pro/` folder.

---

## OpenAPI 3.0 Specification (`api.yaml`)

The complete OpenAPI 3.0 document is located in the root directory: [`api.yaml`](api.yaml).  
It documents 100% of the 54 REST API endpoints with request bodies, query/path parameters, JWT `bearerAuth` security schemes, and standardized responses.
