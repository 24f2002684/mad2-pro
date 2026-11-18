# tasks.py
# Celery application and background jobs for EMP-V2.
# Implements daily student reminders, monthly admin reports, and async CSV history export.

import os
import csv
from datetime import date, timedelta, datetime

# Compatibility fix for Windows Redis (RESP2 / Redis 5.x) with redis-py 8.x and kombu
try:
    import redis.connection
    import redis.maint_notifications
    import redis.client
    redis.connection.DEFAULT_RESP_VERSION = 2
    redis.maint_notifications.MaintNotificationsConfig.__init__.__defaults__ = (False, True, 10, None)

    # Redis 5.x Lua script compatibility (avoids ZADD GT syntax error on Redis 5)
    from kombu.transport import redis as kombu_redis
    kombu_redis.REFRESH_BINDING = """
    redis.call('SADD', KEYS[1], ARGV[1])
    local now = redis.call('TIME')
    local ms = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
    local current = redis.call('ZSCORE', KEYS[2], ARGV[2])
    local new_score = ms + tonumber(ARGV[3])
    if not current or new_score > tonumber(current) then
        redis.call('ZADD', KEYS[2], new_score, ARGV[2])
    end
    """

    # Redis 5.x ZRANGE BYSCORE compatibility (avoids syntax error on Redis 5)
    _orig_zrange = redis.client.Redis.zrange
    def _compat_zrange(self, name, start, end, **kwargs):
        if kwargs.get('byscore'):
            desc = kwargs.get('desc', False)
            offset = kwargs.get('offset')
            num = kwargs.get('num')
            withscores = kwargs.get('withscores', False)
            if desc:
                return self.zrevrangebyscore(name, start, end, start=offset, num=num, withscores=withscores)
            else:
                return self.zrangebyscore(name, start, end, start=offset, num=num, withscores=withscores)
        return _orig_zrange(self, name, start, end, **kwargs)
    redis.client.Redis.zrange = _compat_zrange
except Exception:
    pass

from celery import Celery
from celery.schedules import crontab
from config import Config
from extensions import db
from models import User, Course, Examination, Slot, Booking, Evaluation, ExaminerProfile
from helpers import send_email

# Lazy Flask app creation helper to prevent duplicate initializations
_flask_app = None

def get_flask_app():
    global _flask_app
    if _flask_app is None:
        from app import create_app
        _flask_app = create_app()
    return _flask_app

celery = Celery(
    "emp_tasks",
    broker=Config.CELERY_BROKER_URL,
    backend=Config.CELERY_RESULT_BACKEND,
    timezone=Config.CELERY_TIMEZONE
)

class ContextTask(celery.Task):
    # Runs task within Flask application context
    def __call__(self, *args, **kwargs):
        with get_flask_app().app_context():
            return self.run(*args, **kwargs)

celery.Task = ContextTask

# Celery Beat Scheduled Tasks
celery.conf.beat_schedule = {
    "daily-student-reminder-8am": {
        "task": "tasks.daily_reminder_job",
        "schedule": crontab(hour=8, minute=0),
    },
    "monthly-admin-summary-report-9am": {
        "task": "tasks.monthly_report_job",
        "schedule": crontab(day_of_month=1, hour=9, minute=0),
    }
}

# --- 1. DAILY REMINDER JOB ---

@celery.task(name="tasks.daily_reminder_job")
def daily_reminder_job():
    # Emails every student who has a Booked slot tomorrow
    tomorrow_str = (date.today() + timedelta(days=1)).isoformat()
    upcoming_bookings = Booking.query.join(Slot, Booking.slot_id == Slot.id).filter(
        Slot.date == tomorrow_str,
        Booking.status == "Booked"
    ).all()

    sent_count = 0
    for b in upcoming_bookings:
        student = b.student
        slot = b.slot
        exam = slot.examination
        examiner = slot.examiner

        html_body = f"""
        <h3>Upcoming Examination Reminder</h3>
        <p>Dear {student.full_name},</p>
        <p>This is a reminder that you have an examination scheduled for tomorrow.</p>
        <ul>
            <li><b>Examination:</b> {exam.name} ({exam.exam_type})</li>
            <li><b>Course:</b> {exam.course.code} - {exam.course.name}</li>
            <li><b>Date & Time:</b> {slot.date} from {slot.start_time} to {slot.end_time}</li>
            <li><b>Examiner:</b> {examiner.full_name}</li>
            <li><b>Meeting Link:</b> {slot.meeting_link or 'Check portal for link'}</li>
        </ul>
        <p><b>Instructions:</b><br>{exam.instructions or 'Please join on time with ID card ready.'}</p>
        <p>Best regards,<br>Examination Management Portal</p>
        """
        send_email(student.email, f"Reminder: Your {exam.name} is Tomorrow", html_body)
        sent_count += 1

    return {"status": "SUCCESS", "emails_sent": sent_count, "target_date": tomorrow_str}

