# routes/admin.py
# Admin blueprint for EMP-V2.
# Manages courses, examinations, timelines, rubrics, examiners, students, slots, and bookings.

import secrets
import string
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from extensions import db
from models import User, Course, Examination, ExamExaminer, Rubric, Slot, Booking, ExaminerProfile
from helpers import role_required, is_valid_email, is_valid_phone, send_email

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

# Valid examination status state transitions
EXAM_TRANSITIONS = {
    "Draft": ["Slot Creation"],
    "Slot Creation": ["Draft", "Booking Open"],
    "Booking Open": ["Closed"],
    "Closed": ["Booking Open", "Completed"],
    "Completed": []
}

# --- DASHBOARD & METRICS ---

@admin_bp.route("/dashboard", methods=["GET"])
@role_required("admin")
def get_dashboard_counts():
    # Returns metric summary counts across the portal
    return jsonify({
        "courses": Course.query.count(),
        "exams": Examination.query.count(),
        "examiners": User.query.filter_by(role="examiner").count(),
        "students": User.query.filter_by(role="student").count(),
        "slots": Slot.query.count(),
        "bookings": Booking.query.count()
    }), 200

# --- COURSE CRUD ---

@admin_bp.route("/courses", methods=["GET"])
@role_required("admin")
def list_courses():
    # Lists all courses with optional ?q= filter on name or code
    q = request.args.get("q", "").strip()
    query = Course.query
    if q:
        query = query.filter((Course.name.ilike(f"%{q}%")) | (Course.code.ilike(f"%{q}%")))
    return jsonify([c.to_dict() for c in query.order_by(Course.code).all()]), 200

@admin_bp.route("/courses", methods=["POST"])
@role_required("admin")
def create_course():
    # Creates a new academic course
    data = request.get_json() or {}
    code, name = data.get("code", "").strip(), data.get("name", "").strip()
    if not code or not name:
        return jsonify({"message": "Course code and name are required"}), 400
    if Course.query.filter_by(code=code).first():
        return jsonify({"message": f"Course with code '{code}' already exists"}), 409
    
    course = Course(code=code, name=name, description=data.get("description", "").strip(), status=data.get("status", "Active"))
    db.session.add(course)
    db.session.commit()
    return jsonify(course.to_dict()), 201

@admin_bp.route("/courses/<int:course_id>", methods=["PUT"])
@role_required("admin")
def update_course(course_id):
    # Updates an existing course
    course = Course.query.get_or_404(course_id)
    data = request.get_json() or {}
    course.name = data.get("name", course.name).strip()
    course.description = data.get("description", course.description).strip()
    course.status = data.get("status", course.status)
    db.session.commit()
    return jsonify(course.to_dict()), 200

@admin_bp.route("/courses/<int:course_id>", methods=["DELETE"])
@role_required("admin")
def delete_course(course_id):
    # Deletes course only if it has no associated examinations
    course = Course.query.get_or_404(course_id)
    if course.examinations:
        return jsonify({"message": "Cannot delete course with associated examinations"}), 409
    db.session.delete(course)
    db.session.commit()
    return jsonify({"message": "Course deleted successfully"}), 200

# --- EXAMINATION MANAGEMENT ---

@admin_bp.route("/exams", methods=["GET"])
@role_required("admin")
def list_exams():
    # Lists all examinations with optional ?q= filter
    q = request.args.get("q", "").strip()
    query = Examination.query
    if q:
        query = query.filter((Examination.name.ilike(f"%{q}%")) | (Examination.exam_type.ilike(f"%{q}%")))
    return jsonify([e.to_dict() for e in query.order_by(Examination.id.desc()).all()]), 200

@admin_bp.route("/exams", methods=["POST"])
@role_required("admin")
def create_exam():
    # Creates an examination with timeline dates
    data = request.get_json() or {}
    required = ["course_id", "name", "exam_type", "duration", "max_marks", "slot_creation_start", "slot_creation_end", "booking_start", "booking_end"]
    if any(not data.get(f) for f in required):
        return jsonify({"message": "All timeline and examination fields are required"}), 400
    if int(data["duration"]) <= 0 or int(data["max_marks"]) <= 0:
        return jsonify({"message": "Duration and maximum marks must be positive numbers"}), 400
    if data["slot_creation_end"] < data["slot_creation_start"] or data["booking_end"] < data["booking_start"]:
        return jsonify({"message": "End dates must be equal to or after start dates"}), 400

    exam = Examination(
        course_id=int(data["course_id"]),
        name=data["name"].strip(),
        exam_type=data["exam_type"],
        duration=int(data["duration"]),
        max_marks=int(data["max_marks"]),
        instructions=data.get("instructions", "").strip(),
        slot_creation_start=data["slot_creation_start"],
        slot_creation_end=data["slot_creation_end"],
        booking_start=data["booking_start"],
        booking_end=data["booking_end"],
        status="Draft"
    )
    db.session.add(exam)
    db.session.commit()
    return jsonify(exam.to_dict()), 201

