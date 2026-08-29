from flask import current_app
from flask_mail import Message

from . import mail


def send_admin_registration_email(registration):

    msg = Message(
        subject="New Registration - APT Structural Campus",
        recipients=[current_app.config["CONTACT_EMAIL"]],
    )

    msg.body = f"""
New registration received for APT Structural Campus.

Applicant Details
-----------------

Name:
{registration.full_name}

Email:
{registration.email}

Phone:
{registration.phone}

Course:
{registration.course}

Qualification:
{registration.qualification}

Message:
{registration.message}

Registration Date:
{registration.created_at}

Please log in to the admin dashboard to view the registration.
"""

    mail.send(msg)


def send_applicant_confirmation_email(registration):

    msg = Message(
        subject="Registration Received - APT Structural Campus",
        recipients=[registration.email],
    )

    msg.body = f"""
Dear {registration.full_name},

Thank you for registering with APT Structural Campus.

We have successfully received your registration.

Course:
{registration.course}

Our team will review your details and contact you regarding
course availability, training details and enrollment.

If you have any questions, please contact us at:

info@aptcampus.com

Regards,

APT Structural Campus
Professional Structural Engineering Training
https://www.aptcampus.com
"""

    mail.send(msg)


def send_admin_employer_request_email(employer_request):

    msg = Message(
        subject=f"New Employer Hiring Request - {employer_request.company_name}",
        recipients=[current_app.config["CONTACT_EMAIL"]],
    )

    msg.body = f"""
New Employer Hiring Request received for APT Structural Campus.

Company Information
-------------------
Company Name: {employer_request.company_name}
Contact Person: {employer_request.contact_person}
Business Email: {employer_request.email}
Phone Number: {employer_request.phone}
Location: {employer_request.location}

Hiring Requirements
-------------------
Position / Role: {employer_request.position}
Employees Required: {employer_request.employees_required}
Experience: {employer_request.experience or 'Not specified'}
Employment Type: {employer_request.employment_type or 'Not specified'}
Skills & Tools:
{employer_request.skills or 'None specified'}

Job Description:
{employer_request.job_description or 'None provided'}

Additional Message:
{employer_request.additional_message or 'None'}

Submitted Date: {employer_request.created_at}
Request ID: #{employer_request.id:04d}

Please log in to the admin dashboard to review the complete request.
"""

    mail.send(msg)


def send_employer_confirmation_email(employer_request):

    msg = Message(
        subject="Hiring Request Received – APT Structural Campus",
        recipients=[employer_request.email],
    )

    msg.body = f"""
Dear {employer_request.contact_person},

Thank you for contacting APT Structural Campus.

We have received your hiring request for "{employer_request.position}" ({employer_request.company_name}) and our team will review your requirements.

Request ID: #{employer_request.id:04d}

Position: {employer_request.position}
Openings: {employer_request.employees_required}
Employment Type: {employer_request.employment_type or 'Standard'}

We will contact you shortly regarding candidate sourcing, technical screening, and the next steps.

If you have any urgent questions or require customized hiring solutions, please contact us at:

info@aptcampus.com

Regards,

APT Structural Campus
Professional Structural Engineering & Hiring Solutions
https://www.aptcampus.com
"""

    mail.send(msg)