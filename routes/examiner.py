# routes/examiner.py
# Examiner blueprint for EMP-V2.
# Handles examiner dashboard metrics, assigned exams, slot management, and slot booking views.

from flask import Blueprint, request, jsonify, g
from extensions import db
from models import Examination, Slot, Booking, ExamExaminer
from helpers import role_required, get_current_user

examiner_bp = Blueprint("examiner", __name__, url_prefix="/api/examiner")

@examiner_bp.route("/dashboard", methods=["GET"])
@role_required("examiner")
def get_examiner_dashboard():
    # Returns metrics for the logged-in examiner
    user = get_current_user()
    assigned_count = ExamExaminer.query.filter_by(examiner_id=user.id).count()
    slots = Slot.query.filter_by(examiner_id=user.id).all()
    slot_ids = [s.id for s in slots]
    
    total_booked = Booking.query.filter(Booking.slot_id.in_(slot_ids)).count() if slot_ids else 0
    pending_eval = 0
    if slot_ids:
        for b in Booking.query.filter(Booking.slot_id.in_(slot_ids), Booking.status == "Booked").all():
            if not b.evaluation:
                pending_eval += 1

    return jsonify({
        "assigned_exams": assigned_count,
        "created_slots": len(slots),
        "booked_students": total_booked,
        "pending_evaluations": pending_eval
    }), 200

@examiner_bp.route("/exams", methods=["GET"])
@role_required("examiner")
def list_assigned_exams():
    # Lists all examinations assigned to the logged-in examiner
    user = get_current_user()
    q = request.args.get("q", "").strip()
    query = Examination.query.join(ExamExaminer, Examination.id == ExamExaminer.exam_id).filter(ExamExaminer.examiner_id == user.id)
    if q:
        query = query.filter(Examination.name.ilike(f"%{q}%"))
    exams = query.order_by(Examination.id.desc()).all()
    return jsonify([e.to_dict() for e in exams]), 200

@examiner_bp.route("/slots", methods=["GET"])
@role_required("examiner")
def list_examiner_slots():
    # Lists slots created by the logged-in examiner
    user = get_current_user()
    exam_id = request.args.get("exam_id")
    query = Slot.query.filter_by(examiner_id=user.id)
    if exam_id:
        query = query.filter_by(exam_id=int(exam_id))
    slots = query.order_by(Slot.date.asc(), Slot.start_time.asc()).all()
    
    result = []
    for s in slots:
        data = s.to_dict()
        data["bookings_count"] = len(s.bookings)
        result.append(data)
    return jsonify(result), 200

@examiner_bp.route("/slots", methods=["POST"])
@role_required("examiner")
def create_slot():
    # Creates a slot only during Slot Creation period for assigned exams
    user = get_current_user()
    data = request.get_json() or {}
    exam_id = data.get("exam_id")
    date = data.get("date", "").strip()
    start_time = data.get("start_time", "").strip()
    end_time = data.get("end_time", "").strip()
    capacity = data.get("capacity", 1)

    if not exam_id or not date or not start_time or not end_time:
        return jsonify({"message": "Examination, date, start time, and end time are required"}), 400

    exam = Examination.query.get_or_404(exam_id)
    if not ExamExaminer.query.filter_by(exam_id=exam_id, examiner_id=user.id).first():
        return jsonify({"message": "You are not assigned to this examination"}), 403

    if exam.status != "Slot Creation":
        return jsonify({"message": "Slots can only be created during the 'Slot Creation' phase"}), 400

    if end_time <= start_time:
        return jsonify({"message": "End time must be later than start time"}), 400

    try:
        cap_int = int(capacity)
        if cap_int < 1:
            return jsonify({"message": "Capacity must be at least 1"}), 400
    except ValueError:
        return jsonify({"message": "Capacity must be a valid integer"}), 400

    slot = Slot(
        exam_id=exam.id,
        examiner_id=user.id,
        date=date,
        start_time=start_time,
        end_time=end_time,
        capacity=cap_int,
        available_seats=cap_int,
        status="Available",
        meeting_link=data.get("meeting_link", "").strip()
    )
    db.session.add(slot)
    db.session.commit()
    return jsonify(slot.to_dict()), 201

@examiner_bp.route("/slots/<int:slot_id>", methods=["PUT"])
@role_required("examiner")
def update_slot(slot_id):
    # Updates a slot if unbooked and exam is in Draft or Slot Creation
    user = get_current_user()
    slot = Slot.query.get_or_404(slot_id)
    if slot.examiner_id != user.id:
        return jsonify({"message": "Forbidden: You do not own this slot"}), 403

    if slot.examination.status not in ["Draft", "Slot Creation"]:
        return jsonify({"message": "Cannot edit slot once examination booking is open or closed"}), 400

    if slot.bookings:
        return jsonify({"message": "Cannot edit a slot that already has student bookings"}), 409

    data = request.get_json() or {}
    start_time = data.get("start_time", slot.start_time)
    end_time = data.get("end_time", slot.end_time)
    if end_time <= start_time:
        return jsonify({"message": "End time must be later than start time"}), 400

    slot.date = data.get("date", slot.date)
    slot.start_time = start_time
    slot.end_time = end_time
    if "capacity" in data:
        cap = int(data["capacity"])
        slot.capacity = cap
        slot.available_seats = cap
    slot.meeting_link = data.get("meeting_link", slot.meeting_link)

    db.session.commit()
    return jsonify(slot.to_dict()), 200

@examiner_bp.route("/slots/<int:slot_id>", methods=["DELETE"])
@role_required("examiner")
def delete_slot(slot_id):
    # Deletes a slot if unbooked and exam is in Draft or Slot Creation
    user = get_current_user()
    slot = Slot.query.get_or_404(slot_id)
    if slot.examiner_id != user.id:
        return jsonify({"message": "Forbidden: You do not own this slot"}), 403

    if slot.examination.status not in ["Draft", "Slot Creation"]:
        return jsonify({"message": "Cannot delete slot once booking has commenced"}), 400

    if slot.bookings:
        return jsonify({"message": "Cannot delete a slot that already has student bookings"}), 409

    db.session.delete(slot)
    db.session.commit()
    return jsonify({"message": "Slot deleted successfully"}), 200

@examiner_bp.route("/slots/<int:slot_id>/bookings", methods=["GET"])
@role_required("examiner")
def view_slot_bookings(slot_id):
    # Displays all student bookings within an examiner's slot
    user = get_current_user()
    slot = Slot.query.get_or_404(slot_id)
    if slot.examiner_id != user.id:
        return jsonify({"message": "Forbidden: You do not own this slot"}), 403

    result = []
    for b in slot.bookings:
        d = b.to_dict()
        d["evaluated"] = b.evaluation is not None
        d["evaluation_marks"] = b.evaluation.total_marks if b.evaluation else None
        result.append(d)
    return jsonify(result), 200
