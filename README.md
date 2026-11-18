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

## Placeholder Run Instructions

### 1. Environment Setup
```powershell
# Create and activate Python virtual environment
py -m venv venv
.\venv\Scripts\Activate.ps1

# Install required dependencies
pip install -r requirements.txt
```

### 2. Start Redis Server
Ensure Redis is running locally on port `6379`.
- On Windows: Use WSL (`sudo service redis-server start`) or Memurai / native Redis executable.

### 3. Run Flask Application
```powershell
python app.py
```
Access the application at `http://localhost:5000`.

### 4. Run Celery Worker (Windows)
```powershell
celery -A tasks.celery worker -l info -P solo
```

### 5. Run Celery Beat Scheduler
```powershell
celery -A tasks.celery beat -l info
```
