import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Lead, LeadStatus, Project, Task, Issue, IssueStatus, Activity, ActivityType, BossItem, Subtask } from '../types';
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
  deleteProject: (projectId: string) => Promise<void>;
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
    dueDate: r.due_date as string | undefined, createdAt: (r.created_at as string).split('T')[0],
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
  const addBossItem = async (item: Omit<BossItem, 'id' | 'createdAt'>) => {
    const { data } = await supabase.from('crm_boss_items').insert({ type: item.type, title: item.title, content: item.content, priority: item.priority, due_date: item.dueDate, done: item.done, project_id: item.projectId }).select().single();
    if (data) setBossItems(prev => [{ id: data.id, type: data.type, title: data.title, content: data.content, priority: data.priority, dueDate: data.due_date, done: data.done, projectId: data.project_id, createdAt: data.created_at }, ...prev]);
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
    setBossItems(prev => prev.map(i => i.id === id ? { ...i, ...fields } : i));
  };
  const deleteBossItem = async (id: string) => {
    await supabase.from('crm_boss_items').delete().eq('id', id);
    setBossItems(prev => prev.filter(i => i.id !== id));
  };
  const signOut = async () => { await supabase.auth.signOut(); setLeads([]); setProjects([]); setTasks([]); setActivities([]); setBossItems([]); };

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
      const [leadsRes, projectsRes, issuesRes, tasksRes, activitiesRes, bossRes] = await Promise.all([
        supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_projects').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_issues').select('*').order('created_at', { ascending: true }),
        supabase.from('crm_tasks').select('*').order('due_date', { ascending: true }),
        supabase.from('crm_activities').select('*').order('created_at', { ascending: false }),
        supabase.from('crm_boss_items').select('*').order('created_at', { ascending: false }),
      ]);
      const issues = (issuesRes.data || []).map(r => rowToIssue(r as Record<string, unknown>));
      setLeads((leadsRes.data || []).map(r => rowToLead(r as Record<string, unknown>)));
      setProjects((projectsRes.data || []).map(r => rowToProject(r as Record<string, unknown>, issues)));
      setTasks((tasksRes.data || []).map(r => rowToTask(r as Record<string, unknown>)));
      setActivities((activitiesRes.data || []).map(r => rowToActivity(r as Record<string, unknown>)));
      setBossItems((bossRes.data || []).map(r => ({ id: r.id as string, type: r.type as BossItem['type'], title: r.title as string, content: r.content as string | undefined, priority: r.priority as BossItem['priority'], dueDate: r.due_date as string | undefined, done: r.done as boolean, projectId: r.project_id as string | undefined, createdAt: r.created_at as string })));
      setLoading(false);
    }
    fetchAll();
  }, [session]);

  const addLead = async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase.from('crm_leads').insert({
      name: lead.name, company: lead.company, contact: lead.contact, phone: lead.phone,
      value: lead.value, status: lead.status, notes: lead.notes,
      next_action: lead.nextAction, next_action_date: lead.nextActionDate || null,
    }).select().single();
    if (!error && data) setLeads(prev => [rowToLead(data as Record<string, unknown>), ...prev]);
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
    const { error } = await supabase.from('crm_leads').update(dbFields).eq('id', id);
    if (!error) setLeads(prev => prev.map(l => l.id === id ? { ...l, ...fields } : l));
  };

  const updateLeadStatus = async (id: string, status: LeadStatus, prevStatus?: LeadStatus) => {
    const { error } = await supabase.from('crm_leads').update({ status }).eq('id', id);
    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      if (prevStatus && prevStatus !== status) {
        const content = `상태 변경: ${statusLabel[prevStatus]} → ${statusLabel[status]}`;
        const { data } = await supabase.from('crm_activities').insert({ lead_id: id, type: 'status_change', content }).select().single();
        if (data) setActivities(prev => [rowToActivity(data as Record<string, unknown>), ...prev]);
      }
    }
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from('crm_leads').delete().eq('id', id);
    if (!error) {
      setLeads(prev => prev.filter(l => l.id !== id));
      setActivities(prev => prev.filter(a => a.leadId !== id));
    }
  };

  const addProject = async (name: string, color: string) => {
    const { data, error } = await supabase.from('crm_projects').insert({ name, color }).select().single();
    if (!error && data) setProjects(prev => [rowToProject(data as Record<string, unknown>, []), ...prev]);
  };

  const addIssue = async (projectId: string, issue: Omit<Issue, 'id' | 'projectId' | 'createdAt'>) => {
    const { data, error } = await supabase.from('crm_issues').insert({
      project_id: projectId, title: issue.title, status: issue.status,
      priority: issue.priority, due_date: issue.dueDate || null,
    }).select().single();
    if (!error && data) {
      const newIssue = rowToIssue(data as Record<string, unknown>);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, issues: [...p.issues, newIssue] } : p));
    }
  };

  const updateIssueStatus = async (projectId: string, issueId: string, status: IssueStatus) => {
    const { error } = await supabase.from('crm_issues').update({ status }).eq('id', issueId);
    if (!error) setProjects(prev => prev.map(p => p.id === projectId
      ? { ...p, issues: p.issues.map(i => i.id === issueId ? { ...i, status } : i) } : p));
  };

  const deleteProject = async (projectId: string) => {
    await supabase.from('crm_projects').delete().eq('id', projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const deleteIssue = async (projectId: string, issueId: string) => {
    const { error } = await supabase.from('crm_issues').delete().eq('id', issueId);
    if (!error) setProjects(prev => prev.map(p => p.id === projectId
      ? { ...p, issues: p.issues.filter(i => i.id !== issueId) } : p));
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const { error } = await supabase.from('crm_tasks').update({ done: !task.done }).eq('id', id);
    if (!error) setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const updateTaskSubtasks = async (id: string, subtasks: Subtask[]) => {
    await supabase.from('crm_tasks').update({ subtasks }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, subtasks } : t));
  };

  const deleteTask = async (id: string) => {
    await supabase.from('crm_tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    const { data, error } = await supabase.from('crm_tasks').insert({
      title: task.title, done: task.done, due_date: task.dueDate,
      linked_type: task.linkedTo?.type || null, linked_id: task.linkedTo?.id || null, linked_name: task.linkedTo?.name || null,
    }).select().single();
    if (!error && data) setTasks(prev => [...prev, rowToTask(data as Record<string, unknown>)]);
  };

  const addActivity = async (leadId: string, type: ActivityType, content: string) => {
    const { data, error } = await supabase.from('crm_activities').insert({ lead_id: leadId, type, content }).select().single();
    if (!error && data) setActivities(prev => [rowToActivity(data as Record<string, unknown>), ...prev]);
  };

  const getLeadActivities = (leadId: string) => activities.filter(a => a.leadId === leadId);

  return (
    <AppContext.Provider value={{ leads, projects, tasks, activities, bossItems, addBossItem, updateBossItem, deleteBossItem, session, loading, theme, toggleTheme, signOut, addLead, updateLead, updateLeadStatus, deleteLead, addProject, deleteProject, addIssue, updateIssueStatus, deleteIssue, toggleTask, deleteTask, addTask, updateTaskSubtasks, addActivity, getLeadActivities }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
