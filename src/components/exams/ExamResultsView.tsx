import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search, Download, FileSpreadsheet, Users, Award, BarChart3, TrendingUp, TrendingDown, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface ExamResult {
  id: string;
  marks_obtained: number | null;
  grade: string | null;
  remarks: string | null;
  student_id: string;
  exam_id: string;
  students: { full_name: string; admission_number: string; class_id: string | null } | null;
  exams: { name: string; exam_date: string | null; max_marks: number | null; class_id: string | null; subjects: { name: string } | null; classes: { name: string; section: string } | null } | null;
}

interface ClassOption { id: string; name: string; section: string }

export default function ExamResultsView() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamName, setSelectedExamName] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'report'>('table');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [marksRes, classesRes] = await Promise.all([
      supabase.from('exam_marks').select('*, students(full_name, admission_number, class_id), exams(name, exam_date, max_marks, class_id, subjects(name), classes(name, section))').order('created_at', { ascending: false }),
      supabase.from('classes').select('id, name, section').order('name'),
    ]);
    if (marksRes.data) setResults(marksRes.data as unknown as ExamResult[]);
    if (classesRes.data) setClasses(classesRes.data);
    setLoading(false);
  };

  const examNames = useMemo(() => [...new Set(results.map(r => r.exams?.name).filter(Boolean))], [results]);
  
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchesExam = selectedExamName === 'all' || r.exams?.name === selectedExamName;
      const matchesClass = selectedClass === 'all' || r.exams?.class_id === selectedClass;
      const matchesStudent = selectedStudent === 'all' || r.student_id === selectedStudent;
      const matchesSearch = !searchQuery || 
        r.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.students?.admission_number?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesExam && matchesClass && matchesStudent && matchesSearch;
    });
  }, [results, selectedExamName, selectedClass, selectedStudent, searchQuery]);

  const uniqueStudents = useMemo(() => {
    const studentMap = new Map<string, { id: string; name: string; admission: string }>();
    const filtered = results.filter(r => {
      const matchesClass = selectedClass === 'all' || r.exams?.class_id === selectedClass;
      return matchesClass && r.students;
    });
    filtered.forEach(r => {
      if (r.students && !studentMap.has(r.student_id)) {
        studentMap.set(r.student_id, { id: r.student_id, name: r.students.full_name, admission: r.students.admission_number });
      }
    });
    return Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [results, selectedClass]);

  // Progress report card data (grouped by student, then by exam)
  const reportCardData = useMemo(() => {
    if (selectedStudent === 'all') return null;
    const studentResults = filteredResults.filter(r => r.student_id === selectedStudent);
    const grouped: Record<string, ExamResult[]> = {};
    studentResults.forEach(r => {
      const examName = r.exams?.name || 'Unknown';
      if (!grouped[examName]) grouped[examName] = [];
      grouped[examName].push(r);
    });
    
    const student = studentResults[0]?.students;
    const totalMarks = studentResults.reduce((sum, r) => sum + (r.marks_obtained || 0), 0);
    const totalMax = studentResults.reduce((sum, r) => sum + (r.exams?.max_marks || 100), 0);
    const overallPct = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0;
    
    return { grouped, student, totalMarks, totalMax, overallPct, count: studentResults.length };
  }, [filteredResults, selectedStudent]);

  const getGradeColor = (grade: string | null) => {
    if (!grade) return 'bg-muted text-muted-foreground';
    const g = grade.toUpperCase();
    if (g === 'A+' || g === 'A') return 'bg-emerald-500 text-white';
    if (g === 'B+' || g === 'B') return 'bg-blue-500 text-white';
    if (g === 'C+' || g === 'C') return 'bg-amber-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getPctColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 60) return 'text-blue-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const handleExport = () => {
    const exportData = filteredResults.map(r => ({
      'Student Name': r.students?.full_name || '',
      'Admission No': r.students?.admission_number || '',
      'Exam': r.exams?.name || '',
      'Subject': r.exams?.subjects?.name || '',
      'Class': r.exams?.classes ? `${r.exams.classes.name}-${r.exams.classes.section}` : '',
      'Marks': r.marks_obtained ?? '',
      'Max Marks': r.exams?.max_marks ?? '',
      'Percentage': r.marks_obtained && r.exams?.max_marks ? `${((r.marks_obtained / r.exams.max_marks) * 100).toFixed(1)}%` : '',
      'Grade': r.grade || '',
      'Remarks': r.remarks || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `exam-results-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Results exported');
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select value={selectedExamName} onValueChange={setSelectedExamName}>
              <SelectTrigger><SelectValue placeholder="Exam / Unit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {examNames.map(name => <SelectItem key={name} value={name!}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedStudent('all'); }}>
              <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}-{c.section.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger><SelectValue placeholder="Student" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {uniqueStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.admission})</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')} className="flex-1">
                <BarChart3 className="h-4 w-4 mr-1" /> Table
              </Button>
              <Button variant={viewMode === 'report' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('report')} className="flex-1" disabled={selectedStudent === 'all'}>
                <Award className="h-4 w-4 mr-1" /> Report Card
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredResults.length === 0}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Card View */}
      {viewMode === 'report' && reportCardData && selectedStudent !== 'all' ? (
        <div className="space-y-4">
          {/* Student Summary */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="bg-primary/5 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Progress Report Card
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {reportCardData.student?.full_name} • {reportCardData.student?.admission_number}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold ${getPctColor(reportCardData.overallPct)}`}>{reportCardData.overallPct.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Overall Average</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold">{reportCardData.count}</p>
                  <p className="text-xs text-muted-foreground">Total Exams</p>
                </div>
                <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">{reportCardData.totalMarks}</p>
                  <p className="text-xs text-muted-foreground">Marks Obtained</p>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{reportCardData.totalMax}</p>
                  <p className="text-xs text-muted-foreground">Total Max Marks</p>
                </div>
              </div>
              <Progress value={reportCardData.overallPct} className="h-3" />
            </CardContent>
          </Card>

          {/* Results by Exam/Unit */}
          {Object.entries(reportCardData.grouped).map(([examName, marks]) => {
            const examTotal = marks.reduce((s, m) => s + (m.marks_obtained || 0), 0);
            const examMax = marks.reduce((s, m) => s + (m.exams?.max_marks || 100), 0);
            const examPct = examMax > 0 ? (examTotal / examMax) * 100 : 0;
            return (
              <Card key={examName} className="overflow-hidden">
                <CardHeader className="pb-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      {examName}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{marks.length} subject{marks.length > 1 ? 's' : ''}</Badge>
                      <span className={`font-bold ${getPctColor(examPct)}`}>{examPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">Marks</TableHead>
                        <TableHead className="text-center">%</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="hidden sm:table-cell">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marks.map(mark => {
                        const pct = mark.marks_obtained && mark.exams?.max_marks ? (mark.marks_obtained / mark.exams.max_marks) * 100 : 0;
                        return (
                          <TableRow key={mark.id}>
                            <TableCell className="font-medium capitalize">{mark.exams?.subjects?.name || '-'}</TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold">{mark.marks_obtained ?? '-'}</span>
                              <span className="text-muted-foreground text-xs">/{mark.exams?.max_marks ?? 100}</span>
                            </TableCell>
                            <TableCell className="text-center"><span className={`font-semibold ${getPctColor(pct)}`}>{pct.toFixed(0)}%</span></TableCell>
                            <TableCell className="text-center"><Badge className={`text-xs ${getGradeColor(mark.grade)}`}>{mark.grade || '-'}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{mark.remarks || '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/20 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-center">{examTotal}/{examMax}</TableCell>
                        <TableCell className="text-center"><span className={getPctColor(examPct)}>{examPct.toFixed(1)}%</span></TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Results
              <Badge variant="secondary" className="ml-1">{filteredResults.length} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredResults.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No results found. Adjust filters or enter marks first.</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Exam</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-center">Marks</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map(r => {
                      const pct = r.marks_obtained && r.exams?.max_marks ? (r.marks_obtained / r.exams.max_marks) * 100 : 0;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.students?.full_name || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.students?.admission_number || '-'}</TableCell>
                          <TableCell>{r.exams?.name || '-'}</TableCell>
                          <TableCell className="capitalize">{r.exams?.subjects?.name || '-'}</TableCell>
                          <TableCell>
                            {r.exams?.classes ? <Badge variant="outline">{r.exams.classes.name}-{r.exams.classes.section.toUpperCase()}</Badge> : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{r.marks_obtained ?? '-'}</span>
                            <span className="text-xs text-muted-foreground">/{r.exams?.max_marks ?? 100}</span>
                          </TableCell>
                          <TableCell className="text-center"><span className={`font-semibold ${getPctColor(pct)}`}>{pct.toFixed(0)}%</span></TableCell>
                          <TableCell className="text-center"><Badge className={`text-xs ${getGradeColor(r.grade)}`}>{r.grade || '-'}</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