@admin_bp.route("/exams/<int:exam_id>", methods=["GET"])
@role_required("admin")
def get_exam(exam_id):
    # Returns details for a single examination
    exam = Examination.query.get_or_404(exam_id)
    return jsonify(exam.to_dict()), 200

@admin_bp.route("/exams/<int:exam_id>", methods=["PUT"])
@role_required("admin")
def update_exam(exam_id):
    # Updates examination details and timeline
    exam = Examination.query.get_or_404(exam_id)
    data = request.get_json() or {}
    exam.name = data.get("name", exam.name).strip()
    exam.exam_type = data.get("exam_type", exam.exam_type)
    if "duration" in data: exam.duration = int(data["duration"])
    if "max_marks" in data: exam.max_marks = int(data["max_marks"])
    exam.instructions = data.get("instructions", exam.instructions)
    exam.slot_creation_start = data.get("slot_creation_start", exam.slot_creation_start)
    exam.slot_creation_end = data.get("slot_creation_end", exam.slot_creation_end)
    exam.booking_start = data.get("booking_start", exam.booking_start)
    exam.booking_end = data.get("booking_end", exam.booking_end)
    db.session.commit()
    return jsonify(exam.to_dict()), 200

@admin_bp.route("/exams/<int:exam_id>", methods=["DELETE"])
@role_required("admin")
def delete_exam(exam_id):
    # Deletes examination only if it has no slots or bookings
    exam = Examination.query.get_or_404(exam_id)
    if exam.slots:
        return jsonify({"message": "Cannot delete exam with existing slots"}), 409
    db.session.delete(exam)
    db.session.commit()
    return jsonify({"message": "Examination deleted successfully"}), 200

@admin_bp.route("/exams/<int:exam_id>/status", methods=["PUT"])
@role_required("admin")
def update_exam_status(exam_id):
    # Validates and updates examination lifecycle status
    exam = Examination.query.get_or_404(exam_id)
    new_status = (request.get_json() or {}).get("status")
    allowed = EXAM_TRANSITIONS.get(exam.status, [])
    if new_status not in allowed:
        return jsonify({"message": f"Invalid transition from '{exam.status}' to '{new_status}'"}), 400
    exam.status = new_status
    db.session.commit()
    return jsonify({"message": f"Exam status updated to {new_status}", "exam": exam.to_dict()}), 200

# --- RUBRICS MANAGEMENT ---

@admin_bp.route("/exams/<int:exam_id>/rubrics", methods=["GET"])
@role_required("admin")
def list_rubrics(exam_id):
    # Lists all evaluation rubrics for an examination
    rubrics = Rubric.query.filter_by(exam_id=exam_id).all()
    return jsonify([r.to_dict() for r in rubrics]), 200

@admin_bp.route("/exams/<int:exam_id>/rubrics", methods=["POST"])
@role_required("admin")
def create_rubric(exam_id):
    # Adds a new rubric criterion to an examination
    data = request.get_json() or {}
    name = data.get("criterion_name", "").strip()
    max_marks = data.get("max_marks")
    if not name or max_marks is None:
        return jsonify({"message": "Criterion name and maximum marks are required"}), 400
    rubric = Rubric(
        exam_id=exam_id,
        criterion_name=name,
        max_marks=int(max_marks),
        weightage=int(data.get("weightage", 0)),
        description=data.get("description", "").strip()
    )
    db.session.add(rubric)
    db.session.commit()
    return jsonify(rubric.to_dict()), 201

@admin_bp.route("/rubrics/<int:rubric_id>", methods=["DELETE"])
@role_required("admin")
def delete_rubric(rubric_id):
    # Deletes a rubric criterion if no scores are linked
    rubric = Rubric.query.get_or_404(rubric_id)
    if rubric.scores:
        return jsonify({"message": "Cannot delete rubric criterion used in student evaluations"}), 409
    db.session.delete(rubric)
    db.session.commit()
    return jsonify({"message": "Rubric deleted successfully"}), 200

# --- EXAMINER ASSIGNMENT & MANAGEMENT ---

@admin_bp.route("/exams/<int:exam_id>/examiners", methods=["GET"])
@role_required("admin")
def list_exam_examiners(exam_id):
    # Lists all examiners assigned to an examination
    exam = Examination.query.get_or_404(exam_id)
    return jsonify([ex.to_dict() for ex in exam.assigned_examiners]), 200

