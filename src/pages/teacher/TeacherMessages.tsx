import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Loader2, Users, GraduationCap, BookOpen, Calendar, Bell, FileText, MessageSquare, Clock, LayoutDashboard, ClipboardList } from 'lucide-react';
import MessagingInterface from '@/components/messaging/MessagingInterface';

const teacherSidebarItems = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', path: '/teacher' },
  { icon: <GraduationCap className="h-5 w-5" />, label: 'My Classes', path: '/teacher/classes' },
  { icon: <Users className="h-5 w-5" />, label: 'Students', path: '/teacher/students' },
  { icon: <Clock className="h-5 w-5" />, label: 'Attendance', path: '/teacher/attendance' },
  { icon: <Calendar className="h-5 w-5" />, label: 'Timetable', path: '/teacher/timetable' },
  { icon: <BookOpen className="h-5 w-5" />, label: 'Homework', path: '/teacher/homework' },
  { icon: <FileText className="h-5 w-5" />, label: 'Exam Marks', path: '/teacher/exams' },
  { icon: <ClipboardList className="h-5 w-5" />, label: 'Reports', path: '/teacher/reports' },
  { icon: <Bell className="h-5 w-5" />, label: 'Announcements', path: '/teacher/announcements' },
  { icon: <Calendar className="h-5 w-5" />, label: 'Leave Request', path: '/teacher/leave' },
  { icon: <MessageSquare className="h-5 w-5" />, label: 'Messages', path: '/teacher/messages' },
];

export default function TeacherMessages() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || userRole !== 'teacher')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout sidebarItems={teacherSidebarItems} roleColor="teacher">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Communicate with parents of your students</p>
        </div>

        {user && (
          <MessagingInterface
            currentUserId={user.id}
            currentUserRole="teacher"
          />
        )}
      </div>
    </DashboardLayout>
  );
}
