import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, CheckCircle2, XCircle, Clock, TrendingUp, Users } from 'lucide-react';
import { parentSidebarItems } from '@/config/parentSidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, subDays } from 'date-fns';
import { BackButton } from '@/components/ui/back-button';
import { Progress } from '@/components/ui/progress';

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
      case 'present': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'absent': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'late': return <Clock className="h-4 w-4 text-warning" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <Badge className="bg-success/10 text-success border-success/20 gap-1"><CheckCircle2 className="h-3 w-3" /> Present</Badge>;
      case 'absent': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1"><XCircle className="h-3 w-3" /> Absent</Badge>;
      case 'late': return <Badge className="bg-warning/10 text-warning border-warning/20 gap-1"><Clock className="h-3 w-3" /> Late</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
  };
  const total = attendance.length;
  const percentage = total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 0;

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/parent" />

        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm">{childName}'s attendance record — Last 30 days</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="card-elevated col-span-2 lg:col-span-1">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">{percentage}%</p>
              <p className="text-xs text-muted-foreground font-medium">Attendance Rate</p>
              <Progress value={percentage} className="h-1.5 w-full mt-1" />
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-foreground" />
              </div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground font-medium">Total Days</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <p className="text-2xl font-bold text-success">{stats.present}</p>
              <p className="text-xs text-muted-foreground font-medium">Present</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
              <p className="text-xs text-muted-foreground font-medium">Absent</p>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <p className="text-2xl font-bold text-warning">{stats.late}</p>
              <p className="text-xs text-muted-foreground font-medium">Late</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Attendance History
              <Badge variant="secondary" className="ml-1 text-xs">{total} days</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">No records yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Attendance records will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Day</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => {
                      const date = new Date(record.date);
                      return (
                        <TableRow key={record.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="flex items-center gap-2 font-medium">
                            {getStatusIcon(record.status)}
                            {format(date, 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(date, 'EEEE')}
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{record.reason || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
