from django.contrib import admin
from django.urls import path
from hrms import views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Frontend Page
    path('', views.index_view, name='index'),
    
    # API Endpoints
    path('api/login/', views.login_api, name='api_login'),
    path('api/stats/', views.dashboard_stats_api, name='api_stats'),
    path('api/employees/', views.employee_list_api, name='api_employees'),
    path('api/employees/next-id/', views.next_employee_id_api, name='api_next_employee_id'),
    path('api/employees/<int:emp_id>/', views.employee_detail_api, name='api_employee_detail'),
    path('api/employees/<int:emp_id>/change-password/', views.change_password_api, name='api_change_password'),
    path('api/departments/', views.department_list_api, name='api_departments'),
    path('api/leave-requests/', views.leave_list_api, name='api_leaves'),
    path('api/leave-requests/<int:req_id>/action/', views.leave_action_api, name='api_leave_action'),
    path('api/attendance/', views.attendance_list_api, name='api_attendance'),
    path('api/attendance/clock/', views.attendance_clock_api, name='api_attendance_clock'),
    path('api/payroll/', views.payroll_api, name='api_payroll'),
    path('api/careers/', views.careers_list_api, name='api_careers'),
    path('api/careers/<int:career_id>/', views.career_detail_api, name='api_career_detail'),
    path('api/shifts/', views.shifts_list_api, name='api_shifts'),
    path('api/lead-inquiry/', views.lead_inquiry_api, name='api_lead_inquiry'),
]
