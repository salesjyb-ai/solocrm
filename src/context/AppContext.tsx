import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Lead, LeadStatus, Project, Task, Issue, IssueStatus, Activity, ActivityType, BossItem, Subtask, ProjectMember } from '../types';
import { supabase } from '../supabase';
import type { Session } from '@supabase/supabase-js';

interface AppContextType {
  leads: Lead[];
  projects: Project[];
  tasks: Task[];
  activities: Activity[];
  session: Session | null;
  bossItems: BossItem[];
  addBossItem: (item: Omit<BossItem, 'id' | 'createdAt'>) => Promise<void>;
  updateBossItem: (id: string, fields: Partial<BossItem>) => Promise<void>;
  deleteBossItem: (id: string) => Promise<void>;
  loading: boolean;
  theme: 'light' | 'dark';
  signOut: () => Promise<void>;
  toggleTheme: () => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLead: (id: string, fields: Partial<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  updateLeadStatus: (id: string, status: LeadStatus, prevStatus?: LeadStatus) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addProject: (name: string, color: string) => Promise<void>;
  addIssue: (projectId: string, issue: Omit<Issue, 'id' | 'projectId' | 'createdAt'>) => Promise<void>;
  updateIssueStatus: (projectId: string, issueId: string, status: IssueStatus) => Promise<void>;
  updateIssue: (issueId: string, fields: { title?: string; status?: IssueStatus; priority?: Issue['priority']; dueDate?: string; assignee?: string; memo?: string }) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  members: ProjectMember[];
  addMember: (member: Omit<ProjectMember, 'id' | 'createdAt'>) => Promise<void>;
  updateMember: (id: string, fields: Partial<ProjectMember>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  deleteIssue: (projectId: string, issueId: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskSubtasks: (id: string, subtasks: Subtask[]) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  addActivity: (leadId: string, type: ActivityType, content: string) => Promise<void>;
  getLeadActivities: (leadId: string) => Activity[];
}

const AppContext = createContext<AppContextType | null>(null);

function rowToLead(r: Record<string, unknown>): Lead {
  return {
    id: r.id as string, name: r.name as string, company: r.company as string,
    contact: r.contact as string | undefined, phone: r.phone as string | undefined, value: r.value as number,
    status: r.status as LeadStatus, nextAction: r.next_action as string | undefined,
    nextActionDate: r.next_action_date as string | undefined,
    notes: r.notes as string | undefined,
    createdAt: (r.created_at as string).split('T')[0],
    updatedAt: (r.updated_at as string).split('T')[0],
  };
}

function rowToIssue(r: Record<string, unknown>): Issue {
  return {
    id: r.id as string, projectId: r.project_id as string, title: r.title as string,
    status: r.status as IssueStatus, priority: r.priority as Issue['priority'],
    dueDate: r.due_date as string | undefined,
    assignee: r.assignee as string | undefined,
    memo: r.memo as string | undefined,
    createdAt: (r.created_at as string).split('T')[0],
  };
}

function rowToProject(r: Record<string, unknown>, issues: Issue[]): Project {
  return {
    id: r.id as string, name: r.name as string, color: r.color as string,
    status: r.status as Project['status'],
    issues: issues.filter(i => i.projectId === (r.id as string)),
    createdAt: (r.created_at as string).split('T')[0],
  };
}

function rowToTask(r: Record<string, unknown>): Task {
  return {
    id: r.id as string, title: r.title as string, done: r.done as boolean,
    dueDate: r.due_date as string,
    linkedTo: r.linked_type ? { type: r.linked_type as 'lead' | 'project', id: r.linked_id as string, name: r.linked_name as string } : undefined,
    subtasks: (r.subtasks as Subtask[]) || [],
  };
}

function rowToActivity(r: Record<string, unknown>): Activity {
  return {
    id: r.id as string, leadId: r.lead_id as string,
    type: r.type as ActivityType, content: r.content as string,
    createdAt: r.created_at as string,
  };
}

const statusLabel: Record<LeadStatus, string> = { new: '신규', contacted: '연락완료', proposal: '제안중', won: '수주', lost: '실패' };

export function AppProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [bossItems, setBossItems] = useState<BossItem[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const addMember = async (member: Omit<ProjectMember, 'id' | 'createdAt'>) => {
    await supabase.from('crm_project_members').insert({
      project_id: member.projectId, name: member.name, type: member.type, role: member.role,
      company: member.company, contract_type: member.contractType, monthly_rate: member.monthlyRate,
      start_date: member.startDate, end_date: member.endDate, utilization: member.utilization, notes: member.notes,
    });
  };
  const updateMember = async (id: string, fields: Partial<ProjectMember>) => {
    const db: Record<string, unknown> = {};
    if (fields.name !== undefined) db.name = fields.name;
    if (fields.type !== undefined) db.type = fields.type;
    if (fields.role !== undefined) db.role = fields.role;
    if (fields.company !== undefined) db.company = fields.company;
    if (fields.contractType !== undefined) db.contract_type = fields.contractType;
    if (fields.monthlyRate !== undefined) db.monthly_rate = fields.monthlyRate;
    if (fields.startDate !== undefined) db.start_date = fields.startDate;
    if (fields.endDate !== undefined) db.end_date = fields.endDate;
    if (fields.utilization !== undefined) db.utilization = fields.utilization;
    if (fields.notes !== undefined) db.notes = fields.notes;
    await supabase.from('crm_project_members').update(db).eq('id', id);
  };
  const deleteMember = async (id: string) => {
    await supabase.from('crm_project_members').delete().eq('id', id);
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const addBossItem = async (item: Omit<BossItem, 'id' | 'createdAt'>) => {
    await supabase.from('crm_boss_items').insert({ type: item.type, title: item.title, content: item.content, priority: item.priority, due_date: item.dueDate, done: item.done, project_id: item.projectId }).select().single();
  };
  const updateBossItem = async (id: string, fields: Partial<BossItem>) => {
    const dbFields: Record<string, unknown> = {};
    if (fields.title !== undefined) dbFields.title = fields.title;
    if (fields.content !== undefined) dbFields.content = fields.content;
    if (fields.priority !== undefined) dbFields.priority = fields.priority;
    if (fields.dueDate !== undefined) dbFields.due_date = fields.dueDate;
    if (fields.done !== undefined) dbFields.done = fields.done;
    if (fields.projectId !== undefined) dbFields.project_id = fields.projectId;
    await supabase.from('crm_boss_items').update(dbFields).eq('id', id);
  };
  const deleteBossItem = async (id: string) => {
    await supabase.from('crm_boss_items').delete().eq('id', id);
    setBossItems(prev => prev.filter(b => b.id !== id));
  };
  const signOut = async () => { await supabase.auth.signOut(); setLeads([]); setProjects([]); setTasks([]); setActivities([]); setBossItems([]); setMembers([]); };

  // auth 세션 감지
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    async function fetchAll() {
      setLoading(true);
      const [leadsRes, projectsRes, issuesRes, tasksRes, activitiesRes, bossRes, membersRes] = await Promise.all([
        supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_projects').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_issues').select('*').order('created_at', { ascending: true }),
        supabase.from('crm_tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('crm_activities').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_boss_items').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_project_members').select('*').order('created_at', { ascending: true }),
      ]);
      const issues = (issuesRes.data || []).map(r => rowToIssue(r as Record<string, unknown>));
      setLeads((leadsRes.data || []).map(r => rowToLead(r as Record<string, unknown>)));
      setProjects((projectsRes.data || []).map(r => rowToProject(r as Record<string, unknown>, issues)));
      setTasks((tasksRes.data || []).map(r => rowToTask(r as Record<string, unknown>)));
      setActivities((activitiesRes.data || []).map(r => rowToActivity(r as Record<string, unknown>)));
      setMembers((membersRes.data || []).map(r => ({
        id: r.id as string, projectId: r.project_id as string, name: r.name as string,
        type: r.type as ProjectMember['type'], role: r.role as string | undefined,
        company: r.company as string | undefined, contractType: r.contract_type as string | undefined,
        monthlyRate: r.monthly_rate as number | undefined, startDate: r.start_date as string | undefined,
        endDate: r.end_date as string | undefined, utilization: r.utilization as number,
        notes: r.notes as string | undefined, createdAt: r.created_at as string,
      })));
      setBossItems((bossRes.data || []).map(r => ({ id: r.id as string, type: r.type as BossItem['type'], title: r.title as string, content: r.content as string | undefined, priority: r.priority as BossItem['priority'], dueDate: r.due_date as string | undefined, done: r.done as boolean, projectId: r.project_id as string | undefined, createdAt: r.created_at as string })));
      setLoading(false);
    }
    fetchAll();
  }, [session]);

  // ── Realtime 구독 ──────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('solocrm-realtime')

      // leads
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, payload => {
        if (payload.eventType === 'INSERT') setLeads(prev => [rowToLead(payload.new as Record<string, unknown>), ...prev]);
        if (payload.eventType === 'UPDATE') setLeads(prev => prev.map(l => l.id === payload.new.id ? rowToLead(payload.new as Record<string, unknown>) : l));
      })

