import os
from datetime import datetime, timezone
from flask import Blueprint, render_template, url_for, request, redirect, session, flash, current_app, send_from_directory
from werkzeug.security import check_password_hash
from .forms import RegistrationForm, EmployerRequestForm, AdminLoginForm
from .models import db, Registration, EmployerRequest
from .auth import admin_required
from .email_utils import (
    send_admin_registration_email,
    send_applicant_confirmation_email,
    send_admin_employer_request_email,
    send_employer_confirmation_email
)
main = Blueprint("main", __name__)


@main.route("/")
def home():
    return render_template(
        "home.html",
        title="Home"
    )


@main.route("/about")
def about():
    return render_template(
        "about.html",
        title="About"
    )


@main.route("/courses")
def courses():

    courses_data = [
        {
            "id": "course-2d",
            "number": "01",
            "category": "STRUCTURAL DETAILING",
            "title": "2D Rebar Detailing",
            "description": (
                "Develop practical skills in reading structural "
                "drawings and preparing reinforcement detailing "
                "for real-world structural elements."
            ),
            "duration": "8 Weeks",
            "level": "Beginner to Intermediate",
            "mode": "Classroom / Online",
            "software": "AutoCAD",
            "image": "images/courses/2d-rebar-detailing.jpeg",

            "outcomes": [
                "Interpret structural drawings confidently",
                "Understand reinforcement terminology",
                "Identify structural members",
                "Prepare reinforcement detailing",
                "Understand bar marks and schedules",
                "Develop project-based detailing skills"
            ],

            "curriculum": [
                "Structural Drawings",
                "Structural Terminology",
                "Structural Members",
                "Rebar Placement",
                "Bar Marks",
                "Structural Elements",
                "Drawing Preparation",
                "Project Exercise"
            ]
        },

        {
            "id": "course-rebar",
            "number": "02",
            "category": "QUANTITY ESTIMATION",
            "title": "Rebar Estimation",
            "description": (
                "Learn reinforcement quantity take-off, calculations, "
                "bar bending schedules and practical checking workflows."
            ),
            "duration": "6 Weeks",
            "level": "Beginner to Intermediate",
            "mode": "Classroom / Online",
            "software": "Excel / AutoCAD",
            "image": "images/courses/rebar-estimation.jpeg",

            "outcomes": [
                "Read drawings for quantity extraction",
                "Perform reinforcement quantity take-offs",
                "Calculate reinforcement quantities",
                "Prepare BBS",
                "Check quantities accurately",
                "Apply estimation skills to projects"
            ],

            "curriculum": [
                "Drawing Reading",
                "Quantity Take-Off",
                "Rebar Calculations",
                "Bar Bending Schedule",
                "Quantity Checking",
                "Practical Exercises"
            ]
        },

        {
            "id": "course-concrete",
            "number": "03",
            "category": "CONCRETE ESTIMATION",
            "title": "Concrete Estimation",
            "description": (
                "Understand structural drawings and develop practical "
                "skills for calculating concrete quantities across "
                "major structural elements."
            ),
            "duration": "5 Weeks",
            "level": "Beginner to Intermediate",
            "mode": "Classroom / Online",
            "software": "Excel / AutoCAD",
            "image": "images/courses/concrete-estimation.jpeg",

            "outcomes": [
                "Interpret structural drawings",
                "Identify concrete structural members",
                "Calculate concrete quantities",
                "Estimate footing quantities",
                "Estimate column, beam and slab quantities",
                "Validate estimation results"
            ],

            "curriculum": [
                "Drawing Interpretation",
                "Structural Members",
                "Concrete Calculations",
                "Footings",
                "Columns",
                "Beams",
                "Slabs",
                "Quantity Validation"
            ]
        },

        {
            "id": "course-3d",
            "number": "04",
            "category": "ADVANCED PROGRAM",
            "title": "3D Rebar Detailing",
            "description": (
                "An advanced structural detailing program focused on "
                "3D modelling, digital coordination and modern "
                "structural engineering workflows."
            ),
            "duration": "Coming Soon",
            "level": "Advanced",
            "mode": "Coming Soon",
            "software": "Advanced Structural Software",
            "image": "images/courses/future-3d-rebar-detailing.jpeg",

            "outcomes": [
                "Understand 3D structural workflows",
                "Develop reinforcement models",
                "Understand clash detection",
                "Review structural models",
                "Work with advanced detailing workflows",
                "Explore modern structural technologies"
            ],

            "curriculum": [
                "3D Modelling",
                "Structural Workflow",
                "Reinforcement Modelling",
                "Clash Detection",
                "Model Review",
                "Advanced Software"
            ]
        }
    ]

    return render_template(
        "courses.html",
        courses=courses_data
    )


@main.route("/hiring")
def hiring():
    return render_template(
        "hiring.html",
        title="Hiring Solutions"
    )


@main.route("/contact")
def contact():
    return render_template(
        "contact.html",
        title="Contact"
    )

