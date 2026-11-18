# routes/examiner.py
# Examiner blueprint for EMP-V2.
# Handles examiner dashboard metrics, assigned exams, slot management, and slot booking views.

from flask import Blueprint, request, jsonify, g
from extensions import db
from models import Examination, Slot, Booking, ExamExaminer, Rubric, Evaluation, EvaluationScore
from helpers import role_required, get_current_user, cache_delete

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
    cache_delete(f"cache:exam_slots:{exam.id}", "cache:student_exams*")
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
    cache_delete(f"cache:exam_slots:{slot.exam_id}", "cache:student_exams*")
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

    exam_id = slot.exam_id
    db.session.delete(slot)
    db.session.commit()
    cache_delete(f"cache:exam_slots:{exam_id}", "cache:student_exams*")
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

@examiner_bp.route("/slots/<int:slot_id>/complete", methods=["PUT"])
@role_required("examiner")
def complete_slot(slot_id):
    # Marks a slot completed if all candidates evaluated, and auto-completes exam if Closed
    user = get_current_user()
    slot = Slot.query.get_or_404(slot_id)
    if slot.examiner_id != user.id:
        return jsonify({"message": "Forbidden: You do not own this slot"}), 403

    active_bookings = [b for b in slot.bookings if b.status != "Cancelled"]
    unevaluated = [b for b in active_bookings if not b.evaluation]
    if unevaluated:
        return jsonify({"message": f"Cannot complete slot: {len(unevaluated)} candidates still need evaluation"}), 400

    slot.status = "Completed"
    exam = slot.examination
    if exam.status == "Closed":
        active_slots = [s for s in exam.slots if s.status != "Cancelled"]
        if all(s.status == "Completed" for s in active_slots):
            exam.status = "Completed"

    db.session.commit()
    cache_delete(f"cache:exam_slots:{slot.exam_id}", "cache:student_exams*", "cache:admin_exams*")
    return jsonify({"message": "Slot marked as Completed", "slot": slot.to_dict(), "exam_status": exam.status}), 200

@examiner_bp.route("/bookings/<int:booking_id>/evaluation", methods=["GET"])
@role_required("examiner")
def get_booking_evaluation(booking_id):
    # Fetches candidate evaluation details and rubrics
    user = get_current_user()
    booking = Booking.query.get_or_404(booking_id)
    if booking.slot.examiner_id != user.id:
        return jsonify({"message": "Forbidden: You do not own this slot"}), 403

    rubrics = Rubric.query.filter_by(exam_id=booking.slot.exam_id).all()
    evaluation = booking.evaluation.to_dict() if booking.evaluation else None
    return jsonify({
        "booking": booking.to_dict(),
        "exam_max_marks": booking.slot.examination.max_marks,
        "results_published": booking.slot.examination.results_published,
        "rubrics": [r.to_dict() for r in rubrics],
        "evaluation": evaluation
    }), 200

@examiner_bp.route("/bookings/<int:booking_id>/evaluation", methods=["POST"])
@role_required("examiner")
def submit_booking_evaluation(booking_id):
    # Submits or updates rubric scores and remarks for candidate evaluation
    user = get_current_user()
    booking = Booking.query.get_or_404(booking_id)
    if booking.slot.examiner_id != user.id:
        return jsonify({"message": "Forbidden: You do not own this slot"}), 403

    if booking.slot.examination.results_published:
        return jsonify({"message": "Cannot edit evaluation once results are published"}), 400

    data = request.get_json() or {}
    remarks = data.get("remarks", "").strip()
    scores_data = data.get("scores", [])

    if not remarks:
        return jsonify({"message": "Evaluation remarks are required"}), 400
    if not scores_data:
        return jsonify({"message": "Scores for rubrics are required"}), 400

    rubrics_dict = {r.id: r for r in Rubric.query.filter_by(exam_id=booking.slot.exam_id).all()}
    total = 0.0

    # Validate marks
    for s in scores_data:
        rid = s.get("rubric_id")
        marks = float(s.get("marks", 0))
        if rid not in rubrics_dict:
            return jsonify({"message": f"Invalid rubric ID {rid}"}), 400
        rubric = rubrics_dict[rid]
        if marks < 0 or marks > rubric.max_marks:
            return jsonify({"message": f"Marks for '{rubric.criterion_name}' must be between 0 and {rubric.max_marks}"}), 400
        total += marks

    evaluation = booking.evaluation
    if not evaluation:
        evaluation = Evaluation(
            booking_id=booking.id,
            student_id=booking.student_id,
            examiner_id=user.id,
            total_marks=total,
            remarks=remarks,
            status="Submitted"
        )
        db.session.add(evaluation)
        db.session.flush()
    else:
        evaluation.total_marks = total
        evaluation.remarks = remarks
        EvaluationScore.query.filter_by(evaluation_id=evaluation.id).delete()

    for s in scores_data:
        score_row = EvaluationScore(
            evaluation_id=evaluation.id,
            rubric_id=s["rubric_id"],
            marks=float(s["marks"])
        )
        db.session.add(score_row)

    booking.status = "Completed"
    db.session.commit()
    return jsonify({"message": "Evaluation submitted successfully", "evaluation": evaluation.to_dict()}), 200