      // projects
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_projects' }, payload => {
        if (payload.eventType === 'INSERT') setProjects(prev => [rowToProject(payload.new as Record<string, unknown>, []), ...prev]);
        if (payload.eventType === 'UPDATE') setProjects(prev => prev.map(p => p.id === payload.new.id ? { ...p, name: payload.new.name as string, color: payload.new.color as string, status: payload.new.status as Project['status'] } : p));
      })

      // issues
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_issues' }, payload => {
        const issue = rowToIssue(payload.new as Record<string, unknown>);
        if (payload.eventType === 'INSERT') setProjects(prev => prev.map(p => p.id === issue.projectId ? { ...p, issues: [...p.issues, issue] } : p));
        if (payload.eventType === 'UPDATE') setProjects(prev => prev.map(p => p.id === issue.projectId ? { ...p, issues: p.issues.map(i => i.id === issue.id ? issue : i) } : p));
      })

      // tasks
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks' }, payload => {
        if (payload.eventType === 'INSERT') setTasks(prev => [...prev, rowToTask(payload.new as Record<string, unknown>)]);
        if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? rowToTask(payload.new as Record<string, unknown>) : t));
      })

      // activities
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_activities' }, payload => {
        if (payload.eventType === 'INSERT') setActivities(prev => [rowToActivity(payload.new as Record<string, unknown>), ...prev]);
      })

      // boss items
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_boss_items' }, payload => {
        const row = payload.new as Record<string, unknown>;
        const toBoss = (r: Record<string, unknown>) => ({ id: r.id as string, type: r.type as BossItem['type'], title: r.title as string, content: r.content as string | undefined, priority: r.priority as BossItem['priority'], dueDate: r.due_date as string | undefined, done: r.done as boolean, projectId: r.project_id as string | undefined, createdAt: r.created_at as string });
        if (payload.eventType === 'INSERT') setBossItems(prev => [toBoss(row), ...prev]);
        if (payload.eventType === 'UPDATE') setBossItems(prev => prev.map(b => b.id === row.id ? toBoss(row) : b));
      })

      // project members
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_project_members' }, payload => {
        const row = payload.new as Record<string, unknown>;
        const toMember = (r: Record<string, unknown>): ProjectMember => ({ id: r.id as string, projectId: r.project_id as string, name: r.name as string, type: r.type as ProjectMember['type'], role: r.role as string | undefined, company: r.company as string | undefined, contractType: r.contract_type as string | undefined, monthlyRate: r.monthly_rate as number | undefined, startDate: r.start_date as string | undefined, endDate: r.end_date as string | undefined, utilization: r.utilization as number, notes: r.notes as string | undefined, createdAt: r.created_at as string });
        if (payload.eventType === 'INSERT') setMembers(prev => [...prev, toMember(row)]);
        if (payload.eventType === 'UPDATE') setMembers(prev => prev.map(m => m.id === row.id ? toMember(row) : m));
      })

      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);
  // ──────────────────────────────────────────────────────────

  // ── 30초 주기 전체 동기화 (추가/수정/삭제 모두 반영) ─────────────
  useEffect(() => {
    if (!session) return;
    const fullSync = async () => {
      const [leadsRes, projectsRes, issuesRes, tasksRes, activitiesRes, bossRes, membersRes] = await Promise.all([
        supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_projects').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_issues').select('*').order('created_at', { ascending: true }),
        supabase.from('crm_tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('crm_activities').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_boss_items').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_project_members').select('*').order('created_at', { ascending: true }),
      ]);
      const issues = (issuesRes.data || []).map(r => rowToIssue(r as Record<string, unknown>));
      setLeads((leadsRes.data || []).map(r => rowToLead(r as Record<string, unknown>)));
      setProjects((projectsRes.data || []).map(r => rowToProject(r as Record<string, unknown>, issues)));
      setTasks((tasksRes.data || []).map(r => rowToTask(r as Record<string, unknown>)));
      setActivities((activitiesRes.data || []).map(r => rowToActivity(r as Record<string, unknown>)));
      setMembers((membersRes.data || []).map(r => ({
        id: r.id as string, projectId: r.project_id as string, name: r.name as string,
        type: r.type as ProjectMember['type'], role: r.role as string | undefined,
        company: r.company as string | undefined, contractType: r.contract_type as string | undefined,
        monthlyRate: r.monthly_rate as number | undefined, startDate: r.start_date as string | undefined,
        endDate: r.end_date as string | undefined, utilization: r.utilization as number,
        notes: r.notes as string | undefined, createdAt: r.created_at as string,
      })));
      setBossItems((bossRes.data || []).map(r => ({ id: r.id as string, type: r.type as BossItem['type'], title: r.title as string, content: r.content as string | undefined, priority: r.priority as BossItem['priority'], dueDate: r.due_date as string | undefined, done: r.done as boolean, projectId: r.project_id as string | undefined, createdAt: r.created_at as string })));
    };
    const timer = setInterval(fullSync, 30000);
    return () => clearInterval(timer);
  }, [session]);
  // ──────────────────────────────────────────────────────────────

  const addLead = async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    await supabase.from('crm_leads').insert({
      name: lead.name, company: lead.company, contact: lead.contact, phone: lead.phone,
      value: lead.value, status: lead.status, notes: lead.notes,
      next_action: lead.nextAction, next_action_date: lead.nextActionDate || null,
    }).select().single();
  };

  const updateLead = async (id: string, fields: Partial<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const dbFields: Record<string, unknown> = {};
    if (fields.name !== undefined) dbFields.name = fields.name;
    if (fields.company !== undefined) dbFields.company = fields.company;
    if (fields.contact !== undefined) dbFields.contact = fields.contact;
    if (fields.phone !== undefined) dbFields.phone = fields.phone;
    if (fields.value !== undefined) dbFields.value = fields.value;
    if (fields.status !== undefined) dbFields.status = fields.status;
    if (fields.nextAction !== undefined) dbFields.next_action = fields.nextAction;
    if (fields.nextActionDate !== undefined) dbFields.next_action_date = fields.nextActionDate || null;
    if (fields.notes !== undefined) dbFields.notes = fields.notes;
    await supabase.from('crm_leads').update(dbFields).eq('id', id);
  };

  const updateLeadStatus = async (id: string, status: LeadStatus, prevStatus?: LeadStatus) => {
    const { error } = await supabase.from('crm_leads').update({ status }).eq('id', id);
    if (!error) {
      if (prevStatus && prevStatus !== status) {
        const content = `상태 변경: ${statusLabel[prevStatus]} → ${statusLabel[status]}`;
        await supabase.from('crm_activities').insert({ lead_id: id, type: 'status_change', content });
      }
    }
  };

  const deleteLead = async (id: string) => {
    await supabase.from('crm_leads').delete().eq('id', id);

  };

  const addProject = async (name: string, color: string) => {
    await supabase.from('crm_projects').insert({ name, color }).select().single();
  };

  const addIssue = async (projectId: string, issue: Omit<Issue, 'id' | 'projectId' | 'createdAt'>) => {
    await supabase.from('crm_issues').insert({
      project_id: projectId, title: issue.title, status: issue.status,
      priority: issue.priority, due_date: issue.dueDate || null,
    }).select().single();

  };

  const updateIssueStatus = async (_projectId: string, issueId: string, status: IssueStatus) => {
    await supabase.from('crm_issues').update({ status }).eq('id', issueId);
  };

  const updateIssue = async (issueId: string, fields: { title?: string; status?: IssueStatus; priority?: Issue['priority']; dueDate?: string; assignee?: string; memo?: string }) => {
    const db: Record<string, unknown> = {};
    if (fields.title !== undefined) db.title = fields.title;
    if (fields.status !== undefined) db.status = fields.status;
    if (fields.priority !== undefined) db.priority = fields.priority;
    if (fields.dueDate !== undefined) db.due_date = fields.dueDate || null;
    if (fields.assignee !== undefined) db.assignee = fields.assignee || null;
    if (fields.memo !== undefined) db.memo = fields.memo || null;
    await supabase.from('crm_issues').update(db).eq('id', issueId);
  };

  const deleteProject = async (projectId: string) => {
    await supabase.from('crm_projects').delete().eq('id', projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const deleteIssue = async (_projectId: string, issueId: string) => {
    await supabase.from('crm_issues').delete().eq('id', issueId);
    setProjects(prev => prev.map(p => ({ ...p, issues: p.issues.filter(i => i.id !== issueId) })));
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await supabase.from('crm_tasks').update({ done: !task.done }).eq('id', id);
  };

  const updateTaskSubtasks = async (id: string, subtasks: Subtask[]) => {
    await supabase.from('crm_tasks').update({ subtasks }).eq('id', id);
  };

  const deleteTask = async (id: string) => {
    await supabase.from('crm_tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    await supabase.from('crm_tasks').insert({
      title: task.title, done: task.done, due_date: task.dueDate,
      linked_type: task.linkedTo?.type || null, linked_id: task.linkedTo?.id || null, linked_name: task.linkedTo?.name || null,
    }).select().single();
  };

  const addActivity = async (leadId: string, type: ActivityType, content: string) => {
    await supabase.from('crm_activities').insert({ lead_id: leadId, type, content }).select().single();
  };

  const getLeadActivities = (leadId: string) => activities.filter(a => a.leadId === leadId);

  return (
    <AppContext.Provider value={{ leads, projects, tasks, activities, bossItems, addBossItem, updateBossItem, deleteBossItem, session, loading, theme, toggleTheme, signOut, addLead, updateLead, updateLeadStatus, deleteLead, addProject, deleteProject, updateIssue, members, addMember, updateMember, deleteMember, addIssue, updateIssueStatus, deleteIssue, toggleTask, deleteTask, addTask, updateTaskSubtasks, addActivity, getLeadActivities }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
