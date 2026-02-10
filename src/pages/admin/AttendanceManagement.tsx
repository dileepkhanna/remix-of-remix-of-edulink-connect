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
import { Loader2, Calendar, Download, Users, CheckCircle2, XCircle, Clock, FileText, FileSpreadsheet, TrendingUp, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { downloadAttendanceCSV, downloadAttendancePDF } from '@/utils/attendanceDownload';
import { format } from 'date-fns';
import { BackButton } from '@/components/ui/back-button';
import { Progress } from '@/components/ui/progress';

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
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
  }, [selectedClass, selectedDate, dateFrom, dateTo]);

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').order('name');
    if (data) setClasses(data);
  };

  const fetchAttendance = async () => {
    setLoadingData(true);

    let query = supabase
      .from('attendance')
      .select('*, students(full_name, admission_number, class_id, classes(name, section))')
      .order('created_at', { ascending: false });

    // Support date range or single date
    if (dateFrom && dateTo) {
      query = query.gte('date', dateFrom).lte('date', dateTo);
    } else if (dateFrom) {
      query = query.gte('date', dateFrom);
    } else if (dateTo) {
      query = query.lte('date', dateTo);
    } else {
      query = query.eq('date', selectedDate);
    }

    const { data } = await query;

    let filtered = data || [];
    if (selectedClass !== 'all') {
      filtered = filtered.filter(a => a.students?.class_id === selectedClass);
    }

    setAttendance(filtered as AttendanceRecord[]);

    const present = filtered.filter(a => a.status === 'present').length;
    const absent = filtered.filter(a => a.status === 'absent').length;
    const late = filtered.filter(a => a.status === 'late').length;
    setStats({ total: filtered.length, present, absent, late });

    setLoadingData(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present': return <Badge className="bg-success/10 text-success border-success/20 gap-1"><CheckCircle2 className="h-3 w-3" /> Present</Badge>;
      case 'absent': return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1"><XCircle className="h-3 w-3" /> Absent</Badge>;
      case 'late': return <Badge className="bg-warning/10 text-warning border-warning/20 gap-1"><Clock className="h-3 w-3" /> Late</Badge>;
      case 'half-day': return <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">Half Day</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const attendanceRate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

  const filteredAttendance = searchQuery
    ? attendance.filter(a =>
        a.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.students?.admission_number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : attendance;

  const handleExportCSV = () => {
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
  };

  const handleExportPDF = () => {
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
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/admin" />
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold">Attendance Reports</h1>
          <p className="text-muted-foreground text-sm">View and manage student attendance records</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="card-elevated col-span-2 lg:col-span-1">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">{attendanceRate}%</p>
              <p className="text-xs text-muted-foreground font-medium">Attendance Rate</p>
              <Progress value={attendanceRate} className="h-1.5 w-full mt-1" />
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardContent className="p-4 flex flex-col items-center justify-center gap-1">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-foreground" />
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground font-medium">Total</p>
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

        {/* Filters & Actions Bar */}
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 flex flex-col sm:flex-row gap-3">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="sm:w-[200px]"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-background">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setDateFrom(''); setDateTo(''); }}
                    className="border-0 p-0 h-auto shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">or range:</div>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[140px]" placeholder="From" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[140px]" placeholder="To" />
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search student..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={attendance.length === 0} className="shrink-0">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Print / Save as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Attendance Records
              {!loadingData && <Badge variant="secondary" className="ml-2 text-xs">{filteredAttendance.length} records</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading attendance...</p>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">No records found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery ? 'Try a different search term' : 'No attendance records for this date'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">Student</TableHead>
                      <TableHead className="font-semibold">Admission No</TableHead>
                      <TableHead className="font-semibold">Class</TableHead>
                      <TableHead className="font-semibold">Session</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium">{record.students?.full_name || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{record.students?.admission_number || 'N/A'}</TableCell>
                        <TableCell>
                          {record.students?.classes ? (
                            <Badge variant="outline" className="font-normal">
                              {record.students.classes.name} - {record.students.classes.section}
                            </Badge>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{record.session || 'Full Day'}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{record.reason || '—'}</TableCell>
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
