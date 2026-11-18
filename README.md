# Examination Management Portal V2 (EMP-V2)

Examination Management Portal V2 (EMP-V2) is an educational examination coordination and management web application built for the IIT Madras BS Degree Modern Application Development II (MAD-II) course.

The portal provides role-based interfaces for three key stakeholders:
- **Admin**: Manages courses, examinations, evaluation rubrics, examiners, and students; controls examination timelines and status workflows; handles exceptional rescheduling, examiner reassignment, and results publication.
- **Examiner**: Views assigned examinations, configures time slots with capacity limits during the slot creation window, views booked students, evaluates submissions using standardized rubrics, and submits marks with feedback.
- **Student**: Searches and browses open examinations, books available slots (with single-active booking enforcement), cancels bookings within allowed deadlines, tracks booking history, and views published scores and feedback.

---

## Tech Stack

- **Backend**: Python 3, Flask, Flask-SQLAlchemy (SQLite database), Flask-JWT-Extended, Celery, Redis (`redis-py`).
- **Standard Library**: `smtplib`, `email.message`, `csv`, `datetime`, `re`, `os`, `json`, `werkzeug.security`.
- **Frontend**: Vue 3 (Options API, global build, no CLI/Vite/webpack), Vue Router 4 (hash mode), Bootstrap 5 (CSS & bundle JS), Chart.js (analytics).
- **Template Engine**: Jinja2 (used strictly to serve `templates/index.html` as the single-page application entry point).

---

## Directory Structure

```text
mad2-pro/
├── README.md                          # Project documentation and run steps
├── requirements.txt                   # Backend dependencies
├── .gitignore                         # Files and directories ignored by Git
├── docs/                              # Project description, milestones, wireframes
├── app.py                             # Flask app factory, blueprint registration & initialization
├── config.py                          # Application settings, secrets, and Redis/mail configuration
├── extensions.py                      # SQLAlchemy and JWTManager instances
├── models.py                          # Database schema and relational tables
├── helpers.py                         # Role decorator, Redis cache functions, email helper
├── tasks.py                           # Celery application, beat schedules, and async export jobs
├── seed_demo.py                       # Demo data populator for viva presentations
├── exports/                           # Directory storing generated CSV exports
├── templates/
│   └── index.html                     # Single Jinja2 entry point serving Vue 3
├── static/
│   ├── css/
│   │   └── style.css                  # Minimal custom styling overrides
│   ├── vendor/                        # Offline JS/CSS dependencies
│   │   ├── bootstrap.min.css
│   │   ├── bootstrap.bundle.min.js
│   │   ├── vue.global.prod.js
│   │   ├── vue-router.global.prod.js
│   │   └── chart.umd.min.js
│   ├── js/
│   │   ├── api.js                     # Fetch wrapper with JWT headers
│   │   ├── app.js                     # Vue 3 initialization and route guards
│   │   └── components/                # Modular Vue components
│   ├── manifest.json                  # PWA metadata
│   └── sw.js                          # Service Worker for PWA
└── routes/
    ├── auth.py                        # /api/auth/* endpoints
    ├── admin.py                       # /api/admin/* endpoints
    ├── examiner.py                    # /api/examiner/* endpoints
    └── student.py                     # /api/student/* endpoints
```

---

## Setup & Execution Guide

### 1. Environment Setup
```powershell
# Create and activate Python virtual environment
py -m venv venv
.\venv\Scripts\Activate.ps1

# Install required dependencies
pip install -r requirements.txt
```

### 2. Start Redis Server
Redis is required for Celery background tasks and API caching. Choose one of the following methods on Windows:
- **Option A (WSL)**: `wsl` -> `sudo service redis-server start`
- **Option B (Docker)**: `docker run -d -p 6379:6379 --name emp-redis redis:alpine`
- **Option C (Memurai / Native)**: Start `memurai.exe` or `redis-server.exe` on port `6379`.

### 3. Run Flask Application
```powershell
python app.py
```
Access the application at `http://localhost:5000`.

### 4. Run Celery Worker (Windows)
> **Important for Windows**: Always include `-P solo` because the default prefork pool is not supported on Windows.
```powershell
celery -A tasks.celery worker -l info -P solo
```

### 5. Run Celery Beat Scheduler
```powershell
celery -A tasks.celery beat -l info
```

---

## Default Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@emp.com` | `Admin@123` |
| **Examiner** | Created by Admin | Generated 8-character random password (sent via email / logged in `outbox.log`) |
| **Student** | Self-registered | Chosen at registration (min 6 characters) |

---

## Live Viva Demonstration: How to Trigger Celery Jobs Manually

To demonstrate Celery jobs on demand during your viva evaluation without waiting for the scheduled crontab times:

### 1. Trigger Daily Reminder Job (Normally runs at 08:00 IST)
Emails students with booked examinations scheduled for tomorrow:
```powershell
# Via PowerShell / curl
curl.exe -X POST http://localhost:5000/api/admin/trigger-job/daily-reminder -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
*Or directly via Python in a single command:*
```powershell
python -c "from tasks import daily_reminder_job; print(daily_reminder_job())"
```

### 2. Trigger Monthly Summary Report Job (Normally runs 1st of month at 09:00 IST)
Generates and sends the HTML performance summary to the administrator:
```powershell
# Via PowerShell / curl
curl.exe -X POST http://localhost:5000/api/admin/trigger-job/monthly-report -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
*Or directly via Python in a single command:*
```powershell
python -c "from tasks import monthly_report_job; print(monthly_report_job())"
```

### 3. User-Triggered CSV Export
1. Log into the student portal as a candidate.
2. Navigate to **History** (`#/student/history`).
3. Click the **Export History (CSV)** button in the top right.
4. The client initiates the Celery task and polls `/api/student/export/<task_id>`.
5. Once complete, a green banner appears with a **Download CSV** link.
6. Check `exports/` folder or click Download to inspect the CSV columns (`Student ID, Examination Name, Course, Examination Date, Examiner, Marks Obtained, Booking Status`).