# --- 2. MONTHLY ADMIN REPORT JOB ---

@celery.task(name="tasks.monthly_report_job")
def monthly_report_job():
    # Sends monthly examination summary statistics to administrator
    exams_conducted = Examination.query.filter(Examination.status.in_(["Completed", "Closed"])).count()
    total_evaluated = Evaluation.query.count()
    completed_bookings = Booking.query.filter_by(status="Completed").count()
    pending_evaluations = Booking.query.filter(Booking.status == "Booked", Booking.evaluation == None).count()

    # Determine most active examiners
    examiners = User.query.filter_by(role="examiner").all()
    examiner_activity = []
    for ex in examiners:
        eval_count = Evaluation.query.filter_by(examiner_id=ex.id).count()
        examiner_activity.append((ex.full_name, ex.department, eval_count))
    examiner_activity.sort(key=lambda x: x[2], reverse=True)
    top_examiners = examiner_activity[:5]

    examiner_rows = "".join([f"<tr><td>{name}</td><td>{dept}</td><td>{cnt}</td></tr>" for name, dept, cnt in top_examiners])
    if not examiner_rows:
        examiner_rows = "<tr><td colspan='3' class='text-center'>No examiner activity recorded</td></tr>"

    html_report = f"""
    <h2>EMP-V2 Monthly Examination Summary Report</h2>
    <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    <table border="1" cellpadding="8" style="border-collapse:collapse; width:100%; max-width:600px;">
        <tr style="background-color:#f2f2f2;"><th>Metric</th><th>Value</th></tr>
        <tr><td>Exams Conducted / Closed</td><td><b>{exams_conducted}</b></td></tr>
        <tr><td>Students Evaluated</td><td><b>{total_evaluated}</b></td></tr>
        <tr><td>Completed Candidate Bookings</td><td><b>{completed_bookings}</b></td></tr>
        <tr><td>Pending Evaluations</td><td><b>{pending_evaluations}</b></td></tr>
    </table>

    <h3>Top Active Faculty Examiners</h3>
    <table border="1" cellpadding="8" style="border-collapse:collapse; width:100%; max-width:600px;">
        <tr style="background-color:#f2f2f2;"><th>Examiner Name</th><th>Department</th><th>Evaluations Conducted</th></tr>
        {examiner_rows}
    </table>
    <p>Portal Administration &bull; Automated Monthly Analytics</p>
    """

    admin_email = Config.ADMIN_EMAIL
    send_email(admin_email, "EMP-V2 Monthly Examination Performance Report", html_report)
    return {
        "status": "SUCCESS",
        "exams_conducted": exams_conducted,
        "total_evaluated": total_evaluated,
        "completed_bookings": completed_bookings
    }

# --- 3. ASYNC CSV EXPORT JOB ---

@celery.task(name="tasks.export_student_history_job")
def export_student_history_job(student_id):
    # Generates student history CSV file asynchronously and sends completion email
    student = User.query.get(student_id)
    if not student:
        return {"status": "FAILED", "message": "Student not found"}

    bookings = Booking.query.filter_by(student_id=student.id).order_by(Booking.booked_at.desc()).all()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"student_{student.id}_history_{timestamp}.csv"
    filepath = os.path.join(Config.BASE_DIR, "exports", filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow([
            "Student ID",
            "Examination Name",
            "Course",
            "Examination Date",
            "Examiner",
            "Marks Obtained",
            "Booking Status"
        ])
        for b in bookings:
            exam = b.slot.examination if b.slot else None
            course = exam.course if exam else None
            
            marks = "N/A"
            if exam and exam.results_published and b.evaluation:
                marks = str(b.evaluation.total_marks)
            elif b.evaluation:
                marks = "Results Awaited"

            writer.writerow([
                student.id,
                exam.name if exam else "N/A",
                f"{course.code} - {course.name}" if course else "N/A",
                b.slot.date if b.slot else "N/A",
                b.slot.examiner.full_name if (b.slot and b.slot.examiner) else "N/A",
                marks,
                b.status
            ])

    # Send completion notification email to student
    email_html = f"""
    <p>Dear {student.full_name},</p>
    <p>Your examination booking history export has been successfully generated.</p>
    <p>File name: <b>{filename}</b></p>
    <p>You can now download this file directly from your Student History portal.</p>
    """
    send_email(student.email, "Your Examination History Export is Ready", email_html)

    return {"status": "SUCCESS", "filename": filename}
