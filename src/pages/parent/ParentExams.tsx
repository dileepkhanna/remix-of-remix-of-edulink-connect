import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Loader2 } from 'lucide-react';
import { parentSidebarItems } from '@/config/parentSidebar';
import StudentProgressView from '@/components/exams/StudentProgressView';
import { BackButton } from '@/components/ui/back-button';

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

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout sidebarItems={parentSidebarItems} roleColor="parent">
      <div className="space-y-6 animate-fade-in">
        <BackButton to="/parent" />
        <div>
          <h1 className="font-display text-2xl font-bold">Exam Results</h1>
          <p className="text-muted-foreground">{childName}'s examination performance</p>
        </div>

        <StudentProgressView marks={marks} studentName={childName} showAnalytics={true} />
      </div>
    </DashboardLayout>
  );
}
