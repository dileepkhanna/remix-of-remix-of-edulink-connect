import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { adminSidebarItems } from '@/config/adminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Download, Users, CheckCircle, XCircle, Clock, FileText, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/StatCard';
import { downloadAttendanceCSV, downloadAttendancePDF } from '@/utils/attendanceDownload';
import { format } from 'date-fns';
import { BackButton } from '@/components/ui/back-button';

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: string;
  session: string | null;
  reason: string | null;
  students?: { full_name: string; admission_number: string; classes?: { name: string; section: string } | null } | null;
}

export default function AttendanceManagement() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; section: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loadingData, setLoadingData] = useState(true);

  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0 });

  useEffect(() => {
    if (!loading && (!user || userRole !== 'admin')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedClass, selectedDate]);

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name');
    if (data) setClasses(data);
  };

  const fetchAttendance = async () => {
    setLoadingData(true);

    let query = supabase
      .from('attendance')
      .select('*, students(full_name, admission_number, class_id, classes(name, section))')
      .eq('date', selectedDate)
      .order('created_at', { ascending: false });

    const { data } = await query;

    let filtered = data || [];
    if (selectedClass !== 'all') {
      filtered = filtered.filter(a => a.students?.class_id === selectedClass);
    }

    setAttendance(filtered as AttendanceRecord[]);

    // Calculate stats
    const present = filtered.filter(a => a.status === 'present').length;
    const absent = filtered.filter(a => a.status === 'absent').length;
    const late = filtered.filter(a => a.status === 'late').length;
    setStats({ total: filtered.length, present, absent, late });

    setLoadingData(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <Badge className="bg-success/10 text-success border-success/20">Present</Badge>;
      case 'absent': return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Absent</Badge>;
      case 'late': return <Badge className="bg-warning/10 text-warning border-warning/20">Late</Badge>;
      case 'half-day': return <Badge className="bg-primary/10 text-primary border-primary/20">Half Day</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/admin" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Attendance Reports</h1>
            <p className="text-muted-foreground">View and manage attendance records</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={attendance.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const records = attendance.map(record => ({
                  studentName: record.students?.full_name || 'N/A',
                  admissionNumber: record.students?.admission_number || 'N/A',
                  className: record.students?.classes ? `${record.students.classes.name} - ${record.students.classes.section}` : 'N/A',
                  date: format(new Date(record.date), 'MMM d, yyyy'),
                  status: record.status,
                  session: record.session || undefined,
                  reason: record.reason || undefined,
                }));
                const className = selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id === selectedClass)?.name || '';
                downloadAttendanceCSV(records, `attendance-${className}-${selectedDate}`);
                toast({ title: 'Download started', description: 'CSV file is being downloaded.' });
              }}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const records = attendance.map(record => ({
                  studentName: record.students?.full_name || 'N/A',
                  admissionNumber: record.students?.admission_number || 'N/A',
                  className: record.students?.classes ? `${record.students.classes.name} - ${record.students.classes.section}` : 'N/A',
                  date: format(new Date(record.date), 'MMM d, yyyy'),
                  status: record.status,
                  session: record.session || undefined,
                  reason: record.reason || undefined,
                }));
                const className = selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id === selectedClass)?.name || '';
                downloadAttendancePDF(records, `Attendance Report - ${className}`, format(new Date(selectedDate), 'MMMM d, yyyy'));
                toast({ title: 'Print window opened', description: 'Use the print dialog to save as PDF.' });
              }}>
                <FileText className="h-4 w-4 mr-2" />
                Print / Save as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Records" value={stats.total.toString()} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Present" value={stats.present.toString()} icon={<CheckCircle className="h-6 w-6" />} variant="primary" />
          <StatCard title="Absent" value={stats.absent.toString()} icon={<XCircle className="h-6 w-6" />} />
          <StatCard title="Late" value={stats.late.toString()} icon={<Clock className="h-6 w-6" />} />
        </div>

        {/* Filters */}
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card className="card-elevated">
          <CardHeader><CardTitle className="font-display">Attendance Records</CardTitle></CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No attendance records for this date</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.students?.full_name || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-sm">{record.students?.admission_number || 'N/A'}</TableCell>
                        <TableCell>
                          {record.students?.classes ? `${record.students.classes.name} - ${record.students.classes.section}` : 'N/A'}
                        </TableCell>
                        <TableCell>{record.session || 'Full Day'}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-muted-foreground">{record.reason || '-'}</TableCell>
                      </TableRow>
                    ))}
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