@admin_bp.route("/exams/<int:exam_id>/examiners", methods=["POST"])
@role_required("admin")
def assign_examiner_to_exam(exam_id):
    # Assigns an approved examiner to an examination
    examiner_id = (request.get_json() or {}).get("examiner_id")
    examiner = User.query.filter_by(id=examiner_id, role="examiner").first_or_404()
    if ExamExaminer.query.filter_by(exam_id=exam_id, examiner_id=examiner.id).first():
        return jsonify({"message": "Examiner already assigned to this examination"}), 409
    link = ExamExaminer(exam_id=exam_id, examiner_id=examiner.id)
    db.session.add(link)
    db.session.commit()
    return jsonify({"message": "Examiner assigned successfully"}), 201

@admin_bp.route("/exams/<int:exam_id>/examiners/<int:examiner_id>", methods=["DELETE"])
@role_required("admin")
def remove_examiner_from_exam(exam_id, examiner_id):
    # Removes an examiner from an exam if no slots have been created
    has_slots = Slot.query.filter_by(exam_id=exam_id, examiner_id=examiner_id).first()
    if has_slots:
        return jsonify({"message": "Cannot unassign examiner who has created slots for this exam"}), 409
    link = ExamExaminer.query.filter_by(exam_id=exam_id, examiner_id=examiner_id).first_or_404()
    db.session.delete(link)
    db.session.commit()
    return jsonify({"message": "Examiner unassigned successfully"}), 200

