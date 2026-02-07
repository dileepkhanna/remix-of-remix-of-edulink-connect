import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Bell,
  FileText,
  MessageSquare,
  Clock,
  LayoutDashboard,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';

const teacherSidebarItems = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', path: '/teacher' },
  { icon: <GraduationCap className="h-5 w-5" />, label: 'My Classes', path: '/teacher/classes' },
  { icon: <Users className="h-5 w-5" />, label: 'Students', path: '/teacher/students' },
  { icon: <Clock className="h-5 w-5" />, label: 'Attendance', path: '/teacher/attendance' },
  { icon: <BookOpen className="h-5 w-5" />, label: 'Homework', path: '/teacher/homework' },
  { icon: <FileText className="h-5 w-5" />, label: 'Exam Marks', path: '/teacher/exams' },
  { icon: <ClipboardList className="h-5 w-5" />, label: 'Reports', path: '/teacher/reports' },
  { icon: <Bell className="h-5 w-5" />, label: 'Announcements', path: '/teacher/announcements' },
  { icon: <Calendar className="h-5 w-5" />, label: 'Leave Request', path: '/teacher/leave' },
  { icon: <MessageSquare className="h-5 w-5" />, label: 'Messages', path: '/teacher/messages' },
];

interface ClassData {
  id: string;
  name: string;
  section: string;
  academic_year: string;
  studentCount?: number;
}

export default function TeacherClasses() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'teacher')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchClasses() {
      if (!user) return;
      
      try {
        // Get teacher record
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teacher) {
          // Get classes from teacher_classes table
          const { data: teacherClasses } = await supabase
            .from('teacher_classes')
            .select('class_id')
            .eq('teacher_id', teacher.id);

          const teacherClassIds = teacherClasses?.map(tc => tc.class_id) || [];

          // Also get classes where this teacher is the class_teacher
          const { data: classTeacherClasses } = await supabase
            .from('classes')
            .select('id')
            .eq('class_teacher_id', teacher.id);

          const classTeacherIds = classTeacherClasses?.map(c => c.id) || [];

          // Combine and deduplicate class IDs
          const allClassIds = [...new Set([...teacherClassIds, ...classTeacherIds])];

          if (allClassIds.length > 0) {
            const { data: classData } = await supabase
              .from('classes')
              .select('*')
              .in('id', allClassIds);

            if (classData) {
              // Get student counts for each class
              const classesWithCounts = await Promise.all(
                classData.map(async (cls) => {
                  const { count } = await supabase
                    .from('students')
                    .select('*', { count: 'exact', head: true })
                    .eq('class_id', cls.id);
                  return { ...cls, studentCount: count || 0 };
                })
              );
              setClasses(classesWithCounts);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoadingData(false);
      }
    }

    fetchClasses();
  }, [user]);

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
        <BackButton to="/teacher" />
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">My Classes</h1>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : classes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No classes assigned yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Card key={cls.id} className="card-elevated hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/teacher/students?class=${cls.id}`)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{cls.name} - {cls.section}</span>
                    <Badge variant="secondary">{cls.academic_year}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{cls.studentCount} Students</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
