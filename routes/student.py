# routes/student.py
# Student blueprint for EMP-V2.
# Handles student dashboard metrics, profile management, examination browsing, slot booking, and cancellation.

import os
from datetime import date
from flask import Blueprint, request, jsonify, send_from_directory
from extensions import db
from models import User, Course, Examination, Slot, Booking
from helpers import role_required, get_current_user, is_valid_phone, cache_get, cache_set, cache_delete
from config import Config

student_bp = Blueprint("student", __name__, url_prefix="/api/student")

@student_bp.route("/dashboard", methods=["GET"])
@role_required("student")
def get_student_dashboard():
    # Returns summary metrics and active bookings for the logged-in student
    user = get_current_user()
    today_str = date.today().isoformat()

    available_exams = Examination.query.filter_by(status="Booking Open").count()
    open_exam_ids = [e.id for e in Examination.query.filter_by(status="Booking Open").all()]
    available_slots = Slot.query.filter(Slot.exam_id.in_(open_exam_ids), Slot.status == "Available").count() if open_exam_ids else 0

    all_bookings = Booking.query.filter_by(student_id=user.id).all()
    upcoming_count = 0
    published_results = 0

    for b in all_bookings:
        if b.status == "Booked" and b.slot and b.slot.date >= today_str:
            upcoming_count += 1
        if b.slot and b.slot.examination and b.slot.examination.results_published and b.evaluation:
            published_results += 1

    recent = [b.to_dict() for b in Booking.query.filter_by(student_id=user.id).order_by(Booking.booked_at.desc()).limit(5).all()]

    return jsonify({
        "available_exams": available_exams,
        "available_slots": available_slots,
        "upcoming_exams": upcoming_count,
        "booked_slots": len(all_bookings),
        "published_results": published_results,
        "recent_bookings": recent
    }), 200

@student_bp.route("/profile", methods=["GET"])
@role_required("student")
def get_student_profile():
    # Returns profile information of the logged-in student
    user = get_current_user()
    return jsonify(user.to_dict()), 200

@student_bp.route("/profile", methods=["PUT"])
@role_required("student")
def update_student_profile():
    # Updates editable profile attributes (phone and department)
    user = get_current_user()
    data = request.get_json() or {}
    phone = data.get("phone", "").strip()
    department = data.get("department", "").strip()

    if phone and not is_valid_phone(phone):
        return jsonify({"message": "Phone number must be exactly 10 digits"}), 400

    user.phone = phone
    user.department = department
    db.session.commit()
    return jsonify({"message": "Profile updated successfully", "user": user.to_dict()}), 200

@student_bp.route("/exams", methods=["GET"])
@role_required("student")
def list_student_exams():
    # Lists examinations open or scheduled for students with Redis caching
    user = get_current_user()
    q = request.args.get("q", "").strip()
    course_id = request.args.get("course_id")
    exam_type = request.args.get("exam_type")
    status_filter = request.args.get("status")

    cache_key = f"cache:student_exams:u={user.id}:q={q}:c={course_id}:t={exam_type}:s={status_filter}"
    cached = cache_get(cache_key)
    if cached is not None:
        resp = jsonify(cached)
        resp.headers["X-Cache"] = "HIT"
        return resp, 200

    query = Examination.query.filter(Examination.status.in_(["Booking Open", "Closed", "Completed"]))
    if q:
        query = query.filter((Examination.name.ilike(f"%{q}%")) | (Examination.exam_type.ilike(f"%{q}%")))
    if course_id:
        query = query.filter_by(course_id=int(course_id))
    if exam_type:
        query = query.filter_by(exam_type=exam_type)
    if status_filter:
        query = query.filter_by(status=status_filter)

    exams = query.order_by(Examination.id.desc()).all()
    
    # Check student active bookings
    booked_exam_ids = set()
    active_bookings = Booking.query.filter_by(student_id=user.id, status="Booked").all()
    for b in active_bookings:
        if b.slot:
            booked_exam_ids.add(b.slot.exam_id)

    result = []
    for e in exams:
        d = e.to_dict()
        d["has_active_booking"] = e.id in booked_exam_ids
        d["total_slots"] = len(e.slots)
        d["available_slots"] = len([s for s in e.slots if s.status == "Available" and s.available_seats > 0])
        result.append(d)

    cache_set(cache_key, result, timeout=120)
    resp = jsonify(result)
    resp.headers["X-Cache"] = "MISS"
    return resp, 200

@student_bp.route("/exams/<int:exam_id>/slots", methods=["GET"])
@role_required("student")
def list_exam_slots(exam_id):
    # Lists available slots for an examination with Redis caching
    cache_key = f"cache:exam_slots:{exam_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        resp = jsonify(cached)
        resp.headers["X-Cache"] = "HIT"
        return resp, 200

    exam = Examination.query.get_or_404(exam_id)
    slots = Slot.query.filter_by(exam_id=exam.id).order_by(Slot.date.asc(), Slot.start_time.asc()).all()
    result = [s.to_dict() for s in slots]
    cache_set(cache_key, result, timeout=120)

    resp = jsonify(result)
    resp.headers["X-Cache"] = "MISS"
    return resp, 200

