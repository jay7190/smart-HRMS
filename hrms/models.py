from django.db import models

class Department(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class Shift(models.Model):
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    grace_period = models.IntegerField(default=5) # minutes

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')})"

class Employee(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('On Leave', 'On Leave'),
        ('Remote', 'Remote'),
        ('Inactive', 'Inactive'),
        ('Remove Employee', 'Remove Employee'),
    ]

    employee_id = models.CharField(max_length=20, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    shift = models.ForeignKey(Shift, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    role = models.CharField(max_length=100)
    salary = models.DecimalField(max_digits=12, decimal_places=2)
    date_joined = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    bio = models.TextField(blank=True, null=True)
    password = models.CharField(max_length=128, blank=True, null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_id})"

class LeaveRequest(models.Model):
    LEAVE_TYPE_CHOICES = [
        ('Paid Leave', 'Paid Leave'),
        ('Sick Leave', 'Sick Leave'),
        ('Parental Leave', 'Parental Leave'),
        ('Unpaid Leave', 'Unpaid Leave'),
    ]
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.CharField(max_length=30, choices=LEAVE_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    applied_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee.first_name} - {self.leave_type} ({self.status})"

class Attendance(models.Model):
    STATUS_CHOICES = [
        ('Present', 'Present'),
        ('Late', 'Late'),
        ('Absent', 'Absent'),
        ('On Leave', 'On Leave'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    clock_in = models.TimeField()
    clock_out = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Present')

    class Meta:
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee.first_name} - {self.date} ({self.status})"

class Career(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Paused', 'Paused'),
        ('Closed', 'Closed'),
    ]

    title = models.CharField(max_length=150)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='careers')
    experience = models.CharField(max_length=50, default='0-2 Years')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.status}"
