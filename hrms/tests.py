from django.test import TestCase, Client
from django.utils import timezone
from datetime import datetime, timedelta
import json
from hrms.models import Department, Shift, Employee, LeaveRequest, Attendance, Career

class HRMSModelAndAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        
        # Create department
        self.dept = Department.objects.create(
            name='Engineering',
            description='Software engineering department'
        )
        
        # Create shift
        self.shift = Shift.objects.create(
            name='Regular Shift',
            start_time=datetime.strptime("09:00", "%H:%M").time(),
            end_time=datetime.strptime("18:00", "%H:%M").time(),
            grace_period=5
        )
        
        # Create employee
        self.emp = Employee.objects.create(
            employee_id='EMP001',
            first_name='Tony',
            last_name='Stark',
            email='tony@stark.com',
            department=self.dept,
            shift=self.shift,
            role='CTO',
            salary=250000.00,
            date_joined=timezone.localdate(),
            status='Active',
            password='password123'
        )

    def test_login_api_admin(self):
        response = self.client.post(
            '/api/login/',
            data=json.dumps({'email': 'admin@hrms.com', 'password': 'admin'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['role'], 'admin')
        self.assertEqual(data['id'], 0)

    def test_login_api_employee(self):
        response = self.client.post(
            '/api/login/',
            data=json.dumps({'email': 'tony@stark.com', 'password': 'password123'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['role'], 'employee')
        self.assertEqual(data['id'], self.emp.id)

    def test_department_list_api(self):
        response = self.client.get('/api/departments/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], 'Engineering')

    def test_next_employee_id_api(self):
        response = self.client.get('/api/employees/next-id/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['next_id'], 'EMP002')

    def test_employee_list_api(self):
        response = self.client.get('/api/employees/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['employee_id'], 'EMP001')

    def test_attendance_clock_api(self):
        # Clock in
        response = self.client.post(
            '/api/attendance/clock/',
            data=json.dumps({'employee_id': self.emp.id, 'action': 'clock_in'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        
        # Clock out
        response_out = self.client.post(
            '/api/attendance/clock/',
            data=json.dumps({'employee_id': self.emp.id, 'action': 'clock_out'}),
            content_type='application/json'
        )
        self.assertEqual(response_out.status_code, 200)

    def test_leave_request_flow(self):
        today = timezone.localdate()
        # Submit leave
        req_res = self.client.post(
            '/api/leave-requests/',
            data=json.dumps({
                'employee_id': self.emp.id,
                'leave_type': 'Paid Leave',
                'start_date': today.strftime('%Y-%m-%d'),
                'end_date': (today + timedelta(days=2)).strftime('%Y-%m-%d'),
                'reason': 'Vacation'
            }),
            content_type='application/json'
        )
        self.assertEqual(req_res.status_code, 200)
        leave_id = req_res.json()['leave_id']
        
        # Approve leave
        action_res = self.client.post(
            f'/api/leave-requests/{leave_id}/action/',
            data=json.dumps({'status': 'Approved'}),
            content_type='application/json'
        )
        self.assertEqual(action_res.status_code, 200)
        
        # Check employee status changed to On Leave
        self.emp.refresh_from_db()
        self.assertEqual(self.emp.status, 'On Leave')

    def test_payroll_api(self):
        response = self.client.get(f'/api/payroll/?employee_id={self.emp.id}')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['employee_id'], 'EMP001')
        self.assertGreater(data['net_pay'], 0)

    def test_change_password_api_admin(self):
        response = self.client.post(
            '/api/employees/0/change-password/',
            data=json.dumps({'old_password': 'admin', 'new_password': 'newadminpass', 'is_admin': True}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_change_password_api_employee(self):
        response = self.client.post(
            f'/api/employees/{self.emp.id}/change-password/',
            data=json.dumps({'old_password': 'password123', 'new_password': 'newemppass'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.emp.refresh_from_db()
        self.assertEqual(self.emp.password, 'newemppass')
