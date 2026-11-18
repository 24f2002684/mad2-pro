# models.py
# SQLAlchemy data models for the Examination Management Portal V2.
# Defines User, ExaminerProfile, Course, Examination, Rubric, Slot, Booking, and Evaluation.

from datetime import datetime
from extensions import db

class User(db.Model):
    # Unified user table for Admin, Examiner, and Student roles
    __tablename__ = "user"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # "admin", "examiner", "student"
    phone = db.Column(db.String(20), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    examiner_profile = db.relationship("ExaminerProfile", uselist=False, backref="user", cascade="all, delete-orphan")
    examiner_slots = db.relationship("Slot", backref="examiner", foreign_keys="Slot.examiner_id")
    student_bookings = db.relationship("Booking", backref="student", foreign_keys="Booking.student_id")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "phone": self.phone or "",
            "department": self.department or "",
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else ""
        }

class ExaminerProfile(db.Model):
    # Additional profile data for examiners
    __tablename__ = "examiner_profile"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)
    contact_details = db.Column(db.String(200), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(20), default="Approved", nullable=False)  # "Approved", "Deactivated"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "contact_details": self.contact_details or "",
            "department": self.department or "",
            "status": self.status
        }

class Course(db.Model):
    # Academic course offering examinations
    __tablename__ = "course"
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default="Active", nullable=False)  # "Active", "Inactive"

    examinations = db.relationship("Examination", backref="course", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "description": self.description or "",
            "status": self.status
        }

class ExamExaminer(db.Model):
    # Association table mapping assigned examiners to examinations
    __tablename__ = "exam_examiner"
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("examination.id"), nullable=False)
    examiner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

class Examination(db.Model):
    # Examination under a course with strict timeline and status workflow
    __tablename__ = "examination"
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey("course.id"), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    exam_type = db.Column(db.String(50), nullable=False)  # Viva / Practical / Project Demo / Assessment
    duration = db.Column(db.Integer, nullable=False)  # in minutes
    max_marks = db.Column(db.Integer, nullable=False)
    instructions = db.Column(db.Text, nullable=True)
    slot_creation_start = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    slot_creation_end = db.Column(db.String(10), nullable=False)
    booking_start = db.Column(db.String(10), nullable=False)
    booking_end = db.Column(db.String(10), nullable=False)
    status = db.Column(db.String(30), default="Draft", nullable=False)  # Draft, Slot Creation, Booking Open, Closed, Completed
    results_published = db.Column(db.Boolean, default=False, nullable=False)

    rubrics = db.relationship("Rubric", backref="examination", cascade="all, delete-orphan")
    slots = db.relationship("Slot", backref="examination", cascade="all, delete-orphan")
    assigned_examiners = db.relationship("User", secondary="exam_examiner", backref="assigned_exams")

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "course_code": self.course.code if self.course else "",
            "course_name": self.course.name if self.course else "",
            "name": self.name,
            "exam_type": self.exam_type,
            "duration": self.duration,
            "max_marks": self.max_marks,
            "instructions": self.instructions or "",
            "slot_creation_start": self.slot_creation_start,
            "slot_creation_end": self.slot_creation_end,
            "booking_start": self.booking_start,
            "booking_end": self.booking_end,
            "status": self.status,
            "results_published": self.results_published
        }

class Rubric(db.Model):
    # Evaluation rubric criteria linked to an examination
    __tablename__ = "rubric"
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("examination.id"), nullable=False)
    criterion_name = db.Column(db.String(150), nullable=False)
    max_marks = db.Column(db.Integer, nullable=False)
    weightage = db.Column(db.Integer, default=0, nullable=False)  # Percentage, informational
    description = db.Column(db.Text, nullable=True)

    scores = db.relationship("EvaluationScore", backref="rubric", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "exam_id": self.exam_id,
            "criterion_name": self.criterion_name,
            "max_marks": self.max_marks,
            "weightage": self.weightage,
            "description": self.description or ""
        }

class Slot(db.Model):
    # Time slot created by an examiner for an examination
    __tablename__ = "slot"
    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("examination.id"), nullable=False)
    examiner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    date = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    start_time = db.Column(db.String(10), nullable=False)  # HH:MM
    end_time = db.Column(db.String(10), nullable=False)  # HH:MM
    capacity = db.Column(db.Integer, default=1, nullable=False)
    available_seats = db.Column(db.Integer, default=1, nullable=False)
    status = db.Column(db.String(20), default="Available", nullable=False)  # Available, Full, Cancelled, Completed
    meeting_link = db.Column(db.String(255), nullable=True)

    bookings = db.relationship("Booking", backref="slot", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "exam_id": self.exam_id,
            "exam_name": self.examination.name if self.examination else "",
            "examiner_id": self.examiner_id,
            "examiner_name": self.examiner.full_name if self.examiner else "",
            "date": self.date,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "capacity": self.capacity,
            "available_seats": self.available_seats,
            "status": self.status,
            "meeting_link": self.meeting_link or ""
        }

class Booking(db.Model):
    # Student booking record for an examination slot
    __tablename__ = "booking"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    slot_id = db.Column(db.Integer, db.ForeignKey("slot.id"), nullable=False)
    booked_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(20), default="Booked", nullable=False)  # Booked, Cancelled, Completed

    evaluation = db.relationship("Evaluation", uselist=False, backref="booking", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else "",
            "student_email": self.student.email if self.student else "",
            "slot_id": self.slot_id,
            "slot_date": self.slot.date if self.slot else "",
            "slot_start": self.slot.start_time if self.slot else "",
            "slot_end": self.slot.end_time if self.slot else "",
            "exam_id": self.slot.exam_id if self.slot else None,
            "exam_name": self.slot.examination.name if (self.slot and self.slot.examination) else "",
            "examiner_name": self.slot.examiner.full_name if (self.slot and self.slot.examiner) else "",
            "booked_at": self.booked_at.isoformat() if self.booked_at else "",
            "status": self.status
        }

class Evaluation(db.Model):
    # Evaluation record containing total marks and remarks for a booking
    __tablename__ = "evaluation"
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("booking.id"), unique=True, nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    examiner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    total_marks = db.Column(db.Float, nullable=False)
    remarks = db.Column(db.Text, nullable=False)
    evaluated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(20), default="Submitted", nullable=False)

    scores = db.relationship("EvaluationScore", backref="evaluation", cascade="all, delete-orphan")
    student = db.relationship("User", foreign_keys=[student_id])
    examiner = db.relationship("User", foreign_keys=[examiner_id])

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else "",
            "examiner_id": self.examiner_id,
            "examiner_name": self.examiner.full_name if self.examiner else "",
            "total_marks": self.total_marks,
            "remarks": self.remarks,
            "evaluated_at": self.evaluated_at.isoformat() if self.evaluated_at else "",
            "status": self.status,
            "scores": [s.to_dict() for s in self.scores]
        }

class EvaluationScore(db.Model):
    # Breakdown of marks per rubric criterion
    __tablename__ = "evaluation_score"
    id = db.Column(db.Integer, primary_key=True)
    evaluation_id = db.Column(db.Integer, db.ForeignKey("evaluation.id"), nullable=False)
    rubric_id = db.Column(db.Integer, db.ForeignKey("rubric.id"), nullable=False)
    marks = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "evaluation_id": self.evaluation_id,
            "rubric_id": self.rubric_id,
            "criterion_name": self.rubric.criterion_name if self.rubric else "",
            "max_marks": self.rubric.max_marks if self.rubric else 0,
            "marks": self.marks
        }
