# seed_demo.py
# Comprehensive demo data seeding script for EMP-V2.
# Seeds realistic courses, examinations across all lifecycle statuses,
# examiners, students, slots, bookings, rubrics, and evaluations for viva demonstration.

from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from app import create_app
from extensions import db
from models import (
    User, ExaminerProfile, Course, Examination,
    ExamExaminer, Rubric, Slot, Booking, Evaluation, EvaluationScore
)

def seed_demo_data():
    app = create_app()
    with app.app_context():
        print("=" * 60)
        print("SEEDING EMP-V2 DEMO DATA FOR VIVA DEMONSTRATION")
        print("=" * 60)

        # 1. USERS: Admin, Examiners, Students
        users_data = [
            ("admin@emp.com", "Admin@123", "System Administrator", "admin", "9999999999", "Administration"),
            ("prof.sharma@emp.com", "Examiner@123", "Dr. Ramesh Sharma", "examiner", "9876543210", "Computer Science"),
            ("prof.anand@emp.com", "Examiner@123", "Dr. Kavita Anand", "examiner", "9876543211", "Data Science"),
            ("student1@study.iitm.ac.in", "Student@123", "Aarav Kumar", "student", "9123456780", "BS Degree (Roll: 21F1000101)"),
            ("student2@study.iitm.ac.in", "Student@123", "Bhavna Patel", "student", "9123456781", "BS Degree (Roll: 21F1000202)"),
            ("student3@study.iitm.ac.in", "Student@123", "Chetan Singh", "student", "9123456782", "BS Degree (Roll: 21F1000303)")
        ]

        user_map = {}
        for email, pwd, name, role, phone, dept in users_data:
            u = User.query.filter_by(email=email).first()
            if not u:
                u = User(
                    email=email,
                    password_hash=generate_password_hash(pwd),
                    full_name=name,
                    role=role,
                    phone=phone,
                    department=dept,
                    is_active=True
                )
                db.session.add(u)
                db.session.flush()
                print(f"[USER] Created {role}: {email} ({name})")
            user_map[email] = u

            if role == "examiner":
                ep = ExaminerProfile.query.filter_by(user_id=u.id).first()
                if not ep:
                    ep = ExaminerProfile(
                        user_id=u.id,
                        contact_details=phone,
                        department=dept,
                        status="Approved"
                    )
                    db.session.add(ep)

        db.session.commit()

        # 2. COURSES
        courses_data = [
            ("CS2001", "Modern Application Development II", "Covers Flask REST APIs, Vue 3 SPA, Celery, Redis caching, and PWA integration."),
            ("CS1001", "Programming in Python", "Foundations of Python programming, algorithms, data structures, and OOP."),
            ("CS2002", "System Commands and Shell Scripting", "Unix commands, shell scripting, process scheduling, and automation tools.")
        ]

        course_map = {}
        for code, name, desc in courses_data:
            c = Course.query.filter_by(code=code).first()
            if not c:
                c = Course(code=code, name=name, description=desc, status="Active")
                db.session.add(c)
                db.session.flush()
                print(f"[COURSE] Created course: {code} - {name}")
            course_map[code] = c

        db.session.commit()

        today = datetime.utcnow().date()
        past_date = (today - timedelta(days=5)).strftime("%Y-%m-%d")
        recent_date = (today - timedelta(days=2)).strftime("%Y-%m-%d")
        now_date = today.strftime("%Y-%m-%d")
        future_date1 = (today + timedelta(days=5)).strftime("%Y-%m-%d")
        future_date2 = (today + timedelta(days=12)).strftime("%Y-%m-%d")

        # 3. EXAMINATIONS (Covering all 5 lifecycle statuses)
        exams_specs = [
            {
                "name": "MAD-II Capstone Project Viva",
                "course_code": "CS2001",
                "type": "Project Demo",
                "duration": 20,
                "max_marks": 100,
                "instructions": "Demonstrate the EMP-V2 application, live database, Celery jobs, and answer viva queries.",
                "slot_start": past_date, "slot_end": recent_date,
                "book_start": past_date, "book_end": recent_date,
                "status": "Completed",
                "results_published": True,
                "examiners": ["prof.sharma@emp.com", "prof.anand@emp.com"],
                "rubrics": [
                    ("Code Architecture & Best Practices", 30, 30, "Clean separation of blueprints, models, config, and components."),
                    ("API Security, Caching & Background Jobs", 35, 35, "JWT role enforcement, Redis X-Cache HIT/MISS, Celery export."),
                    ("Viva Demonstration & Concept Defense", 35, 35, "Deep understanding of full-stack architectural design choices.")
                ]
            },
            {
                "name": "Python Comprehensive Oral Exam",
                "course_code": "CS1001",
                "type": "Viva",
                "duration": 15,
                "max_marks": 50,
                "instructions": "Oral viva on core Python data structures, decorators, generators, and exception handling.",
                "slot_start": recent_date, "slot_end": now_date,
                "book_start": now_date, "book_end": future_date1,
                "status": "Booking Open",
                "results_published": False,
                "examiners": ["prof.sharma@emp.com"],
                "rubrics": [
                    ("Core Data Structures & Complexity", 25, 50, "Lists, dicts, sets, hash tables, and big-O efficiency."),
                    ("OOP, Decorators & Clean Code", 25, 50, "Classes, dunder methods, decorators, and comprehension syntax.")
                ]
            },
            {
                "name": "Shell Scripting Lab Demo",
                "course_code": "CS2002",
                "type": "Practical",
                "duration": 30,
                "max_marks": 50,
                "instructions": "Examiners configure available interview slots during the Slot Creation phase.",
                "slot_start": now_date, "slot_end": future_date1,
                "book_start": future_date1, "book_end": future_date2,
                "status": "Slot Creation",
                "results_published": False,
                "examiners": ["prof.anand@emp.com"],
                "rubrics": [
                    ("Script Automation & Pipes", 25, 50, "Pipes, awk, sed, grep, and cron automation."),
                    ("Process Handling & Signals", 25, 50, "File permissions, job control, signals, and bash scripting.")
                ]
            },
            {
                "name": "Advanced Database Systems Viva",
                "course_code": "CS2001",
                "type": "Assessment",
                "duration": 25,
                "max_marks": 100,
                "instructions": "Draft examination awaiting slot creation timeline initiation.",
                "slot_start": future_date1, "slot_end": future_date2,
                "book_start": future_date1, "book_end": future_date2,
                "status": "Draft",
                "results_published": False,
                "examiners": ["prof.sharma@emp.com"],
                "rubrics": [
                    ("Schema Normalization & Indexing", 50, 50, "3NF/BCNF, B-Trees, Query Optimization."),
                    ("ACID Transactions & Concurrency", 50, 50, "Isolation levels, 2PL, MVCC, and write-ahead logs.")
                ]
            },
            {
                "name": "Web Systems Architecture Review",
                "course_code": "CS2001",
                "type": "Project Demo",
                "duration": 20,
                "max_marks": 100,
                "instructions": "Booking is closed. Examiners are completing evaluations.",
                "slot_start": past_date, "slot_end": now_date,
                "book_start": past_date, "book_end": now_date,
                "status": "Closed",
                "results_published": False,
                "examiners": ["prof.anand@emp.com"],
                "rubrics": [
                    ("Client-Server Separation", 50, 50, "REST API conventions, stateless JWT auth."),
                    ("Performance & Caching Strategy", 50, 50, "Cache invalidation patterns and offline PWA.")
                ]
            }
        ]

        exam_map = {}
        for spec in exams_specs:
            exam = Examination.query.filter_by(name=spec["name"]).first()
            if not exam:
                exam = Examination(
                    course_id=course_map[spec["course_code"]].id,
                    name=spec["name"],
                    exam_type=spec["type"],
                    duration=spec["duration"],
                    max_marks=spec["max_marks"],
                    instructions=spec["instructions"],
                    slot_creation_start=spec["slot_start"],
                    slot_creation_end=spec["slot_end"],
                    booking_start=spec["book_start"],
                    booking_end=spec["book_end"],
                    status=spec["status"],
                    results_published=spec["results_published"]
                )
                db.session.add(exam)
                db.session.flush()
                print(f"[EXAM] Created exam: {spec['name']} ({spec['status']})")

                # Assign examiners
                for ex_email in spec["examiners"]:
                    ee = ExamExaminer(exam_id=exam.id, examiner_id=user_map[ex_email].id)
                    db.session.add(ee)

                # Add rubrics
                for r_name, r_marks, r_wt, r_desc in spec["rubrics"]:
                    rub = Rubric(
                        exam_id=exam.id,
                        criterion_name=r_name,
                        max_marks=r_marks,
                        weightage=r_wt,
                        description=r_desc
                    )
                    db.session.add(rub)

            exam_map[spec["name"]] = exam

        db.session.commit()

        # 4. SLOTS, BOOKINGS & EVALUATIONS FOR MAD-II CAPSTONE (Completed & Published)
        mad2_exam = exam_map["MAD-II Capstone Project Viva"]
        mad2_rubrics = Rubric.query.filter_by(exam_id=mad2_exam.id).all()

        # Slot 1: Dr. Sharma
        slot1 = Slot.query.filter_by(exam_id=mad2_exam.id, examiner_id=user_map["prof.sharma@emp.com"].id).first()
        if not slot1:
            slot1 = Slot(
                exam_id=mad2_exam.id,
                examiner_id=user_map["prof.sharma@emp.com"].id,
                date=past_date,
                start_time="10:00",
                end_time="10:20",
                capacity=1,
                available_seats=0,
                status="Completed",
                meeting_link="https://meet.google.com/mad-demo-001"
            )
            db.session.add(slot1)
            db.session.flush()

        # Booking 1: student1 (Passed with 93/100)
        b1 = Booking.query.filter_by(slot_id=slot1.id, student_id=user_map["student1@study.iitm.ac.in"].id).first()
        if not b1:
            b1 = Booking(
                student_id=user_map["student1@study.iitm.ac.in"].id,
                slot_id=slot1.id,
                status="Completed",
                booked_at=datetime.utcnow() - timedelta(days=4)
            )
            db.session.add(b1)
            db.session.flush()

            # Evaluation 1
            ev1 = Evaluation(
                booking_id=b1.id,
                student_id=b1.student_id,
                examiner_id=slot1.examiner_id,
                total_marks=93.0,
                remarks="Outstanding performance. Architecture adheres to all MAD-II patterns, Celery queues operate reliably, and viva answers were articulate.",
                status="Submitted",
                evaluated_at=datetime.utcnow() - timedelta(days=3)
            )
            db.session.add(ev1)
            db.session.flush()

            scores1 = [28.0, 33.0, 32.0]
            for r, s in zip(mad2_rubrics, scores1):
                es = EvaluationScore(evaluation_id=ev1.id, rubric_id=r.id, marks=s)
                db.session.add(es)
            print("[EVAL] Evaluated student1: 93/100 (Pass)")

        # Slot 2: Dr. Anand
        slot2 = Slot.query.filter_by(exam_id=mad2_exam.id, examiner_id=user_map["prof.anand@emp.com"].id).first()
        if not slot2:
            slot2 = Slot(
                exam_id=mad2_exam.id,
                examiner_id=user_map["prof.anand@emp.com"].id,
                date=past_date,
                start_time="11:00",
                end_time="11:20",
                capacity=1,
                available_seats=0,
                status="Completed",
                meeting_link="https://meet.google.com/mad-demo-002"
            )
            db.session.add(slot2)
            db.session.flush()

        # Booking 2: student2 (Failed with 32/100 to show fail contrast in pie chart)
        b2 = Booking.query.filter_by(slot_id=slot2.id, student_id=user_map["student2@study.iitm.ac.in"].id).first()
        if not b2:
            b2 = Booking(
                student_id=user_map["student2@study.iitm.ac.in"].id,
                slot_id=slot2.id,
                status="Completed",
                booked_at=datetime.utcnow() - timedelta(days=4)
            )
            db.session.add(b2)
            db.session.flush()

            # Evaluation 2
            ev2 = Evaluation(
                booking_id=b2.id,
                student_id=b2.student_id,
                examiner_id=slot2.examiner_id,
                total_marks=32.0,
                remarks="Candidate struggled with Redis caching commands and could not explain Celery worker retry policies. Needs substantial revision.",
                status="Submitted",
                evaluated_at=datetime.utcnow() - timedelta(days=3)
            )
            db.session.add(ev2)
            db.session.flush()

            scores2 = [10.0, 11.0, 11.0]
            for r, s in zip(mad2_rubrics, scores2):
                es = EvaluationScore(evaluation_id=ev2.id, rubric_id=r.id, marks=s)
                db.session.add(es)
            print("[EVAL] Evaluated student2: 32/100 (Needs Improvement)")

        # 5. SLOTS FOR PYTHON COMPREHENSIVE VIVA (Booking Open)
        python_exam = exam_map["Python Comprehensive Oral Exam"]
        slot_py1 = Slot.query.filter_by(exam_id=python_exam.id, start_time="14:00").first()
        if not slot_py1:
            slot_py1 = Slot(
                exam_id=python_exam.id,
                examiner_id=user_map["prof.sharma@emp.com"].id,
                date=future_date1,
                start_time="14:00",
                end_time="14:15",
                capacity=1,
                available_seats=0,
                status="Full",
                meeting_link="https://meet.google.com/py-viva-101"
            )
            db.session.add(slot_py1)
            db.session.flush()

            # Active Booking: student3
            b3 = Booking(
                student_id=user_map["student3@study.iitm.ac.in"].id,
                slot_id=slot_py1.id,
                status="Booked",
                booked_at=datetime.utcnow() - timedelta(hours=6)
            )
            db.session.add(b3)
            print("[BOOKING] Booked student3 for Python viva slot 1 (Status: Booked)")

        slot_py2 = Slot.query.filter_by(exam_id=python_exam.id, start_time="14:20").first()
        if not slot_py2:
            slot_py2 = Slot(
                exam_id=python_exam.id,
                examiner_id=user_map["prof.sharma@emp.com"].id,
                date=future_date1,
                start_time="14:20",
                end_time="14:35",
                capacity=1,
                available_seats=1,
                status="Available",
                meeting_link="https://meet.google.com/py-viva-102"
            )
            db.session.add(slot_py2)

        slot_py3 = Slot.query.filter_by(exam_id=python_exam.id, start_time="14:40").first()
        if not slot_py3:
            slot_py3 = Slot(
                exam_id=python_exam.id,
                examiner_id=user_map["prof.sharma@emp.com"].id,
                date=future_date1,
                start_time="14:40",
                end_time="14:55",
                capacity=1,
                available_seats=1,
                status="Available",
                meeting_link="https://meet.google.com/py-viva-103"
            )
            db.session.add(slot_py3)

        db.session.commit()

        # Invalidate any cached admin/student data
        from helpers import cache_delete
        cache_delete("admin:exams")
        cache_delete("student:exams")
        cache_delete("admin:analytics")

        print("=" * 60)
        print("DEMO DATA SEEDED SUCCESSFULLY!")
        print("=" * 60)
        print("DEMO CREDENTIALS:")
        print("  Admin:    admin@emp.com              / Admin@123")
        print("  Examiner: prof.sharma@emp.com        / Examiner@123  (Dr. Ramesh Sharma)")
        print("  Examiner: prof.anand@emp.com         / Examiner@123  (Dr. Kavita Anand)")
        print("  Student:  student1@study.iitm.ac.in  / Student@123   (Aarav Kumar, 93/100 Evaluated)")
        print("  Student:  student2@study.iitm.ac.in  / Student@123   (Bhavna Patel, 32/100 Evaluated)")
        print("  Student:  student3@study.iitm.ac.in  / Student@123   (Chetan Singh, Active Booking)")
        print("=" * 60)

if __name__ == "__main__":
    seed_demo_data()