@admin_bp.route("/examiners", methods=["GET"])
@role_required("admin")
def list_examiners():
    # Lists all examiners with optional search filter
    q = request.args.get("q", "").strip()
    query = User.query.filter_by(role="examiner")
    if q:
        query = query.filter((User.full_name.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%")) | (User.department.ilike(f"%{q}%")))
    result = []
    for u in query.all():
        d = u.to_dict()
        d["profile"] = u.examiner_profile.to_dict() if u.examiner_profile else {}
        result.append(d)
    return jsonify(result), 200

@admin_bp.route("/examiners", methods=["POST"])
@role_required("admin")
def create_examiner():
    # Creates examiner, generates random 8-char password, and sends credentials via email
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()
    department = data.get("department", "").strip()
    if not email or not name:
        return jsonify({"message": "Email and full name are required"}), 400
    if not is_valid_email(email):
        return jsonify({"message": "Invalid email format"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "An account with this email already exists"}), 409

    random_pwd = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
    examiner = User(
        email=email,
        password_hash=generate_password_hash(random_pwd),
        full_name=name,
        role="examiner",
        phone=phone,
        department=department,
        is_active=True
    )
    db.session.add(examiner)
    db.session.flush()

    profile = ExaminerProfile(user_id=examiner.id, contact_details=phone, department=department, status="Approved")
    db.session.add(profile)
    db.session.commit()

    email_body = f"<p>Hello {name},</p><p>You have been registered as an Examiner on EMP-V2.</p><p><b>Login:</b> {email}<br><b>Password:</b> {random_pwd}</p><p>Please log in and configure your examination slots.</p>"
    send_email(email, "Your EMP-V2 Examiner Credentials", email_body)
    return jsonify({"message": "Examiner created and credentials emailed", "examiner": examiner.to_dict()}), 201

@admin_bp.route("/examiners/<int:user_id>/toggle-status", methods=["PUT"])
@role_required("admin")
def toggle_examiner_status(user_id):
    # Activates or deactivates an examiner account
    user = User.query.filter_by(id=user_id, role="examiner").first_or_404()
    user.is_active = not user.is_active
    if user.examiner_profile:
        user.examiner_profile.status = "Approved" if user.is_active else "Deactivated"
    db.session.commit()
    status_str = "activated" if user.is_active else "deactivated"
    return jsonify({"message": f"Examiner {status_str} successfully", "is_active": user.is_active}), 200

# --- STUDENT MANAGEMENT ---

@admin_bp.route("/students", methods=["GET"])
@role_required("admin")
def list_students():
    # Lists students with optional search filter
    q = request.args.get("q", "").strip()
    query = User.query.filter_by(role="student")
    if q:
        query = query.filter((User.full_name.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%")) | (User.department.ilike(f"%{q}%")))
    return jsonify([u.to_dict() for u in query.all()]), 200

@admin_bp.route("/students/<int:user_id>/toggle-status", methods=["PUT"])
@role_required("admin")
def toggle_student_status(user_id):
    # Blocks or unblocks a student account
    student = User.query.filter_by(id=user_id, role="student").first_or_404()
    student.is_active = not student.is_active
    db.session.commit()
    status_str = "unblocked" if student.is_active else "blocked"
    return jsonify({"message": f"Student account {status_str}", "is_active": student.is_active}), 200

# --- READ-ONLY SLOTS & BOOKINGS ---

@admin_bp.route("/slots", methods=["GET"])
@role_required("admin")
def list_all_slots():
    # Lists all slots across all examinations
    slots = Slot.query.order_by(Slot.date.desc(), Slot.start_time.asc()).all()
    return jsonify([s.to_dict() for s in slots]), 200

@admin_bp.route("/bookings", methods=["GET"])
@role_required("admin")
def list_all_bookings():
    # Lists all student bookings with optional search filter
    q = request.args.get("q", "").strip()
    query = Booking.query.join(User, Booking.student_id == User.id)
    if q:
        query = query.filter((User.full_name.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%")))
    return jsonify([b.to_dict() for b in query.order_by(Booking.booked_at.desc()).all()]), 200

# --- ADMIN EXCEPTIONAL ACTIONS ---

@admin_bp.route("/exams/<int:exam_id>/publish", methods=["POST"])
@role_required("admin")
def publish_results(exam_id):
    # Publishes examination scores if Closed/Completed and all candidates evaluated
    exam = Examination.query.get_or_404(exam_id)
    if exam.status not in ["Closed", "Completed"]:
        return jsonify({"message": f"Results can only be published when exam is Closed or Completed (current: {exam.status})"}), 400

    active_bookings = [b for s in exam.slots for b in s.bookings if b.status != "Cancelled"]
    unevaluated = [b for b in active_bookings if not b.evaluation]
    if unevaluated:
        return jsonify({"message": f"Cannot publish results: {len(unevaluated)} candidate evaluations pending"}), 400

    exam.results_published = True
    db.session.commit()
    return jsonify({"message": "Examination results published successfully", "exam": exam.to_dict()}), 200

@admin_bp.route("/slots/<int:slot_id>/examiner", methods=["PUT"])
@role_required("admin")
def change_slot_examiner(slot_id):
    # Exceptional action: Reassigns an examination slot to another faculty examiner
    slot = Slot.query.get_or_404(slot_id)
    data = request.get_json() or {}
    new_examiner_id = data.get("examiner_id")
    examiner = User.query.filter_by(id=new_examiner_id, role="examiner").first_or_404()

    # Automatically map examiner to exam if not already assigned
    if not ExamExaminer.query.filter_by(exam_id=slot.exam_id, examiner_id=examiner.id).first():
        db.session.add(ExamExaminer(exam_id=slot.exam_id, examiner_id=examiner.id))

    slot.examiner_id = examiner.id
    db.session.commit()
    return jsonify({"message": f"Slot reassigned to {examiner.full_name}", "slot": slot.to_dict()}), 200

@admin_bp.route("/bookings/<int:booking_id>/reschedule", methods=["PUT"])
@role_required("admin")
def reschedule_booking(booking_id):
    # Exceptional action: Moves candidate booking to another slot of the same exam with open seats
    booking = Booking.query.get_or_404(booking_id)
    data = request.get_json() or {}
    new_slot_id = data.get("new_slot_id")
    new_slot = Slot.query.get_or_404(new_slot_id)
    old_slot = booking.slot

    if old_slot.exam_id != new_slot.exam_id:
        return jsonify({"message": "Cannot reschedule booking to a slot from a different examination"}), 400

    if new_slot.available_seats <= 0:
        return jsonify({"message": "Selected destination slot has no available seats"}), 409

    # Rebalance seats between slots
    old_slot.available_seats += 1
    if old_slot.status == "Full":
        old_slot.status = "Available"

    new_slot.available_seats -= 1
    if new_slot.available_seats == 0:
        new_slot.status = "Full"

    booking.slot_id = new_slot.id
    db.session.commit()
    return jsonify({"message": "Booking rescheduled successfully", "booking": booking.to_dict()}), 200

# --- MANUAL CELERY JOBS TRIGGER FOR VIVA DEMO ---

@admin_bp.route("/trigger-job/daily-reminder", methods=["POST"])
@role_required("admin")
def trigger_daily_reminder():
    # Manually triggers the Celery daily reminder batch job for viva demonstration
    from tasks import daily_reminder_job
    try:
        task = daily_reminder_job.delay()
        return jsonify({"message": "Daily reminder job dispatched", "task_id": task.id}), 202
    except Exception as e:
        print(f"[CELERY FALLBACK] Running reminder job directly: {e}")
        res = daily_reminder_job()
        return jsonify({"message": "Daily reminder job executed (direct)", "result": res}), 200

@admin_bp.route("/trigger-job/monthly-report", methods=["POST"])
@role_required("admin")
def trigger_monthly_report():
    # Manually triggers the Celery monthly summary report for viva demonstration
    from tasks import monthly_report_job
    try:
        task = monthly_report_job.delay()
        return jsonify({"message": "Monthly report job dispatched", "task_id": task.id}), 202
    except Exception as e:
        print(f"[CELERY FALLBACK] Running monthly report directly: {e}")
        res = monthly_report_job()
        return jsonify({"message": "Monthly report job executed (direct)", "result": res}), 200
