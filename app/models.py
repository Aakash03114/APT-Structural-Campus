from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Registration(db.Model):
    __tablename__ = "registrations"

    id = db.Column(db.Integer, primary_key=True)

    full_name = db.Column(db.String(120), nullable=False)

    email = db.Column(db.String(120), nullable=False)

    phone = db.Column(db.String(20), nullable=False)

    course = db.Column(db.String(100), nullable=False)

    qualification = db.Column(db.String(100))

    message = db.Column(db.Text)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def __repr__(self):
        return f"<Registration {self.full_name}>"


class EmployerRequest(db.Model):
    __tablename__ = "employer_requests"

    id = db.Column(db.Integer, primary_key=True)

    company_name = db.Column(db.String(200), nullable=False)
    contact_person = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(50), nullable=False)
    location = db.Column(db.String(200), nullable=False)

    position = db.Column(db.String(200), nullable=False)
    employees_required = db.Column(db.Integer, nullable=False)
    experience = db.Column(db.String(200))
    employment_type = db.Column(db.String(100))
    skills = db.Column(db.Text)

    job_description = db.Column(db.Text)
    additional_message = db.Column(db.Text)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def __repr__(self):
        return f"<EmployerRequest {self.company_name} - {self.position}>"