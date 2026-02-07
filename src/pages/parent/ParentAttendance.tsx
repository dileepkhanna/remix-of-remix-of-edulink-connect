import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { parentSidebarItems } from '@/config/parentSidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, subDays } from 'date-fns';
import { BackButton } from '@/components/ui/back-button';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  reason: string | null;
}

export default function ParentAttendance() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [childName, setChildName] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchAttendance() {
      if (!user) return;
      setLoadingData(true);

      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentData) {
        const { data: links } = await supabase
          .from('student_parents')
          .select('student_id, students(full_name)')
          .eq('parent_id', parentData.id);

        if (links && links.length > 0) {
          const studentId = links[0].student_id;
          setChildName((links[0] as any).students?.full_name || '');

          const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
          const { data: attendanceData } = await supabase
            .from('attendance')
            .select('id, date, status, reason')
            .eq('student_id', studentId)
            .gte('date', thirtyDaysAgo)
            .order('date', { ascending: false });

          if (attendanceData) setAttendance(attendanceData);
        }
      }
      setLoadingData(false);
    }
    fetchAttendance();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      late: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  if (loading || loadingData) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const stats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
  };
  const percentage = attendance.length > 0 ? Math.round((stats.present / attendance.length) * 100) : 0;

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/parent" />
        <div>
          <h1 className="font-display text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">{childName}'s attendance record (Last 30 days)</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{percentage}%</p>
              <p className="text-sm text-muted-foreground">Attendance</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-green-500">{stats.present}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-red-500">{stats.absent}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-yellow-500">{stats.late}</p>
              <p className="text-sm text-muted-foreground">Late</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No attendance records found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{record.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
