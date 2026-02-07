import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar as CalendarIcon,
  Bell,
  FileText,
  MessageSquare,
  Clock,
  LayoutDashboard,
  Loader2,
  ClipboardList,
  Check,
  X,
  Save,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { downloadAttendanceCSV, downloadAttendancePDF } from '@/utils/attendanceDownload';
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
  { icon: <CalendarIcon className="h-5 w-5" />, label: 'Leave Request', path: '/teacher/leave' },
  { icon: <MessageSquare className="h-5 w-5" />, label: 'Messages', path: '/teacher/messages' },
];

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
  photo_url: string | null;
}

interface AttendanceRecord {
  student_id: string;
  status: 'present' | 'absent' | 'late';
}

interface ClassOption {
  id: string;
  name: string;
  section: string;
}

export default function TeacherAttendance() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'teacher')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchClasses() {
      if (!user) return;
      
      try {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teacher) {
          setTeacherId(teacher.id);

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
              .select('id, name, section')
              .in('id', allClassIds);

            if (classData) {
              setClasses(classData);
              if (classData.length > 0 && !selectedClass) {
                setSelectedClass(classData[0].id);
              }
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

  useEffect(() => {
    async function fetchStudentsAndAttendance() {
      if (!selectedClass) return;
      
      setLoadingData(true);
      try {
        const { data: studentData } = await supabase
          .from('students')
          .select('id, full_name, admission_number, photo_url')
          .eq('class_id', selectedClass)
          .order('full_name');

        if (studentData) {
          setStudents(studentData);
          
          // Fetch existing attendance for this date
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('student_id, status')
            .in('student_id', studentData.map(s => s.id))
            .eq('date', dateStr);

          const attendanceMap: Record<string, 'present' | 'absent' | 'late'> = {};
          if (attendanceData) {
            attendanceData.forEach(a => {
              attendanceMap[a.student_id] = a.status as 'present' | 'absent' | 'late';
            });
          }
          // Set default to present for students without attendance
          studentData.forEach(s => {
            if (!attendanceMap[s.id]) {
              attendanceMap[s.id] = 'present';
            }
          });
          setAttendance(attendanceMap);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setLoadingData(false);
      }
    }

    fetchStudentsAndAttendance();
  }, [selectedClass, selectedDate]);

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => {
      const current = prev[studentId] || 'present';
      const next = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
      return { ...prev, [studentId]: next };
    });
  };

  const saveAttendance = async () => {
    if (!teacherId) return;
    
    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Delete existing attendance for this date and these students
      await supabase
        .from('attendance')
        .delete()
        .in('student_id', students.map(s => s.id))
        .eq('date', dateStr);

      // Insert new attendance records
      const records = students.map(student => ({
        student_id: student.id,
        date: dateStr,
        status: attendance[student.id] || 'present',
        marked_by: teacherId,
      }));

      const { error } = await supabase.from('attendance').insert(records);
      
      if (error) throw error;
      toast.success('Attendance saved successfully');
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length;
  const lateCount = Object.values(attendance).filter(s => s === 'late').length;

  return (
    <DashboardLayout sidebarItems={teacherSidebarItems} roleColor="teacher">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/teacher" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-bold">Attendance</h1>
          <div className="flex flex-wrap gap-3">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} - {cls.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-green-50 dark:bg-green-950/30 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              <p className="text-sm text-green-600">Present</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/30 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{absentCount}</p>
              <p className="text-sm text-red-600">Absent</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
              <p className="text-sm text-yellow-600">Late</p>
            </CardContent>
          </Card>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No students in this class.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.photo_url || ''} />
                          <AvatarFallback className="gradient-teacher text-white">
                            {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground">{student.admission_number}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleAttendance(student.id)}
                        className={cn(
                          "px-4 py-2 rounded-lg font-medium transition-all",
                          attendance[student.id] === 'present' && "bg-green-100 text-green-700 dark:bg-green-900/30",
                          attendance[student.id] === 'absent' && "bg-red-100 text-red-700 dark:bg-red-900/30",
                          attendance[student.id] === 'late' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30"
                        )}
                      >
                        {attendance[student.id] === 'present' && <Check className="inline h-4 w-4 mr-1" />}
                        {attendance[student.id] === 'absent' && <X className="inline h-4 w-4 mr-1" />}
                        {attendance[student.id] === 'late' && <Clock className="inline h-4 w-4 mr-1" />}
                        {attendance[student.id]?.charAt(0).toUpperCase() + attendance[student.id]?.slice(1)}
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={students.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    const currentClass = classes.find(c => c.id === selectedClass);
                    const className = currentClass ? `${currentClass.name}-${currentClass.section}` : 'Class';
                    const records = students.map(student => ({
                      studentName: student.full_name,
                      admissionNumber: student.admission_number,
                      className: className,
                      date: format(selectedDate, 'MMM d, yyyy'),
                      status: attendance[student.id] || 'present',
                    }));
                    downloadAttendanceCSV(records, `attendance-${className}-${format(selectedDate, 'yyyy-MM-dd')}`);
                    toast.success('CSV file downloaded');
                  }}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    const currentClass = classes.find(c => c.id === selectedClass);
                    const className = currentClass ? `${currentClass.name}-${currentClass.section}` : 'Class';
                    const records = students.map(student => ({
                      studentName: student.full_name,
                      admissionNumber: student.admission_number,
                      className: className,
                      date: format(selectedDate, 'MMM d, yyyy'),
                      status: attendance[student.id] || 'present',
                    }));
                    downloadAttendancePDF(records, `Attendance Report - ${className}`, format(selectedDate, 'MMMM d, yyyy'));
                    toast.success('Print window opened');
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Print / Save as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={saveAttendance} disabled={saving} size="lg">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Attendance
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
