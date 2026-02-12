import { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, Award, BookOpen, BarChart3, Download } from 'lucide-react';
import { toast } from 'sonner';

interface ExamMark {
  id: string;
  marks_obtained: number | null;
  grade: string | null;
  remarks: string | null;
  exams: {
    name: string;
    exam_date: string | null;
    max_marks: number | null;
    subjects: { name: string } | null;
  } | null;
}

interface Props {
  marks: ExamMark[];
  studentName: string;
  showAnalytics?: boolean;
}

export default function StudentProgressView({ marks, studentName, showAnalytics = true }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const analytics = useMemo(() => {
    const validMarks = marks.filter(m => m.marks_obtained !== null && m.exams?.max_marks);
    
    if (validMarks.length === 0) return null;

    const percentages = validMarks.map(m => 
      (m.marks_obtained! / (m.exams?.max_marks || 100)) * 100
    );
    
    const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;
    
    const gradeCount = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'F': 0 };
    validMarks.forEach(m => {
      if (m.grade && gradeCount.hasOwnProperty(m.grade)) {
        gradeCount[m.grade as keyof typeof gradeCount]++;
      }
    });
    
    const bestSubject = validMarks.reduce((best, current) => {
      const currentPct = (current.marks_obtained! / (current.exams?.max_marks || 100)) * 100;
      const bestPct = best ? (best.marks_obtained! / (best.exams?.max_marks || 100)) * 100 : 0;
      return currentPct > bestPct ? current : best;
    }, null as ExamMark | null);
    
    const weakestSubject = validMarks.reduce((worst, current) => {
      const currentPct = (current.marks_obtained! / (current.exams?.max_marks || 100)) * 100;
      const worstPct = worst ? (worst.marks_obtained! / (worst.exams?.max_marks || 100)) * 100 : 100;
      return currentPct < worstPct ? current : worst;
    }, null as ExamMark | null);

    return {
      average,
      totalExams: validMarks.length,
      gradeCount,
      bestSubject: bestSubject?.exams?.subjects?.name || 'N/A',
      weakestSubject: weakestSubject?.exams?.subjects?.name || 'N/A',
      trend: average >= 70 ? 'up' : average >= 50 ? 'stable' : 'down'
    };
  }, [marks]);

  const getGradeColor = (grade: string | null) => {
    if (!grade) return 'bg-muted text-muted-foreground';
    const g = grade.toUpperCase();
    if (g === 'A+' || g === 'A') return 'bg-emerald-500 text-white';
    if (g === 'B+' || g === 'B') return 'bg-blue-500 text-white';
    if (g === 'C+' || g === 'C') return 'bg-amber-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 60) return 'text-blue-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  // Group marks by exam name
  const groupedByExam = marks.reduce((acc, mark) => {
    const examName = mark.exams?.name || 'Unknown';
    if (!acc[examName]) acc[examName] = [];
    acc[examName].push(mark);
    return acc;
  }, {} as Record<string, ExamMark[]>);

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Please allow popups to download PDF'); return; }
    printWindow.document.write(`
      <html><head><title>${studentName} - Exam Results</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; padding: 20px; color: #333; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 16px; color: #6c7580; margin: 16px 0 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; font-weight: 600; }
        .summary { display: flex; gap: 20px; margin-bottom: 16px; }
        .summary-item { background: #f8f8f8; padding: 12px; border-radius: 8px; text-align: center; flex: 1; }
        .summary-item .value { font-size: 22px; font-weight: 700; }
        .summary-item .label { font-size: 11px; color: #888; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>${studentName} - Exam Results Report</h1>
      <p style="color:#888;font-size:12px;">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      ${analytics ? `<div class="summary">
        <div class="summary-item"><div class="value">${analytics.average.toFixed(1)}%</div><div class="label">Average Score</div></div>
        <div class="summary-item"><div class="value">${analytics.totalExams}</div><div class="label">Total Exams</div></div>
        <div class="summary-item"><div class="value">${analytics.bestSubject}</div><div class="label">Best Subject</div></div>
      </div>` : ''}
      ${Object.entries(groupedByExam).map(([examName, examMarks]) => `
        <h2>${examName}</h2>
        <table>
          <thead><tr><th>Subject</th><th>Marks</th><th>%</th><th>Grade</th><th>Remarks</th></tr></thead>
          <tbody>${examMarks.map(m => {
            const pct = m.marks_obtained && m.exams?.max_marks ? ((m.marks_obtained / m.exams.max_marks) * 100).toFixed(0) : '0';
            return `<tr><td>${m.exams?.subjects?.name || '-'}</td><td>${m.marks_obtained ?? '-'}/${m.exams?.max_marks ?? 100}</td><td>${pct}%</td><td>${m.grade || '-'}</td><td>${m.remarks || '-'}</td></tr>`;
          }).join('')}</tbody>
        </table>
      `).join('')}
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
    toast.success('PDF download initiated');
  };

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Download Button */}
      {marks.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      )}

      {/* Analytics Cards */}
      {showAnalytics && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className={`text-2xl font-bold ${getPercentageColor(analytics.average)}`}>
                    {analytics.average.toFixed(1)}%
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary/50" />
              </div>
              <Progress value={analytics.average} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Exams</p>
                  <p className="text-2xl font-bold">{analytics.totalExams}</p>
                </div>
                <BookOpen className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Best Subject</p>
                  <p className="text-lg font-bold text-emerald-600 capitalize">{analytics.bestSubject}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Needs Work</p>
                  <p className="text-lg font-bold text-amber-600 capitalize">{analytics.weakestSubject}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results by Exam */}
      {Object.entries(groupedByExam).map(([examName, examMarks]) => (
        <Card key={examName} className="overflow-hidden">
          <CardHeader className="pb-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                {examName}
              </CardTitle>
              <Badge variant="outline">
                {examMarks.length} subject{examMarks.length > 1 ? 's' : ''}
              </Badge>
            </div>
            {examMarks[0]?.exams?.exam_date && (
              <CardDescription>
                {new Date(examMarks[0].exams.exam_date).toLocaleDateString('en-IN', { 
                  day: 'numeric', month: 'long', year: 'numeric' 
                })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="min-w-[100px]">Subject</TableHead>
                    <TableHead className="text-center min-w-[80px]">Marks</TableHead>
                    <TableHead className="text-center min-w-[80px]">%</TableHead>
                    <TableHead className="text-center min-w-[60px]">Grade</TableHead>
                    <TableHead className="min-w-[120px] hidden sm:table-cell">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examMarks.map((mark) => {
                    const pct = mark.marks_obtained && mark.exams?.max_marks 
                      ? (mark.marks_obtained / mark.exams.max_marks) * 100 
                      : 0;
                    return (
                      <TableRow key={mark.id}>
                        <TableCell className="font-medium capitalize text-sm">
                          {mark.exams?.subjects?.name || '-'}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <span className="font-semibold">{mark.marks_obtained ?? '-'}</span>
                          <span className="text-muted-foreground text-xs">/{mark.exams?.max_marks ?? 100}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold text-sm ${getPercentageColor(pct)}`}>
                            {pct.toFixed(0)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-xs ${getGradeColor(mark.grade)}`}>
                            {mark.grade || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                          {mark.remarks || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ))}

      {marks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No exam results available yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
