import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Clock,
  BookOpen,
  FileText,
  ClipboardList,
  Bell,
  Calendar,
  MessageSquare,
  UserPlus,
} from 'lucide-react';

export const teacherSidebarItems = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', path: '/teacher' },
  { icon: <GraduationCap className="h-5 w-5" />, label: 'My Classes', path: '/teacher/classes' },
  { icon: <Users className="h-5 w-5" />, label: 'Students', path: '/teacher/students' },
  { icon: <Clock className="h-5 w-5" />, label: 'Attendance', path: '/teacher/attendance' },
  { icon: <BookOpen className="h-5 w-5" />, label: 'Homework', path: '/teacher/homework' },
  { icon: <FileText className="h-5 w-5" />, label: 'Exam Marks', path: '/teacher/exams' },
  { icon: <ClipboardList className="h-5 w-5" />, label: 'Reports', path: '/teacher/reports' },
  { icon: <Bell className="h-5 w-5" />, label: 'Announcements', path: '/teacher/announcements' },
  { icon: <Calendar className="h-5 w-5" />, label: 'Leave Request', path: '/teacher/leave' },
  { icon: <UserPlus className="h-5 w-5" />, label: 'Leads', path: '/teacher/leads' },
  { icon: <MessageSquare className="h-5 w-5" />, label: 'Messages', path: '/teacher/messages' },
];