@main.route("/favicon.ico")
def favicon():
    return send_from_directory(
        os.path.join(current_app.root_path, "static"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon"
    )


@main.route("/google7440c8aafe31bbe1.html")
def google_verification():
    return send_from_directory(
        os.path.join(current_app.root_path, "static"),
        "google7440c8aafe31bbe1.html",
        mimetype="text/html"
    )


@main.route("/robots.txt")
def robots():
    return render_template(
        "robots.txt",
        mimetype="text/plain"
    )


@main.route("/sitemap.xml")
def sitemap():

    pages = [
        {
            "url": url_for("main.home", _external=True),
            "priority": "1.0",
            "changefreq": "daily"
        },
        {
            "url": url_for("main.courses", _external=True),
            "priority": "0.9",
            "changefreq": "weekly"
        },
        {
            "url": url_for("main.hiring", _external=True),
            "priority": "0.9",
            "changefreq": "weekly"
        },
        {
            "url": url_for("main.about", _external=True),
            "priority": "0.8",
            "changefreq": "monthly"
        },
        {
            "url": url_for("main.contact", _external=True),
            "priority": "0.8",
            "changefreq": "monthly"
        },
        {
            "url": url_for("main.register", _external=True),
            "priority": "0.8",
            "changefreq": "weekly"
        },
        {
            "url": url_for("main.employer_request", _external=True),
            "priority": "0.8",
            "changefreq": "weekly"
        }
    ]

    return render_template(
        "sitemap.xml",
        pages=pages,
        today=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        mimetype="application/xml"
    )


@main.route("/register", methods=["GET", "POST"])
def register():

    form = RegistrationForm()

    if form.validate_on_submit():

        registration = Registration(
            full_name=form.full_name.data,
            email=form.email.data,
            phone=form.phone.data,
            course=form.course.data,
            qualification=form.qualification.data,
            message=form.message.data
        )

        # ---------------------------------
        # SAVE REGISTRATION FIRST
        # ---------------------------------

        db.session.add(registration)
        db.session.commit()

        # ---------------------------------
        # SEND ADMIN EMAIL
        # ---------------------------------

        try:
           send_admin_registration_email(registration)

        except Exception as e:
               print("ADMIN EMAIL ERROR:", e)
        # ---------------------------------
        # SEND APPLICANT EMAIL
        # ---------------------------------
        try:
           send_applicant_confirmation_email(registration)

        except Exception as e:
               print("APPLICANT EMAIL ERROR:", e)
 
        # ---------------------------------
        # SHOW SUCCESS PAGE
        # ---------------------------------

        return render_template(
            "registration_success.html",
            registration=registration
        )

    return render_template(
        "register.html",
        form=form
    )


@main.route("/employer-request", methods=["GET", "POST"])
def employer_request():

    form = EmployerRequestForm()

    if form.validate_on_submit():

        req = EmployerRequest(
            company_name=form.company_name.data,
            contact_person=form.contact_person.data,
            email=form.email.data,
            phone=form.phone.data,
            location=form.location.data,
            position=form.position.data,
            employees_required=form.employees_required.data,
            experience=form.experience.data,
            employment_type=form.employment_type.data,
            skills=form.skills.data,
            job_description=form.job_description.data,
            additional_message=form.additional_message.data
        )

        # ---------------------------------
        # SAVE EMPLOYER REQUEST FIRST
        # ---------------------------------
        db.session.add(req)
        db.session.commit()

        # ---------------------------------
        # SEND ADMIN NOTIFICATION EMAIL
        # ---------------------------------
        try:
            send_admin_employer_request_email(req)
        except Exception as e:
            print("ADMIN EMPLOYER REQUEST EMAIL ERROR:", e)

        # ---------------------------------
        # SEND EMPLOYER CONFIRMATION EMAIL
        # ---------------------------------
        try:
            send_employer_confirmation_email(req)
        except Exception as e:
            print("EMPLOYER CONFIRMATION EMAIL ERROR:", e)

        # ---------------------------------
        # SHOW SUCCESS PAGE
        # ---------------------------------
        return render_template(
            "employer_request_success.html",
            employer_request=req
        )

    return render_template(
        "employer_request.html",
        form=form,
        title="Request Employees"
    )


@main.route("/admin", methods=["GET", "POST"])
def admin_login():

    if session.get("admin_logged_in"):
        return redirect(url_for("main.admin_dashboard"))

    form = AdminLoginForm()

    if form.validate_on_submit():

        username = form.username.data.strip()
        password = form.password.data

        admin_username = current_app.config.get("ADMIN_USERNAME", "admin")
        admin_hash = current_app.config.get("ADMIN_PASSWORD_HASH")

        if (
            admin_hash
            and username == admin_username
            and check_password_hash(admin_hash, password)
        ):
            session.clear()
            session["admin_logged_in"] = True
            session.permanent = True

            flash("Welcome back, Administrator.", "success")
            return redirect(url_for("main.admin_dashboard"))

        flash("Invalid username or password.", "danger")

    return render_template(
        "admin_login.html",
        form=form,
        title="Admin Login"
    )


@main.route("/admin/dashboard")
@admin_required
def admin_dashboard():

    registrations = Registration.query.order_by(
        Registration.created_at.desc()
    ).all()

    employer_requests = EmployerRequest.query.order_by(
        EmployerRequest.created_at.desc()
    ).all()

    return render_template(
        "admin_dashboard.html",
        registrations=registrations,
        employer_requests=employer_requests,
        title="Admin Dashboard"
    )


@main.route("/admin/logout")
def admin_logout():

    session.clear()
    flash("You have been logged out successfully.", "info")

    return redirect(url_for("main.admin_login"))





@main.route("/mail-test")
def mail_test():

    return {
        "server": current_app.config["MAIL_SERVER"],
        "port": current_app.config["MAIL_PORT"],
        "username": current_app.config["MAIL_USERNAME"],
        "password_loaded": current_app.config["MAIL_PASSWORD"] is not None
    }