import random
from datetime import datetime, date, timedelta
from django.core.management.base import BaseCommand
from hrms.models import Department, Employee, LeaveRequest, Attendance, Career, Shift

class Command(BaseCommand):
    help = 'Seeds the HRMS database with departments, shifts, employees, leaves, careers, and attendance logs.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force seeding even if data already exists',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        if Employee.objects.exists() and not force:
            self.stdout.write(self.style.WARNING('Database already has employee records. Skipping seeding. Use --force to seed anyway.'))
            return

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

        self.stdout.write('Skipping employee seeding (leaving directory empty).')
        self.stdout.write(self.style.SUCCESS('Successfully seeded database with basic structural data.'))
