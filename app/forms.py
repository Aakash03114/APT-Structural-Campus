from flask_wtf import FlaskForm
from wtforms import StringField, SelectField, TextAreaField, IntegerField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Email, Length, NumberRange, Optional


class AdminLoginForm(FlaskForm):

    username = StringField(
        "Username",
        validators=[
            DataRequired(message="Username is required.")
        ]
    )

    password = PasswordField(
        "Password",
        validators=[
            DataRequired(message="Password is required.")
        ]
    )

    submit = SubmitField(
        "Login"
    )


class RegistrationForm(FlaskForm):

    full_name = StringField(
        "Full Name",
        validators=[
            DataRequired(),
            Length(min=2, max=120)
        ]
    )

    email = StringField(
        "Email Address",
        validators=[
            DataRequired(),
            Email(),
            Length(max=120)
        ]
    )

    phone = StringField(
        "Phone Number",
        validators=[
            DataRequired(),
            Length(min=10, max=20)
        ]
    )

    course = SelectField(
        "Select Course",
        choices=[
            ("", "Select a Course"),
            ("2D Rebar Detailing", "2D Rebar Detailing"),
            ("Rebar Estimation", "Rebar Estimation"),
            ("Concrete Estimation", "Concrete Estimation"),
            ("3D Rebar Detailing", "3D Rebar Detailing — Coming Soon")
        ],
        validators=[DataRequired()]
    )

    qualification = StringField(
        "Qualification",
        validators=[
            Length(max=100)
        ]
    )

    message = TextAreaField(
        "Message",
        validators=[
            Length(max=1000)
        ]
    )

    submit = SubmitField(
        "Submit Registration"
    )


class EmployerRequestForm(FlaskForm):

    # Company Information
    company_name = StringField(
        "Company Name",
        validators=[
            DataRequired(message="Company name is required."),
            Length(min=2, max=200, message="Company name must be between 2 and 200 characters.")
        ]
    )

    contact_person = StringField(
        "Contact Person",
        validators=[
            DataRequired(message="Contact person name is required."),
            Length(min=2, max=200, message="Contact person name must be between 2 and 200 characters.")
        ]
    )

    email = StringField(
        "Business Email",
        validators=[
            DataRequired(message="Business email is required."),
            Email(message="Please enter a valid email address."),
            Length(max=200)
        ]
    )

    phone = StringField(
        "Phone Number",
        validators=[
            DataRequired(message="Phone number is required."),
            Length(min=10, max=50, message="Phone number must be at least 10 characters.")
        ]
    )

    location = StringField(
        "Location / City",
        validators=[
            DataRequired(message="Company location is required."),
            Length(min=2, max=200, message="Location must be between 2 and 200 characters.")
        ]
    )

    # Hiring Requirement
    position = StringField(
        "Position / Job Role",
        validators=[
            DataRequired(message="Position / Job role is required."),
            Length(min=2, max=200, message="Position must be between 2 and 200 characters.")
        ]
    )

    employees_required = IntegerField(
        "Number of Employees Required",
        validators=[
            DataRequired(message="Please specify the number of positions needed."),
            NumberRange(min=1, max=1000, message="Number of employees must be at least 1.")
        ]
    )

    experience = StringField(
        "Required Experience",
        validators=[
            Optional(),
            Length(max=200)
        ]
    )

    employment_type = SelectField(
        "Employment Type",
        choices=[
            ("", "Select Employment Type"),
            ("Full Time", "Full Time"),
            ("Part Time", "Part Time"),
            ("Contract", "Contract"),
            ("Internship", "Internship")
        ],
        validators=[
            DataRequired(message="Please select an employment type.")
        ]
    )

    skills = TextAreaField(
        "Required Skills & Tools",
        validators=[
            Optional(),
            Length(max=2000)
        ]
    )

    # Additional Information
    job_description = TextAreaField(
        "Job Description / Role Requirements",
        validators=[
            Optional(),
            Length(max=5000)
        ]
    )

    additional_message = TextAreaField(
        "Additional Message / Notes",
        validators=[
            Optional(),
            Length(max=2000)
        ]
    )

    submit = SubmitField(
        "Submit Hiring Request"
    )


class ContactForm(FlaskForm):

    name = StringField(
        "Full Name",
        validators=[
            DataRequired(message="Full name is required."),
            Length(min=2, max=120, message="Name must be between 2 and 120 characters.")
        ]
    )

    email = StringField(
        "Email Address",
        validators=[
            DataRequired(message="Email address is required."),
            Email(message="Please enter a valid email address."),
            Length(max=120)
        ]
    )

    phone = StringField(
        "Phone Number",
        validators=[
            Optional(),
            Length(max=50)
        ]
    )

    subject = SelectField(
        "Enquiry Type",
        choices=[
            ("", "Select an option"),
            ("course", "Course Enquiry"),
            ("hiring", "Hiring Solutions"),
            ("career", "Career Opportunity"),
            ("general", "General Enquiry")
        ],
        validators=[
            DataRequired(message="Please select an enquiry type.")
        ]
    )

    message = TextAreaField(
        "Message",
        validators=[
            DataRequired(message="Message is required."),
            Length(min=10, max=3000, message="Message must be at least 10 characters.")
        ]
    )

    submit = SubmitField("Send Enquiry")