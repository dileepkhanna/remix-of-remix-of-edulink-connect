import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { adminSidebarItems } from '@/config/adminSidebar';
import { BackButton } from '@/components/ui/back-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Plus, BookOpen, FlaskConical, Search, MoreVertical, Pencil, Trash2, Calendar, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

interface SyllabusItem {
  id: string;
  class_id: string;
  subject_id: string;
  syllabus_type: string;
  exam_type: string | null;
  chapter_name: string;
  topic_name: string;
  week_number: number | null;
  schedule_date: string | null;
  schedule_time: string | null;
  classes?: { name: string; section: string } | null;
  subjects?: { name: string } | null;
}

interface ClassOption {
  id: string;
  name: string;
  section: string;
  academic_type: string;
}

interface SubjectOption {
  id: string;
  name: string;
  category: string;
  exam_type: string | null;
}

interface TeacherOption {
  id: string;
  user_id: string;
  fullName?: string;
}

interface TeacherMapping {
  id: string;
  teacher_id: string;
  syllabus_id: string;
  role_type: string;
  teacherName?: string;
}

const EXAM_TYPES = ['JEE', 'NEET', 'BITSAT'];

export default function SyllabusManagement() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [syllabus, setSyllabus] = useState<SyllabusItem[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [teacherMappings, setTeacherMappings] = useState<TeacherMapping[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [selectedSyllabus, setSelectedSyllabus] = useState<SyllabusItem | null>(null);
  const [formData, setFormData] = useState({
    class_id: '',
    subject_id: '',
    exam_type: '',
    chapter_name: '',
    topic_name: '',
    week_number: '',
    schedule_date: '',
    schedule_time: '',
  });
  const [teacherForm, setTeacherForm] = useState({
    teacher_id: '',
    role_type: 'lead',
  });

  useEffect(() => {
    if (!loading && (!user || userRole !== 'admin')) navigate('/auth');
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoadingData(true);
    const [syllabusRes, classesRes, subjectsRes, teachersRes, mappingsRes, profilesRes] = await Promise.all([
      supabase.from('syllabus').select('*, classes(name, section), subjects(name)').order('chapter_name'),
      supabase.from('classes').select('id, name, section, academic_type').order('name'),
      supabase.from('subjects').select('id, name, category, exam_type').order('name'),
      supabase.from('teachers').select('id, user_id'),
      supabase.from('teacher_syllabus_map').select('*'),
      supabase.from('profiles').select('user_id, full_name'),
    ]);
    if (syllabusRes.data) setSyllabus(syllabusRes.data as SyllabusItem[]);
    if (classesRes.data) setClasses(classesRes.data as ClassOption[]);
    if (subjectsRes.data) setSubjects(subjectsRes.data as SubjectOption[]);

    const profileMap = new Map<string, string>();
    if (profilesRes.data) profilesRes.data.forEach(p => profileMap.set(p.user_id, p.full_name));

    if (teachersRes.data) {
      setTeachers(teachersRes.data.map(t => ({
        ...t,
        fullName: profileMap.get(t.user_id) || 'Unknown',
      })) as TeacherOption[]);
    }
    if (mappingsRes.data && teachersRes.data) {
      const teacherUserMap = new Map<string, string>();
      teachersRes.data.forEach(t => teacherUserMap.set(t.id, t.user_id));
      setTeacherMappings(mappingsRes.data.map(m => ({
        ...m,
        teacherName: profileMap.get(teacherUserMap.get(m.teacher_id) || '') || 'Unknown',
      })) as TeacherMapping[]);
    }
    setLoadingData(false);
  }

  const resetForm = () => setFormData({
    class_id: '', subject_id: '', exam_type: '', chapter_name: '', topic_name: '',
    week_number: '', schedule_date: '', schedule_time: '',
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.class_id || !formData.subject_id || !formData.chapter_name || !formData.topic_name) {
      toast.error('Please fill all required fields');
      return;
    }
    const syllabusType = activeTab === 'general' ? 'general' : 'competitive';
    const { error } = await supabase.from('syllabus').insert({
      class_id: formData.class_id,
      subject_id: formData.subject_id,
      syllabus_type: syllabusType,
      exam_type: syllabusType === 'competitive' ? formData.exam_type || null : null,
      chapter_name: formData.chapter_name,
      topic_name: formData.topic_name,
      week_number: formData.week_number ? parseInt(formData.week_number) : null,
      schedule_date: formData.schedule_date || null,
      schedule_time: formData.schedule_time || null,
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Syllabus topic added');
    setDialogOpen(false);
    resetForm();
    fetchData();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSyllabus) return;
    const syllabusType = activeTab === 'general' ? 'general' : 'competitive';
    const { error } = await supabase.from('syllabus').update({
      class_id: formData.class_id,
      subject_id: formData.subject_id,
      syllabus_type: syllabusType,
      exam_type: syllabusType === 'competitive' ? formData.exam_type || null : null,
      chapter_name: formData.chapter_name,
      topic_name: formData.topic_name,
      week_number: formData.week_number ? parseInt(formData.week_number) : null,
      schedule_date: formData.schedule_date || null,
      schedule_time: formData.schedule_time || null,
    }).eq('id', selectedSyllabus.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Syllabus updated');
    setEditDialogOpen(false);
    setSelectedSyllabus(null);
    resetForm();
    fetchData();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('syllabus').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Syllabus topic deleted');
    fetchData();
  }

  function openEdit(item: SyllabusItem) {
    setSelectedSyllabus(item);
    setFormData({
      class_id: item.class_id,
      subject_id: item.subject_id,
      exam_type: item.exam_type || '',
      chapter_name: item.chapter_name,
      topic_name: item.topic_name,
      week_number: item.week_number?.toString() || '',
      schedule_date: item.schedule_date || '',
      schedule_time: item.schedule_time || '',
    });
    setEditDialogOpen(true);
  }

  function openTeacherMapping(item: SyllabusItem) {
    setSelectedSyllabus(item);
    setTeacherForm({ teacher_id: '', role_type: 'lead' });
    setTeacherDialogOpen(true);
  }

  async function handleAssignTeacher(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSyllabus || !teacherForm.teacher_id) {
      toast.error('Select a teacher');
      return;
    }
    const { error } = await supabase.from('teacher_syllabus_map').insert({
      teacher_id: teacherForm.teacher_id,
      syllabus_id: selectedSyllabus.id,
      role_type: teacherForm.role_type,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Teacher assigned');
    fetchData();
    setTeacherForm({ teacher_id: '', role_type: 'lead' });
  }

  async function handleRemoveTeacher(mappingId: string) {
    const { error } = await supabase.from('teacher_syllabus_map').delete().eq('id', mappingId);
    if (error) { toast.error(error.message); return; }
    toast.success('Teacher removed');
    fetchData();
  }

  const filteredSyllabus = useMemo(() => {
    return syllabus.filter(s => {
      if (s.syllabus_type !== (activeTab === 'general' ? 'general' : 'competitive')) return false;
      if (filterClass !== 'all' && s.class_id !== filterClass) return false;
      if (filterSubject !== 'all' && s.subject_id !== filterSubject) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return s.chapter_name.toLowerCase().includes(q) ||
               s.topic_name.toLowerCase().includes(q) ||
               s.subjects?.name?.toLowerCase().includes(q) || false;
      }
      return true;
    });
  }, [syllabus, activeTab, filterClass, filterSubject, searchQuery]);

  const filteredSubjects = useMemo(() => {
    if (activeTab === 'general') return subjects.filter(s => s.category === 'general' || !s.category);
    return subjects.filter(s => s.category === 'competitive');
  }, [subjects, activeTab]);

  // Group syllabus by chapter
  const groupedSyllabus = useMemo(() => {
    const groups: Record<string, SyllabusItem[]> = {};
    filteredSyllabus.forEach(s => {
      const key = `${s.classes?.name || ''}-${s.classes?.section || ''} | ${s.subjects?.name || ''} | ${s.chapter_name}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [filteredSyllabus]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const SyllabusForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Class *</Label>
          <Select value={formData.class_id} onValueChange={v => setFormData(f => ({ ...f, class_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Subject *</Label>
          <Select value={formData.subject_id} onValueChange={v => setFormData(f => ({ ...f, subject_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {(activeTab === 'general' ? subjects : filteredSubjects).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeTab === 'competitive' && (
        <div className="space-y-2">
          <Label>Exam Type</Label>
          <Select value={formData.exam_type} onValueChange={v => setFormData(f => ({ ...f, exam_type: v }))}>
            <SelectTrigger><SelectValue placeholder="Select exam type" /></SelectTrigger>
            <SelectContent>
              {EXAM_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Chapter Name *</Label>
          <Input value={formData.chapter_name} onChange={e => setFormData(f => ({ ...f, chapter_name: e.target.value }))} placeholder="e.g. Kinematics" />
        </div>
        <div className="space-y-2">
          <Label>Topic Name *</Label>
          <Input value={formData.topic_name} onChange={e => setFormData(f => ({ ...f, topic_name: e.target.value }))} placeholder="e.g. Projectile Motion" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Week Number</Label>
          <Input type="number" value={formData.week_number} onChange={e => setFormData(f => ({ ...f, week_number: e.target.value }))} placeholder="1" />
        </div>
        <div className="space-y-2">
          <Label>Schedule Date</Label>
          <Input type="date" value={formData.schedule_date} onChange={e => setFormData(f => ({ ...f, schedule_date: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Schedule Time</Label>
          <Input type="time" value={formData.schedule_time} onChange={e => setFormData(f => ({ ...f, schedule_time: e.target.value }))} />
        </div>
      </div>

      <Button type="submit" className="w-full">{submitLabel}</Button>
    </form>
  );

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} roleColor="admin">
      {loadingData ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <BackButton to="/admin" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold">Syllabus Management</h1>
              <p className="text-muted-foreground">Manage general and competitive syllabus</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Topic</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add {activeTab === 'general' ? 'General' : 'Competitive'} Syllabus Topic</DialogTitle>
                </DialogHeader>
                <SyllabusForm onSubmit={handleCreate} submitLabel="Add Topic" />
              </DialogContent>
            </Dialog>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general" className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />General
              </TabsTrigger>
              <TabsTrigger value="competitive" className="flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4" />Competitive
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search chapters, topics..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="All Subjects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="general" className="mt-4">
              <SyllabusList
                groupedSyllabus={groupedSyllabus}
                teacherMappings={teacherMappings}
                onEdit={openEdit}
                onDelete={handleDelete}
                onAssignTeacher={openTeacherMapping}
              />
            </TabsContent>
            <TabsContent value="competitive" className="mt-4">
              <SyllabusList
                groupedSyllabus={groupedSyllabus}
                teacherMappings={teacherMappings}
                onEdit={openEdit}
                onDelete={handleDelete}
                onAssignTeacher={openTeacherMapping}
                showExamType
              />
            </TabsContent>
          </Tabs>

          {/* Edit Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={v => { setEditDialogOpen(v); if (!v) { setSelectedSyllabus(null); resetForm(); } }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Syllabus Topic</DialogTitle>
              </DialogHeader>
              <SyllabusForm onSubmit={handleEdit} submitLabel="Save Changes" />
            </DialogContent>
          </Dialog>

          {/* Teacher Mapping Dialog */}
          <Dialog open={teacherDialogOpen} onOpenChange={v => { setTeacherDialogOpen(v); if (!v) setSelectedSyllabus(null); }}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assign Teachers</DialogTitle>
              </DialogHeader>
              {selectedSyllabus && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {selectedSyllabus.chapter_name} → {selectedSyllabus.topic_name}
                  </div>
                  {/* Existing mappings */}
                  <div className="space-y-2">
                    {teacherMappings
                      .filter(m => m.syllabus_id === selectedSyllabus.id)
                      .map(m => (
                        <div key={m.id} className="flex items-center justify-between p-2 rounded-md border">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{m.teacherName || 'Unknown'}</span>
                            <Badge variant="outline" className="text-xs capitalize">{m.role_type}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveTeacher(m.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                  </div>
                  <form onSubmit={handleAssignTeacher} className="space-y-3">
                    <div className="space-y-2">
                      <Label>Teacher</Label>
                      <Select value={teacherForm.teacher_id} onValueChange={v => setTeacherForm(f => ({ ...f, teacher_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                        <SelectContent>
                          {teachers.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.fullName || 'Unknown'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={teacherForm.role_type} onValueChange={v => setTeacherForm(f => ({ ...f, role_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead Faculty</SelectItem>
                          <SelectItem value="practice">Practice Faculty</SelectItem>
                          <SelectItem value="doubt">Doubt Faculty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Assign Teacher</Button>
                  </form>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </DashboardLayout>
  );
}

function SyllabusList({
  groupedSyllabus,
  teacherMappings,
  onEdit,
  onDelete,
  onAssignTeacher,
  showExamType = false,
}: {
  groupedSyllabus: Record<string, SyllabusItem[]>;
  teacherMappings: TeacherMapping[];
  onEdit: (item: SyllabusItem) => void;
  onDelete: (id: string) => void;
  onAssignTeacher: (item: SyllabusItem) => void;
  showExamType?: boolean;
}) {
  const entries = Object.entries(groupedSyllabus);

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No syllabus topics found. Click "Add Topic" to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map(([key, topics]) => {
        const parts = key.split(' | ');
        return (
          <Card key={key}>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <CardTitle className="text-base">{parts[2]}</CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">{parts[0]}</Badge>
                  <Badge variant="secondary" className="text-xs">{parts[1]}</Badge>
                  {showExamType && topics[0]?.exam_type && (
                    <Badge variant="outline" className="text-xs">{topics[0].exam_type}</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {topics.map(topic => {
                  const assignedTeachers = teacherMappings.filter(m => m.syllabus_id === topic.id);
                  return (
                    <div key={topic.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{topic.topic_name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {topic.week_number && (
                              <span className="flex items-center gap-1">Week {topic.week_number}</span>
                            )}
                            {topic.schedule_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(topic.schedule_date).toLocaleDateString()}
                              </span>
                            )}
                            {topic.schedule_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {topic.schedule_time}
                              </span>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(topic)}>
                              <Pencil className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAssignTeacher(topic)}>
                              <Users className="h-4 w-4 mr-2" />Assign Teachers
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(topic.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {assignedTeachers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {assignedTeachers.map(m => (
                            <Badge key={m.id} variant="outline" className="text-xs">
                              {m.teacherName || 'Unknown'} ({m.role_type})
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

