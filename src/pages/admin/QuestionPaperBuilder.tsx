import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { adminSidebarItems } from '@/config/adminSidebar';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Search, FileText, Pencil, Trash2, ChevronLeft, CheckCircle2, HelpCircle, AlignLeft } from 'lucide-react';
import { toast } from 'sonner';

interface WeeklyExam {
  id: string;
  exam_title: string;
  class_id: string;
  total_marks: number;
  status: string;
  classes?: { name: string; section: string } | null;
}

interface ClassOption {
  id: string;
  name: string;
  section: string;
}

interface QuestionPaper {
  id: string;
  exam_id: string;
  class_id: string;
  total_questions: number;
  total_marks: number;
  uploaded_by: string | null;
  created_at: string | null;
}

interface Question {
  id: string;
  question_paper_id: string;
  question_number: number;
  question_text: string;
  question_type: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string | null;
  explanation: string | null;
  marks: number;
}

export default function QuestionPaperBuilder() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  const [exams, setExams] = useState<WeeklyExam[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected exam/paper for building questions
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [selectedExam, setSelectedExam] = useState<WeeklyExam | null>(null);

  // Create paper dialog
  const [createPaperOpen, setCreatePaperOpen] = useState(false);
  const [paperForm, setPaperForm] = useState({ exam_id: '', class_id: '' });

  // Question dialog
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [qForm, setQForm] = useState({
    question_type: 'mcq',
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: '',
    explanation: '',
    marks: '1',
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== 'admin')) navigate('/auth');
  }, [user, userRole, loading, navigate]);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoadingData(true);
    const [examsRes, classesRes, papersRes, questionsRes] = await Promise.all([
      supabase.from('weekly_exams').select('id, exam_title, class_id, total_marks, status, classes(name, section)').order('exam_date', { ascending: false }),
      supabase.from('classes').select('id, name, section').order('name'),
      supabase.from('question_papers').select('*').order('created_at', { ascending: false }),
      supabase.from('questions').select('*').order('question_number'),
    ]);
    if (examsRes.data) setExams(examsRes.data as WeeklyExam[]);
    if (classesRes.data) setClasses(classesRes.data as ClassOption[]);
    if (papersRes.data) setPapers(papersRes.data as QuestionPaper[]);
    if (questionsRes.data) setQuestions(questionsRes.data as Question[]);
    setLoadingData(false);
  }

  const getExamForPaper = (examId: string) => exams.find(e => e.id === examId);
  const getClassLabel = (classId: string) => {
    const c = classes.find(cl => cl.id === classId);
    return c ? `${c.name}-${c.section}` : '—';
  };
  const getQuestionsForPaper = (paperId: string) => questions.filter(q => q.question_paper_id === paperId);

  // Filter papers by search
  const filteredPapers = useMemo(() => {
    if (!searchQuery) return papers;
    const q = searchQuery.toLowerCase();
    return papers.filter(p => {
      const exam = getExamForPaper(p.exam_id);
      return exam?.exam_title?.toLowerCase().includes(q) || getClassLabel(p.class_id).toLowerCase().includes(q);
    });
  }, [papers, searchQuery, exams, classes]);

  // Exams that don't have a paper yet for the selected class
  const availableExams = useMemo(() => {
    return exams.filter(e => {
      // Check if paper already exists for this exam
      return !papers.some(p => p.exam_id === e.id);
    });
  }, [exams, papers]);

  async function handleCreatePaper(e: React.FormEvent) {
    e.preventDefault();
    if (!paperForm.exam_id) { toast.error('Select an exam'); return; }
    const exam = exams.find(ex => ex.id === paperForm.exam_id);
    const classId = paperForm.class_id || exam?.class_id;
    if (!classId) { toast.error('Class is required'); return; }

    const { data, error } = await supabase.from('question_papers').insert({
      exam_id: paperForm.exam_id,
      class_id: classId,
      total_questions: 0,
      total_marks: 0,
      uploaded_by: user?.id,
    }).select().single();

    if (error) { toast.error(error.message); return; }
    toast.success('Question paper created');
    setCreatePaperOpen(false);
    setPaperForm({ exam_id: '', class_id: '' });
    await fetchData();
    // Auto-open the new paper
    if (data) {
      setSelectedPaper(data as QuestionPaper);
      setSelectedExam(exam || null);
    }
  }

  function openPaper(paper: QuestionPaper) {
    setSelectedPaper(paper);
    setSelectedExam(getExamForPaper(paper.exam_id) || null);
  }

  async function handleDeletePaper(id: string) {
    // Delete questions first
    await supabase.from('questions').delete().eq('question_paper_id', id);
    const { error } = await supabase.from('question_papers').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Question paper deleted');
    if (selectedPaper?.id === id) { setSelectedPaper(null); setSelectedExam(null); }
    fetchData();
  }

  function resetQForm() {
    setQForm({ question_type: 'mcq', question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: '', explanation: '', marks: '1' });
    setEditingQuestion(null);
  }

  function openAddQuestion() {
    resetQForm();
    const paperQuestions = getQuestionsForPaper(selectedPaper!.id);
    setQuestionDialogOpen(true);
  }

  function openEditQuestion(q: Question) {
    setEditingQuestion(q);
    setQForm({
      question_type: q.question_type,
      question_text: q.question_text,
      option_a: q.option_a || '',
      option_b: q.option_b || '',
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
      marks: q.marks.toString(),
    });
    setQuestionDialogOpen(true);
  }

  async function handleSaveQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPaper) return;
    if (!qForm.question_text.trim()) { toast.error('Question text is required'); return; }
    if (qForm.question_type === 'mcq' && (!qForm.option_a || !qForm.option_b)) {
      toast.error('MCQ needs at least options A and B'); return;
    }

    const paperQuestions = getQuestionsForPaper(selectedPaper.id);

    if (editingQuestion) {
      const { error } = await supabase.from('questions').update({
        question_text: qForm.question_text,
        question_type: qForm.question_type,
        option_a: qForm.question_type === 'mcq' ? qForm.option_a : null,
        option_b: qForm.question_type === 'mcq' ? qForm.option_b : null,
        option_c: qForm.question_type === 'mcq' ? qForm.option_c : null,
        option_d: qForm.question_type === 'mcq' ? qForm.option_d : null,
        correct_answer: qForm.correct_answer || null,
        explanation: qForm.explanation || null,
        marks: parseInt(qForm.marks) || 1,
      }).eq('id', editingQuestion.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Question updated');
    } else {
      const nextNum = paperQuestions.length + 1;
      const { error } = await supabase.from('questions').insert({
        question_paper_id: selectedPaper.id,
        question_number: nextNum,
        question_text: qForm.question_text,
        question_type: qForm.question_type,
        option_a: qForm.question_type === 'mcq' ? qForm.option_a : null,
        option_b: qForm.question_type === 'mcq' ? qForm.option_b : null,
        option_c: qForm.question_type === 'mcq' ? qForm.option_c : null,
        option_d: qForm.question_type === 'mcq' ? qForm.option_d : null,
        correct_answer: qForm.correct_answer || null,
        explanation: qForm.explanation || null,
        marks: parseInt(qForm.marks) || 1,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Question added');
    }

    // Update paper totals
    await updatePaperTotals(selectedPaper.id);
    setQuestionDialogOpen(false);
    resetQForm();
    fetchData();
  }

  async function handleDeleteQuestion(qId: string) {
    if (!selectedPaper) return;
    const { error } = await supabase.from('questions').delete().eq('id', qId);
    if (error) { toast.error(error.message); return; }
    // Re-number remaining questions
    const remaining = getQuestionsForPaper(selectedPaper.id).filter(q => q.id !== qId).sort((a, b) => a.question_number - b.question_number);
    for (let i = 0; i < remaining.length; i++) {
      await supabase.from('questions').update({ question_number: i + 1 }).eq('id', remaining[i].id);
    }
    await updatePaperTotals(selectedPaper.id);
    toast.success('Question deleted');
    fetchData();
  }

  async function updatePaperTotals(paperId: string) {
    const qs = getQuestionsForPaper(paperId);
    // Recalculate after current operation (fetch fresh)
    const { data } = await supabase.from('questions').select('marks').eq('question_paper_id', paperId);
    if (data) {
      const totalQ = data.length;
      const totalM = data.reduce((sum, q) => sum + (q.marks || 0), 0);
      await supabase.from('question_papers').update({ total_questions: totalQ, total_marks: totalM }).eq('id', paperId);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Question builder view for a selected paper
  if (selectedPaper && selectedExam) {
    const paperQuestions = getQuestionsForPaper(selectedPaper.id).sort((a, b) => a.question_number - b.question_number);
    const totalMarks = paperQuestions.reduce((s, q) => s + q.marks, 0);
    const mcqCount = paperQuestions.filter(q => q.question_type === 'mcq').length;
    const descCount = paperQuestions.filter(q => q.question_type === 'descriptive').length;

    return (
      <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
        <div className="space-y-6 animate-fade-in">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedPaper(null); setSelectedExam(null); }}>
            <ChevronLeft className="h-4 w-4 mr-1" />Back to Papers
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold">{selectedExam.exam_title}</h1>
              <p className="text-muted-foreground text-sm">
                {getClassLabel(selectedPaper.class_id)} · {paperQuestions.length} questions · {totalMarks} marks
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">{mcqCount} MCQ</Badge>
                <Badge variant="outline" className="text-xs">{descCount} Descriptive</Badge>
              </div>
            </div>
            <Button onClick={openAddQuestion}>
              <Plus className="h-4 w-4 mr-2" />Add Question
            </Button>
          </div>

          {paperQuestions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No questions yet. Click "Add Question" to start building the paper.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {paperQuestions.map(q => (
                <Card key={q.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-primary">Q{q.question_number}</span>
                          <Badge variant={q.question_type === 'mcq' ? 'secondary' : 'outline'} className="text-xs">
                            {q.question_type === 'mcq' ? <><HelpCircle className="h-3 w-3 mr-1" />MCQ</> : <><AlignLeft className="h-3 w-3 mr-1" />Descriptive</>}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{q.marks} mark{q.marks > 1 ? 's' : ''}</Badge>
                        </div>
                        <p className="text-sm">{q.question_text}</p>
                        {q.question_type === 'mcq' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                            {['A', 'B', 'C', 'D'].map(opt => {
                              const val = q[`option_${opt.toLowerCase()}` as keyof Question] as string | null;
                              if (!val) return null;
                              const isCorrect = q.correct_answer?.toUpperCase() === opt;
                              return (
                                <div key={opt} className={`flex items-center gap-1.5 p-1.5 rounded ${isCorrect ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}>
                                  {isCorrect && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                                  <span>{opt}. {val}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {q.correct_answer && q.question_type === 'descriptive' && (
                          <p className="text-xs text-muted-foreground"><strong>Answer:</strong> {q.correct_answer}</p>
                        )}
                        {q.explanation && (
                          <p className="text-xs text-muted-foreground italic">💡 {q.explanation}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditQuestion(q)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteQuestion(q.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add/Edit Question Dialog */}
          <Dialog open={questionDialogOpen} onOpenChange={v => { setQuestionDialogOpen(v); if (!v) resetQForm(); }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={qForm.question_type} onValueChange={v => setQForm(f => ({ ...f, question_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">MCQ</SelectItem>
                        <SelectItem value="descriptive">Descriptive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Marks</Label>
                    <Input type="number" value={qForm.marks} onChange={e => setQForm(f => ({ ...f, marks: e.target.value }))} min="1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Question Text *</Label>
                  <Textarea value={qForm.question_text} onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))} rows={3} placeholder="Enter the question..." />
                </div>

                {qForm.question_type === 'mcq' && (
                  <div className="space-y-3">
                    <Label>Options</Label>
                    {['A', 'B', 'C', 'D'].map(opt => (
                      <div key={opt} className="flex items-center gap-2">
                        <span className="text-xs font-bold w-4">{opt}</span>
                        <Input
                          value={qForm[`option_${opt.toLowerCase()}` as keyof typeof qForm] as string}
                          onChange={e => setQForm(f => ({ ...f, [`option_${opt.toLowerCase()}`]: e.target.value }))}
                          placeholder={`Option ${opt}${opt <= 'B' ? ' *' : ' (optional)'}`}
                        />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label>Correct Answer</Label>
                      <Select value={qForm.correct_answer} onValueChange={v => setQForm(f => ({ ...f, correct_answer: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select correct option" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {qForm.question_type === 'descriptive' && (
                  <div className="space-y-2">
                    <Label>Model Answer (optional)</Label>
                    <Textarea value={qForm.correct_answer} onChange={e => setQForm(f => ({ ...f, correct_answer: e.target.value }))} rows={2} placeholder="Expected answer..." />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Explanation (optional)</Label>
                  <Textarea value={qForm.explanation} onChange={e => setQForm(f => ({ ...f, explanation: e.target.value }))} rows={2} placeholder="Why this is the correct answer..." />
                </div>

                <Button type="submit" className="w-full">{editingQuestion ? 'Save Changes' : 'Add Question'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    );
  }

  // Main list view
  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      {loadingData ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <BackButton to="/admin" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold">Question Papers</h1>
              <p className="text-muted-foreground">Build question papers for weekly exams</p>
            </div>
            <Button onClick={() => { setPaperForm({ exam_id: '', class_id: '' }); setCreatePaperOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />New Paper
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search papers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>

          {filteredPapers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No question papers yet. Click "New Paper" to create one.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPapers.map(paper => {
                const exam = getExamForPaper(paper.exam_id);
                const pQuestions = getQuestionsForPaper(paper.id);
                const mcqCount = pQuestions.filter(q => q.question_type === 'mcq').length;
                const descCount = pQuestions.filter(q => q.question_type === 'descriptive').length;
                return (
                  <Card key={paper.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openPaper(paper)}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <h3 className="font-medium text-sm">{exam?.exam_title || 'Unknown Exam'}</h3>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{getClassLabel(paper.class_id)}</Badge>
                            <Badge variant="secondary" className="text-xs">{paper.total_questions} Q</Badge>
                            <Badge variant="secondary" className="text-xs">{paper.total_marks} marks</Badge>
                            {mcqCount > 0 && <Badge variant="outline" className="text-xs">{mcqCount} MCQ</Badge>}
                            {descCount > 0 && <Badge variant="outline" className="text-xs">{descCount} Desc</Badge>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeletePaper(paper.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Create Paper Dialog */}
          <Dialog open={createPaperOpen} onOpenChange={setCreatePaperOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Question Paper</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePaper} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Exam *</Label>
                  <Select value={paperForm.exam_id} onValueChange={v => {
                    const exam = exams.find(e => e.id === v);
                    setPaperForm({ exam_id: v, class_id: exam?.class_id || '' });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Choose a weekly exam" /></SelectTrigger>
                    <SelectContent>
                      {availableExams.length === 0 ? (
                        <SelectItem value="_none" disabled>All exams have papers</SelectItem>
                      ) : (
                        availableExams.map(e => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.exam_title} ({e.classes ? `${e.classes.name}-${e.classes.section}` : '—'})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={!paperForm.exam_id}>Create Paper</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </DashboardLayout>
  );
}
