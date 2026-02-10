import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { downloadAttendanceCSV, downloadAttendancePDF } from '@/utils/attendanceDownload';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  session: string | null;
  reason: string | null;
}

interface Props {
  attendance: AttendanceRecord[];
  childName: string;
  className?: string;
  admissionNumber?: string;
  onMonthChange?: (month: Date) => void;
}

export default function AttendanceCalendar({ attendance, childName, className = '', admissionNumber = '', onMonthChange }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<AttendanceRecord | null>(null);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendance.forEach(a => map.set(a.date, a));
    return map;
  }, [attendance]);

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOffset = getDay(startOfMonth(currentMonth));

  const goToPrev = () => {
    const prev = subMonths(currentMonth, 1);
    setCurrentMonth(prev);
    onMonthChange?.(prev);
  };

  const goToNext = () => {
    const next = addMonths(currentMonth, 1);
    setCurrentMonth(next);
    onMonthChange?.(next);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-emerald-500 text-white';
      case 'absent': return 'bg-red-500 text-white';
      case 'late': return 'bg-amber-500 text-white';
      case 'half-day': return 'bg-blue-500 text-white';
      default: return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late': return <Clock className="h-4 w-4 text-amber-500" />;
      default: return null;
    }
  };

  const monthStats = useMemo(() => {
    const monthRecords = attendance.filter(a => {
      const d = new Date(a.date);
      return isSameMonth(d, currentMonth);
    });
    return {
      present: monthRecords.filter(a => a.status === 'present').length,
      absent: monthRecords.filter(a => a.status === 'absent').length,
      late: monthRecords.filter(a => a.status === 'late').length,
      total: monthRecords.length,
    };
  }, [attendance, currentMonth]);

  const monthPct = monthStats.total > 0 ? Math.round(((monthStats.present + monthStats.late) / monthStats.total) * 100) : 0;

  const handleDownloadCSV = () => {
    const records = attendance.filter(a => isSameMonth(new Date(a.date), currentMonth)).map(a => ({
      studentName: childName,
      admissionNumber: admissionNumber,
      className: className,
      date: format(new Date(a.date), 'MMM d, yyyy'),
      status: a.status,
      session: a.session || undefined,
      reason: a.reason || undefined,
    }));
    downloadAttendanceCSV(records, `attendance-${childName}-${format(currentMonth, 'MMM-yyyy')}`);
    toast.success('CSV downloaded');
  };

  const handleDownloadPDF = () => {
    const records = attendance.filter(a => isSameMonth(new Date(a.date), currentMonth)).map(a => ({
      studentName: childName,
      admissionNumber: admissionNumber,
      className: className,
      date: format(new Date(a.date), 'MMM d, yyyy'),
      status: a.status,
      session: a.session || undefined,
      reason: a.reason || undefined,
    }));
    downloadAttendancePDF(records, `Attendance - ${childName}`, format(currentMonth, 'MMMM yyyy'));
    toast.success('Print window opened');
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={goToPrev}><ChevronLeft className="h-4 w-4" /></Button>
              <CardTitle className="text-lg font-display">{format(currentMonth, 'MMMM yyyy')}</CardTitle>
              <Button variant="ghost" size="icon" onClick={goToNext}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <span className="font-bold text-primary">{monthPct}%</span> attendance
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownloadCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadPDF}>
                    <FileText className="h-4 w-4 mr-2" /> PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center p-2 bg-muted/30 rounded-lg">
              <p className="text-lg font-bold">{monthStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Days</p>
            </div>
            <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
              <p className="text-lg font-bold text-emerald-600">{monthStats.present}</p>
              <p className="text-[10px] text-muted-foreground">Present</p>
            </div>
            <div className="text-center p-2 bg-red-500/10 rounded-lg">
              <p className="text-lg font-bold text-red-600">{monthStats.absent}</p>
              <p className="text-[10px] text-muted-foreground">Absent</p>
            </div>
            <div className="text-center p-2 bg-amber-500/10 rounded-lg">
              <p className="text-lg font-bold text-amber-600">{monthStats.late}</p>
              <p className="text-[10px] text-muted-foreground">Late</p>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
            ))}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {monthDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const record = attendanceMap.get(dateStr);
              const isTodayDate = isToday(day);
              return (
                <button
                  key={dateStr}
                  onClick={() => record && setSelectedDay(record)}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative",
                    record ? `${getStatusColor(record.status)} cursor-pointer hover:opacity-80 shadow-sm` : 'bg-muted/20 text-muted-foreground',
                    isTodayDate && !record && 'ring-2 ring-primary',
                    isTodayDate && record && 'ring-2 ring-white/50'
                  )}
                >
                  <span className="font-medium">{format(day, 'd')}</span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t">
            <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 rounded bg-emerald-500" /> Present</div>
            <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 rounded bg-red-500" /> Absent</div>
            <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 rounded bg-amber-500" /> Late</div>
            <div className="flex items-center gap-1.5 text-xs"><div className="w-3 h-3 rounded bg-muted/40" /> No Record</div>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDay && getStatusIcon(selectedDay.status)}
              Attendance Details
            </DialogTitle>
          </DialogHeader>
          {selectedDay && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="font-medium">{format(new Date(selectedDay.date), 'EEEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={getStatusColor(selectedDay.status)}>{selectedDay.status.charAt(0).toUpperCase() + selectedDay.status.slice(1)}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Session</span>
                <span className="font-medium">{selectedDay.session || 'Full Day'}</span>
              </div>
              {selectedDay.reason && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-1">Reason</span>
                  <p className="text-sm bg-muted/30 p-2 rounded">{selectedDay.reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
