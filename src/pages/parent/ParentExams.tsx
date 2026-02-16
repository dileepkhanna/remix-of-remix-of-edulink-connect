import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Loader2 } from 'lucide-react';
import { parentSidebarItems } from '@/config/parentSidebar';
import StudentProgressView from '@/components/exams/StudentProgressView';
import { BackButton } from '@/components/ui/back-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function ParentExams() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [childName, setChildName] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [selectedExam, setSelectedExam] = useState('all');

  useEffect(() => {
    if (!loading && (!user || userRole !== 'parent')) {
      navigate('/auth');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    async function fetchMarks() {
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

          const { data: marksData } = await supabase
            .from('exam_marks')
            .select('*, exams(name, exam_date, max_marks, subjects(name))')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false });

          if (marksData) setMarks(marksData as ExamMark[]);
        }
      }
      setLoadingData(false);
    }
    fetchMarks();
  }, [user]);

  const examNames = useMemo(() => 
    [...new Set(marks.map(m => m.exams?.name).filter(Boolean))] as string[],
    [marks]
  );

  const filteredMarks = useMemo(() => {
    if (selectedExam === 'all') return marks;
    return marks.filter(m => m.exams?.name === selectedExam);
  }, [marks, selectedExam]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isLoadingContent = loadingData;

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      {isLoadingContent ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/parent" />
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Exam Results</h1>
            <p className="text-muted-foreground">{childName}'s examination performance</p>
          </div>
          {examNames.length > 1 && (
            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                {examNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <StudentProgressView marks={filteredMarks} studentName={childName} showAnalytics={true} />
      </div>
      )}
    </DashboardLayout>
  );
}