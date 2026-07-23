import random
from datetime import datetime, date, timedelta
from django.core.management.base import BaseCommand
from hrms.models import Department, Employee, LeaveRequest, Attendance, Career, Shift

class Command(BaseCommand):
    help = 'Seeds the HRMS database with departments, shifts, employees, leaves, careers, and attendance logs.'

    def handle(self, *args, **options):
        self.stdout.write('Resetting database tables...')
        # Clear existing data
        Attendance.objects.all().delete()
        LeaveRequest.objects.all().delete()
        Career.objects.all().delete()
        Employee.objects.all().delete()
        Department.objects.all().delete()
        Shift.objects.all().delete()

        self.stdout.write('Creating shifts...')
        shift_regular = Shift.objects.create(name='Regular Shift', start_time=datetime.strptime("09:00", "%H:%M").time(), end_time=datetime.strptime("18:00", "%H:%M").time(), grace_period=5)
        shift_morning = Shift.objects.create(name='Morning Shift', start_time=datetime.strptime("08:00", "%H:%M").time(), end_time=datetime.strptime("17:00", "%H:%M").time(), grace_period=10)
        shift_evening = Shift.objects.create(name='Evening Shift', start_time=datetime.strptime("14:00", "%H:%M").time(), end_time=datetime.strptime("23:00", "%H:%M").time(), grace_period=10)
        shift_night = Shift.objects.create(name='Night Shift', start_time=datetime.strptime("22:00", "%H:%M").time(), end_time=datetime.strptime("07:00", "%H:%M").time(), grace_period=15)

        self.stdout.write('Creating departments...')
        departments = [
            Department.objects.create(name='Engineering', description='Software development and IT infrastructure.'),
            Department.objects.create(name='Human Resources', description='Recruiting, onboarding, and employee relations.'),
            Department.objects.create(name='Sales & Marketing', description='Growth, outreach, sales, and marketing strategies.'),
            Department.objects.create(name='Finance & Accounts', description='Salary disbursements, taxes, audits, and budgeting.'),
            Department.objects.create(name='Customer Support', description='Supporting client queries and service resolution.')
        ]

        self.stdout.write('Creating careers...')
        Career.objects.create(title='Senior Backend Engineer', department=departments[0], experience='3-5 Years', status='Active')
        Career.objects.create(title='Talent Acquisition Lead', department=departments[1], experience='2-4 Years', status='Active')
        Career.objects.create(title='Digital Growth Strategist', department=departments[2], experience='1-3 Years', status='Active')

        self.stdout.write('Creating employees...')
        employee_data = [
            # Engineering
            ('EMP001', 'Tony', 'Stark', 'tony@starkindustries.com', '+91 99999 11111', 'Engineering', 'CTO / Director', 250000.0, '2024-01-15', 'Active', 'Tech visionary leading engineering teams and architecture.', shift_regular),
            ('EMP002', 'John', 'Connor', 'john.c@resistance.org', '+91 99999 22222', 'Engineering', 'Lead Backend Developer', 120000.0, '2024-05-10', 'Active', 'Proficient in Python, Django, Databases, and system scalability.', shift_regular),
            ('EMP003', 'Sarah', 'Connor', 'sarah.c@resistance.org', '+91 99999 33333', 'Engineering', 'Senior DevOps Engineer', 105000.0, '2024-06-01', 'Remote', 'Expertise in Docker, Kubernetes, CI/CD, and system uptime.', shift_morning),
            # HR
            ('EMP004', 'Ellen', 'Ripley', 'ripley@weyland.com', '+91 99999 44444', 'Human Resources', 'HR Director', 95000.0, '2024-02-20', 'Active', 'Specialist in conflict resolution, onboarding, and policies.', shift_regular),
            ('EMP005', 'Arthur', 'Dent', 'arthur@guide.org', '+91 99999 55555', 'Human Resources', 'Recruiting Lead', 65000.0, '2025-01-08', 'Active', 'Coordinates general onboarding, screenings, and candidate sourcing.', shift_regular),
            # Sales & Marketing
            ('EMP006', 'Leia', 'Organa', 'leia.o@alliance.gov', '+91 99999 66666', 'Sales & Marketing', 'CMO / Sales Director', 140000.0, '2024-03-01', 'Active', 'Drives organic growth and manages corporate communications.', shift_regular),
            ('EMP007', 'Luke', 'Skywalker', 'luke.s@jedi.org', '+91 99999 77777', 'Sales & Marketing', 'Growth Manager', 85000.0, '2024-08-15', 'Active', 'Focuses on SEO, ad spend, conversion funnel optimization.', shift_evening),
            ('EMP008', 'Han', 'Solo', 'han.s@millennium.com', '+91 99999 88888', 'Sales & Marketing', 'Logistics Officer', 75000.0, '2024-09-01', 'Remote', 'Manages vendor relations and marketing distribution grids.', shift_regular),
            # Finance
            ('EMP009', 'Natasha', 'Romanoff', 'natasha@shield.gov', '+91 99999 99999', 'Finance & Accounts', 'Financial Director', 110000.0, '2024-04-10', 'Active', 'Oversees internal audit, taxes, budgets, and salary processing.', shift_regular),
            # Support
            ('EMP010', 'Peter', 'Parker', 'peter.p@bugle.com', '+91 99999 00000', 'Customer Support', 'Support Executive', 45000.0, '2025-02-01', 'Active', 'Handles user escalations, feedback loops, and customer satisfaction.', shift_night)
        ]

        employee_instances = []
        for code, fname, lname, email, phone, dname, role, salary, joined, status, bio, shift_obj in employee_data:
            dept = next(d for d in departments if d.name == dname)
            emp = Employee.objects.create(
                employee_id=code,
                first_name=fname,
                last_name=lname,
                email=email,
                phone=phone,
                department=dept,
                shift=shift_obj,
                role=role,
                salary=salary,
                date_joined=datetime.strptime(joined, '%Y-%m-%d').date(),
                status=status,
                bio=bio
            )
            employee_instances.append(emp)

        self.stdout.write('Seeding leave requests...')
        today = date.today()
        # Approved leave last week
        LeaveRequest.objects.create(
            employee=employee_instances[1], # John
            leave_type='Sick Leave',
            start_date=today - timedelta(days=8),
            end_date=today - timedelta(days=6),
            reason='Fever and medical checkup.',
            status='Approved'
        )
        # Pending leave next week
        LeaveRequest.objects.create(
            employee=employee_instances[9], # Peter
            leave_type='Paid Leave',
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=7),
            reason='Family get-together.',
            status='Pending'
        )
        # Rejected request
        LeaveRequest.objects.create(
            employee=employee_instances[7], # Han
            leave_type='Paid Leave',
            start_date=today - timedelta(days=12),
            end_date=today - timedelta(days=10),
            reason='Urgent travel plans.',
            status='Rejected'
        )

        self.stdout.write('Seeding attendance records...')
        # Seed attendance for last 7 days to make charts look highly dynamic and loaded
        for i in range(1, 8):
            d = today - timedelta(days=i)
            # Weekend filter (skip saturdays/sundays or keep them low rate)
            if d.weekday() >= 5:
                continue
                
            for emp in employee_instances:
                # Randomize if present/late/absent
                rand = random.random()
                if rand < 0.05:
                    # Absent
                    Attendance.objects.create(
                        employee=emp,
                        date=d,
                        clock_in=datetime.strptime("09:00:00", "%H:%M:%S").time(), # Dummy
                        status='Absent'
                    )
                elif rand < 0.20:
                    # Late
                    hour = random.randint(9, 10)
                    minute = random.randint(6, 45)
                    Attendance.objects.create(
                        employee=emp,
                        date=d,
                        clock_in=datetime.strptime(f"{hour:02}:{minute:02}:00", "%H:%M:%S").time(),
                        clock_out=datetime.strptime("18:00:00", "%H:%M:%S").time(),
                        status='Late'
                    )
                else:
                    # Present
                    hour = random.randint(8, 9)
                    minute = random.randint(0, 5)
                    Attendance.objects.create(
                        employee=emp,
                        date=d,
                        clock_in=datetime.strptime(f"{hour:02}:{minute:02}:00", "%H:%M:%S").time(),
                        clock_out=datetime.strptime("17:30:00", "%H:%M:%S").time(),
                        status='Present'
                    )

        # Seed some clock ins for today
        # Tony Stark clocked in early
        Attendance.objects.create(
            employee=employee_instances[0],
            date=today,
            clock_in=datetime.strptime("08:45:00", "%H:%M:%S").time(),
            status='Present'
        )
        # John Connor clocked in late
        Attendance.objects.create(
            employee=employee_instances[1],
            date=today,
            clock_in=datetime.strptime("09:12:00", "%H:%M:%S").time(),
            status='Late'
        )
        # Leia Organa clocked in early
        Attendance.objects.create(
            employee=employee_instances[5],
            date=today,
            clock_in=datetime.strptime("08:58:00", "%H:%M:%S").time(),
            status='Present'
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded database with rich HR data.'))