@student_bp.route("/bookings", methods=["POST"])
@role_required("student")
def book_slot():
    # Books an examination slot and invalidates related slot and exam caches
    user = get_current_user()
    data = request.get_json() or {}
    slot_id = data.get("slot_id")
    if not slot_id:
        return jsonify({"message": "Slot ID is required"}), 400

    slot = Slot.query.get_or_404(slot_id)
    exam = slot.examination
    today_str = date.today().isoformat()

    if exam.status != "Booking Open":
        return jsonify({"message": f"Booking is not open for this examination (Status: {exam.status})"}), 400

    if today_str > exam.booking_end:
        return jsonify({"message": "Booking deadline for this examination has passed"}), 400

    # Ensure only ONE active (Booked) booking per examination
    existing = Booking.query.join(Slot, Booking.slot_id == Slot.id).filter(
        Slot.exam_id == exam.id,
        Booking.student_id == user.id,
        Booking.status == "Booked"
    ).first()
    if existing:
        return jsonify({"message": "You already have an active booking for this examination"}), 409

    if slot.status != "Available" or slot.available_seats <= 0:
        return jsonify({"message": "This slot has no available seats remaining"}), 409

    booking = Booking(
        student_id=user.id,
        slot_id=slot.id,
        status="Booked"
    )
    slot.available_seats -= 1
    if slot.available_seats == 0:
        slot.status = "Full"

    db.session.add(booking)
    db.session.commit()
    cache_delete(f"cache:exam_slots:{exam.id}", f"cache:student_exams:u={user.id}*")

    return jsonify({"message": "Slot booked successfully", "booking": booking.to_dict()}), 201

@student_bp.route("/bookings/<int:booking_id>/cancel", methods=["PUT"])
@role_required("student")
def cancel_booking(booking_id):
    # Cancels an active booking and invalidates related slot and exam caches
    user = get_current_user()
    booking = Booking.query.get_or_404(booking_id)

    if booking.student_id != user.id:
        return jsonify({"message": "Forbidden: You do not own this booking"}), 403

    if booking.status != "Booked":
        return jsonify({"message": f"Cannot cancel booking with status '{booking.status}'"}), 400

    exam = booking.slot.examination
    today_str = date.today().isoformat()

    if exam.status != "Booking Open" or today_str > exam.booking_end:
        return jsonify({"message": "Bookings cannot be cancelled after the deadline or once booking is closed"}), 400

    booking.status = "Cancelled"
    slot = booking.slot
    slot.available_seats += 1
    if slot.status == "Full":
        slot.status = "Available"

    db.session.commit()
    cache_delete(f"cache:exam_slots:{exam.id}", f"cache:student_exams:u={user.id}*")
    return jsonify({"message": "Booking cancelled successfully"}), 200

@student_bp.route("/history", methods=["GET"])
@role_required("student")
def get_student_history():
    # Returns candidate's historical bookings; reveals evaluations only if results are published
    user = get_current_user()
    bookings = Booking.query.filter_by(student_id=user.id).order_by(Booking.booked_at.desc()).all()

    result = []
    for b in bookings:
        d = b.to_dict()
        exam = b.slot.examination if b.slot else None
        d["results_published"] = exam.results_published if exam else False

        # Results and feedback are visible ONLY when published
        if exam and exam.results_published and b.evaluation:
            d["evaluation"] = b.evaluation.to_dict()
        else:
            d["evaluation"] = None
        result.append(d)

    return jsonify(result), 200

# --- USER-TRIGGERED CSV EXPORT ---

@student_bp.route("/export", methods=["POST"])
@role_required("student")
def trigger_export():
    # Initiates asynchronous Celery task to export student's examination history
    user = get_current_user()
    try:
        from tasks import export_student_history_job
        try:
            async_task = export_student_history_job.delay(user.id)
            return jsonify({"task_id": async_task.id, "status": "PENDING"}), 202
        except Exception as broker_err:
            # Fallback to direct execution if Celery broker/worker is offline during local evaluation
            print(f"[CELERY FALLBACK] Executing export directly: {broker_err}")
            res = export_student_history_job(user.id)
            return jsonify({"task_id": "direct_complete", "status": "SUCCESS", "filename": res.get("filename")}), 200
    except Exception as e:
        return jsonify({"message": f"Export failed: {str(e)}"}), 500

@student_bp.route("/export/<task_id>", methods=["GET"])
@role_required("student")
def check_export_status(task_id):
    # Polls status of Celery export job
    if task_id == "direct_complete":
        return jsonify({"status": "SUCCESS"}), 200
    try:
        from celery.result import AsyncResult
        result = AsyncResult(task_id)
        if result.state == "SUCCESS":
            return jsonify({"status": "SUCCESS", "filename": result.result.get("filename")}), 200
        elif result.state in ["FAILURE", "REVOKED"]:
            return jsonify({"status": "FAILURE", "message": "Background task failed"}), 500
        else:
            return jsonify({"status": result.state}), 200
    except Exception as err:
        return jsonify({"status": "FAILURE", "message": str(err)}), 500

@student_bp.route("/export/download/<filename>", methods=["GET"])
@role_required("student")
def download_export(filename):
    # Securely serves generated CSV export file to authenticated student
    user = get_current_user()
    if not filename.startswith(f"student_{user.id}_"):
        return jsonify({"message": "Forbidden: You cannot access other students' exports"}), 403

    exports_dir = os.path.join(Config.BASE_DIR, "exports")
    return send_from_directory(exports_dir, filename, as_attachment=True)
