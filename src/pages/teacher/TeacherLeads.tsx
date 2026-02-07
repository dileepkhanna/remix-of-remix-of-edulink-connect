import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLeadPermissions } from '@/hooks/useLeadPermissions';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { getTeacherSidebarItems } from '@/config/teacherSidebar';
import LeadEntryForm from '@/components/leads/LeadEntryForm';
import LeadCallLogDialog from '@/components/leads/LeadCallLogDialog';
import LeadExcelImport from '@/components/leads/LeadExcelImport';
import { LeadStatusBadge, LEAD_STATUSES } from '@/components/leads/LeadStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Search, Phone, Edit, Eye, FileSpreadsheet,
  Calendar, MessageSquare, UserPlus, Filter,
} from 'lucide-react';
import { format } from 'date-fns';

export default function TeacherLeads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasAccess, loading: permLoading } = useLeadPermissions();
  const sidebarItems = getTeacherSidebarItems(hasAccess);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<any | null>(null);
  const [viewingLead, setViewingLead] = useState<any | null>(null);
  const [callLogLead, setCallLogLead] = useState<any | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [statusUpdateLead, setStatusUpdateLead] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  // Redirect if no access
  useEffect(() => {
    if (!permLoading && !hasAccess) {
      navigate('/teacher');
    }
  }, [permLoading, hasAccess, navigate]);
  const fetchLeads = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setLeads(data);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [user]);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery ||
      lead.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.primary_mobile?.includes(searchQuery) ||
      lead.father_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async () => {
    if (!statusUpdateLead || !newStatus || !user) return;
    try {
      // Insert status history
      await supabase.from('lead_status_history').insert({
        lead_id: statusUpdateLead.id,
        old_status: statusUpdateLead.status,
        new_status: newStatus,
        changed_by: user.id,
        remarks: statusRemarks || null,
      } as any);

      // Update lead
      await supabase
        .from('leads')
        .update({ status: newStatus, remarks: statusRemarks || statusUpdateLead.remarks } as any)
        .eq('id', statusUpdateLead.id);

      toast({ title: 'Status updated successfully' });
      setStatusUpdateLead(null);
      setNewStatus('');
      setStatusRemarks('');
      fetchLeads();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const fetchLeadDetails = async (lead: any) => {
    setViewingLead(lead);
    // Fetch call logs
    const { data: logs } = await supabase
      .from('lead_call_logs')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    setCallLogs(logs || []);

    // Fetch status history
    const { data: history } = await supabase
      .from('lead_status_history')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    setStatusHistory(history || []);
  };

  if (permLoading) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} roleColor="teacher">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} roleColor="teacher">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Leads Management</h1>
            <p className="text-muted-foreground">Manage admission leads and follow-ups</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Import Excel
            </Button>
            <Button onClick={() => { setEditingLead(null); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> New Lead
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, parent..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {LEAD_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class Applying</TableHead>
                    <TableHead>Primary Mobile</TableHead>
                    <TableHead>Father's Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Follow-up Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : filteredLeads.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
                  ) : (
                    filteredLeads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.student_name}</TableCell>
                        <TableCell>{lead.class_applying_for || '—'}</TableCell>
                        <TableCell>
                          <a href={`tel:${lead.primary_mobile}`} className="flex items-center gap-1 text-primary hover:underline">
                            <Phone className="h-3 w-3" /> {lead.primary_mobile}
                          </a>
                        </TableCell>
                        <TableCell>{lead.father_name || '—'}</TableCell>
                        <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                        <TableCell>
                          {lead.next_followup_date ? format(new Date(lead.next_followup_date), 'dd MMM yyyy') : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => fetchLeadDetails(lead)} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingLead(lead); setShowForm(true); }} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setCallLogLead(lead)} title="Log Call">
                              <Phone className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => { setStatusUpdateLead(lead); setNewStatus(lead.status); }} title="Update Status">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Lead Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Edit Lead' : 'Create New Lead'}</DialogTitle>
            </DialogHeader>
            <LeadEntryForm
              initialData={editingLead}
              isEdit={!!editingLead}
              onSuccess={() => { setShowForm(false); fetchLeads(); }}
            />
          </DialogContent>
        </Dialog>

        {/* Call Log Dialog */}
        {callLogLead && (
          <LeadCallLogDialog
            open={!!callLogLead}
            onOpenChange={() => setCallLogLead(null)}
            leadId={callLogLead.id}
            phoneNumber={callLogLead.primary_mobile}
            studentName={callLogLead.student_name}
            onSuccess={fetchLeads}
          />
        )}

        {/* Excel Import */}
        <LeadExcelImport
          open={showImport}
          onOpenChange={setShowImport}
          onSuccess={fetchLeads}
        />

        {/* Status Update Dialog */}
        <Dialog open={!!statusUpdateLead} onOpenChange={() => setStatusUpdateLead(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Lead Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Lead: <strong>{statusUpdateLead?.student_name}</strong></p>
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Next Follow-up Date</Label>
                <Input
                  type="date"
                  onChange={async (e) => {
                    if (statusUpdateLead) {
                      await supabase
                        .from('leads')
                        .update({ next_followup_date: e.target.value || null } as any)
                        .eq('id', statusUpdateLead.id);
                    }
                  }}
                  defaultValue={statusUpdateLead?.next_followup_date || ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={statusRemarks}
                  onChange={e => setStatusRemarks(e.target.value)}
                  placeholder="Add remarks..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStatusUpdateLead(null)}>Cancel</Button>
                <Button onClick={handleStatusUpdate}>Update Status</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Lead Details Dialog */}
        <Dialog open={!!viewingLead} onOpenChange={() => setViewingLead(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lead Details - {viewingLead?.student_name}</DialogTitle>
            </DialogHeader>
            {viewingLead && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Gender:</span> {viewingLead.gender || '—'}</div>
                  <div><span className="text-muted-foreground">DOB:</span> {viewingLead.date_of_birth || '—'}</div>
                  <div><span className="text-muted-foreground">Current Class:</span> {viewingLead.current_class || '—'}</div>
                  <div><span className="text-muted-foreground">Applying For:</span> {viewingLead.class_applying_for || '—'}</div>
                  <div><span className="text-muted-foreground">Father:</span> {viewingLead.father_name || '—'}</div>
                  <div><span className="text-muted-foreground">Mother:</span> {viewingLead.mother_name || '—'}</div>
                  <div>
                    <span className="text-muted-foreground">Primary Mobile:</span>{' '}
                    <a href={`tel:${viewingLead.primary_mobile}`} className="text-primary hover:underline">{viewingLead.primary_mobile}</a>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Alt Mobile:</span>{' '}
                    {viewingLead.alternate_mobile ? (
                      <a href={`tel:${viewingLead.alternate_mobile}`} className="text-primary hover:underline">{viewingLead.alternate_mobile}</a>
                    ) : '—'}
                  </div>
                  <div><span className="text-muted-foreground">Email:</span> {viewingLead.email || '—'}</div>
                  <div><span className="text-muted-foreground">Area:</span> {viewingLead.area_city || '—'}</div>
                  <div><span className="text-muted-foreground">Previous School:</span> {viewingLead.previous_school || '—'}</div>
                  <div><span className="text-muted-foreground">Board:</span> {viewingLead.education_board || '—'}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">Remarks:</span> {viewingLead.remarks || '—'}</div>
                </div>

                {/* Call Logs */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Call History
                  </h3>
                  {callLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No calls logged yet</p>
                  ) : (
                    <div className="space-y-2">
                      {callLogs.map(log => (
                        <div key={log.id} className="text-sm border rounded-lg p-3">
                          <div className="flex justify-between">
                            <span className="font-medium capitalize">{log.call_outcome?.replace('_', ' ')}</span>
                            <span className="text-muted-foreground">{format(new Date(log.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                          </div>
                          {log.notes && <p className="text-muted-foreground mt-1">{log.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status History */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Status History
                  </h3>
                  {statusHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No status changes yet</p>
                  ) : (
                    <div className="space-y-2">
                      {statusHistory.map(hist => (
                        <div key={hist.id} className="text-sm border rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              {hist.old_status && <LeadStatusBadge status={hist.old_status} />}
                              {hist.old_status && <span>→</span>}
                              <LeadStatusBadge status={hist.new_status} />
                            </div>
                            <span className="text-muted-foreground">{format(new Date(hist.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                          </div>
                          {hist.remarks && <p className="text-muted-foreground mt-1">{hist.remarks}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
