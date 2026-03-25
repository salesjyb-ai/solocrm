import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ToastItem, ToastType } from '../components/Toast';
import type { Lead, LeadStatus, Project, Task, Issue, IssueStatus, Activity, ActivityType, BossItem, Subtask, ProjectMember, Bid, BidStatus, WeeklyActivity, WeeklyActivityType, AiChat, AiChatMode, AiChatRole, Competitor, CompetitorBid, CompetitorBidResult, Contract, ContractStatus } from '../types';
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
  updateTaskDate: (id: string, dueDate: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  addActivity: (leadId: string, type: ActivityType, content: string) => Promise<void>;
  getLeadActivities: (leadId: string) => Activity[];
  toasts: ToastItem[];
  removeToast: (id: string) => void;
  bids: Bid[];
  addBid: (bid: Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBid: (id: string, fields: Partial<Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteBid: (id: string) => Promise<void>;
  weeklyActivities: WeeklyActivity[];
  addWeeklyActivity: (a: Omit<WeeklyActivity, 'id' | 'createdAt'>) => Promise<void>;
  deleteWeeklyActivity: (id: string) => Promise<void>;
  aiChats: AiChat[];
  addAiChat: (mode: AiChatMode, role: AiChatRole, content: string) => Promise<void>;
  clearAiChats: (mode: AiChatMode) => Promise<void>;
  contracts: Contract[];
  addContract: (c: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateContract: (id: string, fields: Partial<Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  competitors: Competitor[];
  addCompetitor: (c: Omit<Competitor, 'id' | 'bids' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCompetitor: (id: string, fields: Partial<Omit<Competitor, 'id' | 'bids' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteCompetitor: (id: string) => Promise<void>;
  addCompetitorBid: (competitorId: string, bid: Omit<CompetitorBid, 'id' | 'competitorId' | 'createdAt'>) => Promise<void>;
  deleteCompetitorBid: (id: string, competitorId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

function rowToLead(r: Record<string, unknown>): Lead {
  return {
    id: r.id as string, name: r.name as string, company: r.company as string,
    dealName: r.deal_name as string | undefined,
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
    dueDate: (r.due_date as string) ?? '',
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

function rowToMember(r: Record<string, unknown>): ProjectMember {
  return {
    id: r.id as string, projectId: r.project_id as string, name: r.name as string,
    type: r.type as ProjectMember['type'], role: r.role as string | undefined,
    company: r.company as string | undefined, contractType: r.contract_type as string | undefined,
    monthlyRate: r.monthly_rate as number | undefined, startDate: r.start_date as string | undefined,
    endDate: r.end_date as string | undefined, utilization: r.utilization as number,
    notes: r.notes as string | undefined, createdAt: r.created_at as string,
  };
}

function rowToBoss(r: Record<string, unknown>): BossItem {
  return {
    id: r.id as string, type: r.type as BossItem['type'], title: r.title as string,
    content: r.content as string | undefined, priority: r.priority as BossItem['priority'],
    dueDate: r.due_date as string | undefined, done: r.done as boolean,
    projectId: r.project_id as string | undefined,
    subItems: (r.sub_items as BossItem['subItems']) || [],
    createdAt: r.created_at as string,
  };
}

function rowToBid(r: Record<string, unknown>): Bid {
  return {
    id: r.id as string, title: r.title as string, agency: r.agency as string,
    deadline: r.deadline as string | undefined, amount: r.amount as number | undefined,
    status: r.status as BidStatus, memo: r.memo as string | undefined,
    bidNo: r.bid_no as string | undefined,
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

function rowToWeeklyActivity(r: Record<string, unknown>): WeeklyActivity {
  return {
    id: r.id as string, activityDate: r.activity_date as string,
    type: r.type as WeeklyActivityType, count: r.count as number,
    note: r.note as string | undefined, createdAt: r.created_at as string,
  };
}

function rowToAiChat(r: Record<string, unknown>): AiChat {
  return {
    id: r.id as string, mode: r.mode as AiChatMode,
    role: r.role as AiChatRole, content: r.content as string,
    createdAt: r.created_at as string,
  };
}

function rowToContract(r: Record<string, unknown>): Contract {
  return {
    id: r.id as string, title: r.title as string, contractNo: r.contract_no as string | undefined,
    client: r.client as string, amount: r.amount as number | undefined,
    contractDate: r.contract_date as string | undefined, status: r.status as ContractStatus,
    leadId: r.lead_id as string | undefined, bidId: r.bid_id as string | undefined,
    projectId: r.project_id as string | undefined,
    midDeliveryDate: r.mid_delivery_date as string | undefined, midDeliveryDone: r.mid_delivery_done as boolean,
    finalDeliveryDate: r.final_delivery_date as string | undefined, finalDeliveryDone: r.final_delivery_done as boolean,
    depositRate: r.deposit_rate as number, depositPaid: r.deposit_paid as boolean, depositDate: r.deposit_date as string | undefined,
    midPaymentRate: r.mid_payment_rate as number, midPaymentPaid: r.mid_payment_paid as boolean, midPaymentDate: r.mid_payment_date as string | undefined,
    balanceRate: r.balance_rate as number, balancePaid: r.balance_paid as boolean, balanceDate: r.balance_date as string | undefined,
    notes: r.notes as string | undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string,
  };
}

function rowToCompetitorBid(r: Record<string, unknown>): CompetitorBid {
  return {
    id: r.id as string, competitorId: r.competitor_id as string,
    bidId: r.bid_id as string | undefined, bidTitle: r.bid_title as string,
    bidAgency: r.bid_agency as string | undefined, bidDate: r.bid_date as string | undefined,
    result: r.result as CompetitorBidResult | undefined, memo: r.memo as string | undefined,
    createdAt: r.created_at as string,
  };
}

function rowToCompetitor(r: Record<string, unknown>, bids: CompetitorBid[]): Competitor {
  return {
    id: r.id as string, name: r.name as string,
    size: r.size as string | undefined, mainField: r.main_field as string | undefined,
    bidTypes: r.bid_types as string | undefined, strengths: r.strengths as string | undefined,
    weaknesses: r.weaknesses as string | undefined, notes: r.notes as string | undefined,
    bids: bids.filter(b => b.competitorId === (r.id as string)),
    createdAt: r.created_at as string, updatedAt: r.updated_at as string,
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
  const [bids, setBids] = useState<Bid[]>([]);
  const [weeklyActivities, setWeeklyActivities] = useState<WeeklyActivity[]>([]);
  const [aiChats, setAiChats] = useState<AiChat[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const addMember = async (member: Omit<ProjectMember, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('crm_project_members').insert({
      project_id: member.projectId, name: member.name, type: member.type, role: member.role,
      company: member.company, contract_type: member.contractType, monthly_rate: member.monthlyRate,
      start_date: member.startDate, end_date: member.endDate, utilization: member.utilization, notes: member.notes,
    }).select().single();
    if (error) { showToast('인력 추가에 실패했습니다.', 'error'); return; }
    if (data) setMembers(prev => [...prev, rowToMember(data as Record<string, unknown>)]);
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
    const { data } = await supabase.from('crm_project_members').update(db).eq('id', id).select().single();
    if (data) setMembers(prev => prev.map(m => m.id === id ? rowToMember(data as Record<string, unknown>) : m));
  };
  const deleteMember = async (id: string) => {
    const { error } = await supabase.from('crm_project_members').delete().eq('id', id);
    if (error) { showToast('인력 삭제에 실패했습니다.', 'error'); return; }
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const addBossItem = async (item: Omit<BossItem, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('crm_boss_items').insert({ type: item.type, title: item.title, content: item.content, priority: item.priority, due_date: item.dueDate, done: item.done, project_id: item.projectId, sub_items: item.subItems || [] }).select().single();
    if (error) { showToast('항목 추가에 실패했습니다.', 'error'); return; }
    if (data) setBossItems(prev => [rowToBoss(data as Record<string, unknown>), ...prev]);
  };
  const updateBossItem = async (id: string, fields: Partial<BossItem>) => {
    const dbFields: Record<string, unknown> = {};
    if (fields.type !== undefined) dbFields.type = fields.type;
    if (fields.title !== undefined) dbFields.title = fields.title;
    if (fields.content !== undefined) dbFields.content = fields.content;
    if (fields.priority !== undefined) dbFields.priority = fields.priority;
    if (fields.dueDate !== undefined) dbFields.due_date = fields.dueDate;
    if (fields.done !== undefined) dbFields.done = fields.done;
    if (fields.projectId !== undefined) dbFields.project_id = fields.projectId;
    if (fields.subItems !== undefined) dbFields.sub_items = fields.subItems;
    const { data } = await supabase.from('crm_boss_items').update(dbFields).eq('id', id).select().single();
    if (data) setBossItems(prev => prev.map(b => b.id === id ? rowToBoss(data as Record<string, unknown>) : b));
  };
  const deleteBossItem = async (id: string) => {
    const { error } = await supabase.from('crm_boss_items').delete().eq('id', id);
    if (error) { showToast('항목 삭제에 실패했습니다.', 'error'); return; }
    setBossItems(prev => prev.filter(b => b.id !== id));
  };
  const signOut = async () => { await supabase.auth.signOut(); setLeads([]); setProjects([]); setTasks([]); setActivities([]); setBossItems([]); setMembers([]); };

  // auth 세션 감지
  useEffect(() => {
    // onAuthStateChange가 초기 세션도 INITIAL_SESSION 이벤트로 전달하므로 getSession 불필요
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    async function fetchAll() {
      setLoading(true);
      try {
        const [leadsRes, projectsRes, issuesRes, tasksRes, activitiesRes, bossRes, membersRes, bidsRes, weeklyRes, aiRes, contractsRes, competitorsRes, competitorBidsRes] = await Promise.all([
          supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_projects').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_issues').select('*').order('created_at', { ascending: true }),
          supabase.from('crm_tasks').select('*').order('due_date', { ascending: true }),
          supabase.from('crm_activities').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_boss_items').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_project_members').select('*').order('created_at', { ascending: true }),
          supabase.from('crm_bids').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_weekly_activities').select('*').order('activity_date', { ascending: false }),
          supabase.from('crm_ai_chats').select('*').order('created_at', { ascending: true }),
          supabase.from('crm_contracts').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_competitors').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_competitor_bids').select('*').order('created_at', { ascending: false }),
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
        setBossItems((bossRes.data || []).map(r => rowToBoss(r as Record<string, unknown>)));
        setBids((bidsRes.data || []).map(r => rowToBid(r as Record<string, unknown>)));
        setWeeklyActivities((weeklyRes.data || []).map(r => rowToWeeklyActivity(r as Record<string, unknown>)));
        setAiChats((aiRes.data || []).map(r => rowToAiChat(r as Record<string, unknown>)));
        setContracts((contractsRes.data || []).map(r => rowToContract(r as Record<string, unknown>)));
        const cBids = (competitorBidsRes.data || []).map(r => rowToCompetitorBid(r as Record<string, unknown>));
        setCompetitors((competitorsRes.data || []).map(r => rowToCompetitor(r as Record<string, unknown>, cBids)));
      } catch (err) {
        console.error('fetchAll 실패:', err);
        showToast('데이터를 불러오지 못했습니다. 새로고침해 주세요.', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [session?.user?.id]);

  // ── Realtime 구독 ──────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('solocrm-realtime')

      // leads
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, payload => {
        if (payload.eventType === 'INSERT') setLeads(prev => prev.some(l => l.id === payload.new.id) ? prev : [rowToLead(payload.new as Record<string, unknown>), ...prev]);
        if (payload.eventType === 'UPDATE') setLeads(prev => prev.map(l => l.id === payload.new.id ? rowToLead(payload.new as Record<string, unknown>) : l));
        if (payload.eventType === 'DELETE') setLeads(prev => prev.filter(l => l.id !== payload.old.id));
      })

      // projects
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_projects' }, payload => {
        if (payload.eventType === 'INSERT') setProjects(prev => prev.some(p => p.id === payload.new.id) ? prev : [rowToProject(payload.new as Record<string, unknown>, []), ...prev]);
        if (payload.eventType === 'UPDATE') setProjects(prev => prev.map(p => p.id === payload.new.id ? { ...p, name: payload.new.name as string, color: payload.new.color as string, status: payload.new.status as Project['status'] } : p));
        if (payload.eventType === 'DELETE') setProjects(prev => prev.filter(p => p.id !== payload.old.id));
      })

      // issues
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_issues' }, payload => {
        if (payload.eventType === 'INSERT') {
          const issue = rowToIssue(payload.new as Record<string, unknown>);
          setProjects(prev => prev.map(p => p.id === issue.projectId ? { ...p, issues: p.issues.some(i => i.id === issue.id) ? p.issues : [...p.issues, issue] } : p));
        }
        if (payload.eventType === 'UPDATE') {
          const issue = rowToIssue(payload.new as Record<string, unknown>);
          setProjects(prev => prev.map(p => p.id === issue.projectId ? { ...p, issues: p.issues.map(i => i.id === issue.id ? issue : i) } : p));
        }
        if (payload.eventType === 'DELETE') {
          setProjects(prev => prev.map(p => ({ ...p, issues: p.issues.filter(i => i.id !== payload.old.id) })));
        }
      })

      // tasks
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_tasks' }, payload => {
        if (payload.eventType === 'INSERT') setTasks(prev => prev.some(t => t.id === payload.new.id) ? prev : [...prev, rowToTask(payload.new as Record<string, unknown>)]);
        if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? rowToTask(payload.new as Record<string, unknown>) : t));
        if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
      })

      // activities
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_activities' }, payload => {
        if (payload.eventType === 'INSERT') setActivities(prev => prev.some(a => a.id === payload.new.id) ? prev : [rowToActivity(payload.new as Record<string, unknown>), ...prev]);
        if (payload.eventType === 'DELETE') setActivities(prev => prev.filter(a => a.id !== payload.old.id));
      })

      // boss items
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_boss_items' }, payload => {
        if (payload.eventType === 'INSERT') setBossItems(prev => prev.some(b => b.id === payload.new.id) ? prev : [rowToBoss(payload.new as Record<string, unknown>), ...prev]);
        if (payload.eventType === 'UPDATE') setBossItems(prev => prev.map(b => b.id === payload.new.id ? rowToBoss(payload.new as Record<string, unknown>) : b));
        if (payload.eventType === 'DELETE') setBossItems(prev => prev.filter(b => b.id !== payload.old.id));
      })

      // project members
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_project_members' }, payload => {
        if (payload.eventType === 'INSERT') setMembers(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, rowToMember(payload.new as Record<string, unknown>)]);
        if (payload.eventType === 'UPDATE') setMembers(prev => prev.map(m => m.id === payload.new.id ? rowToMember(payload.new as Record<string, unknown>) : m));
        if (payload.eventType === 'DELETE') setMembers(prev => prev.filter(m => m.id !== payload.old.id));
      })

      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);
  // ──────────────────────────────────────────────────────────

  // ── 30초 주기 전체 동기화 (추가/수정/삭제 모두 반영) ─────────────
  useEffect(() => {
    if (!session) return;
    const fullSync = async () => {
      try {
        const [leadsRes, projectsRes, issuesRes, tasksRes, activitiesRes, bossRes, membersRes, bidsRes, weeklyRes, aiRes, contractsRes, competitorsRes, competitorBidsRes] = await Promise.all([
          supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_projects').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_issues').select('*').order('created_at', { ascending: true }),
          supabase.from('crm_tasks').select('*').order('due_date', { ascending: true }),
          supabase.from('crm_activities').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_boss_items').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_project_members').select('*').order('created_at', { ascending: true }),
          supabase.from('crm_bids').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_weekly_activities').select('*').order('activity_date', { ascending: false }),
          supabase.from('crm_ai_chats').select('*').order('created_at', { ascending: true }),
          supabase.from('crm_contracts').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_competitors').select('*').order('created_at', { ascending: false }),
          supabase.from('crm_competitor_bids').select('*').order('created_at', { ascending: false }),
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
        setBossItems((bossRes.data || []).map(r => rowToBoss(r as Record<string, unknown>)));
        setBids((bidsRes.data || []).map(r => rowToBid(r as Record<string, unknown>)));
        setWeeklyActivities((weeklyRes.data || []).map(r => rowToWeeklyActivity(r as Record<string, unknown>)));
        setAiChats((aiRes.data || []).map(r => rowToAiChat(r as Record<string, unknown>)));
        setContracts((contractsRes.data || []).map(r => rowToContract(r as Record<string, unknown>)));
        const cBids = (competitorBidsRes.data || []).map(r => rowToCompetitorBid(r as Record<string, unknown>));
        setCompetitors((competitorsRes.data || []).map(r => rowToCompetitor(r as Record<string, unknown>, cBids)));
      } catch (err) {
        console.error('fullSync 실패:', err);
      } // fullSync 실패는 조용히 (30초 후 재시도)
    };
    const timer = setInterval(fullSync, 30000);
    return () => clearInterval(timer);
  }, [session?.user?.id]);
  // ──────────────────────────────────────────────────────────────

  const addLead = async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase.from('crm_leads').insert({
      name: lead.name, company: lead.company, deal_name: lead.dealName || null, contact: lead.contact, phone: lead.phone,
      value: lead.value, status: lead.status, notes: lead.notes,
      next_action: lead.nextAction, next_action_date: lead.nextActionDate || null,
    }).select().single();
    if (error) { showToast('리드 추가에 실패했습니다.', 'error'); return; }
    if (data) setLeads(prev => [rowToLead(data as Record<string, unknown>), ...prev]);
  };

  const updateLead = async (id: string, fields: Partial<Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const dbFields: Record<string, unknown> = {};
    if (fields.name !== undefined) dbFields.name = fields.name;
    if (fields.company !== undefined) dbFields.company = fields.company;
    if (fields.dealName !== undefined) dbFields.deal_name = fields.dealName || null;
    if (fields.contact !== undefined) dbFields.contact = fields.contact;
    if (fields.phone !== undefined) dbFields.phone = fields.phone;
    if (fields.value !== undefined) dbFields.value = fields.value;
    if (fields.status !== undefined) dbFields.status = fields.status;
    if (fields.nextAction !== undefined) dbFields.next_action = fields.nextAction;
    if (fields.nextActionDate !== undefined) dbFields.next_action_date = fields.nextActionDate || null;
    if (fields.notes !== undefined) dbFields.notes = fields.notes;
    const { data, error } = await supabase.from('crm_leads').update(dbFields).eq('id', id).select().single();
    if (error) { showToast('리드 수정에 실패했습니다.', 'error'); return; }
    if (data) setLeads(prev => prev.map(l => l.id === id ? rowToLead(data as Record<string, unknown>) : l));
  };

  const updateLeadStatus = async (id: string, status: LeadStatus, prevStatus?: LeadStatus) => {
    const { data, error } = await supabase.from('crm_leads').update({ status }).eq('id', id).select().single();
    if (data) setLeads(prev => prev.map(l => l.id === id ? rowToLead(data as Record<string, unknown>) : l));
    if (!error && prevStatus && prevStatus !== status) {
      const content = `상태 변경: ${statusLabel[prevStatus]} → ${statusLabel[status]}`;
      const { data: actData } = await supabase.from('crm_activities').insert({ lead_id: id, type: 'status_change', content }).select().single();
      if (actData) setActivities(prev => [rowToActivity(actData as Record<string, unknown>), ...prev]);
    }
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from('crm_leads').delete().eq('id', id);
    if (error) { showToast('리드 삭제에 실패했습니다.', 'error'); return; }
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const addProject = async (name: string, color: string) => {
    const { data, error } = await supabase.from('crm_projects').insert({ name, color }).select().single();
    if (error) { showToast('프로젝트 추가에 실패했습니다.', 'error'); return; }
    if (data) setProjects(prev => [rowToProject(data as Record<string, unknown>, []), ...prev]);
  };

  const addIssue = async (projectId: string, issue: Omit<Issue, 'id' | 'projectId' | 'createdAt'>) => {
    const { data, error } = await supabase.from('crm_issues').insert({
      project_id: projectId, title: issue.title, status: issue.status,
      priority: issue.priority, due_date: issue.dueDate || null,
    }).select().single();
    if (error) { showToast('이슈 추가에 실패했습니다.', 'error'); return; }
    if (data) {
      const newIssue = rowToIssue(data as Record<string, unknown>);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, issues: [...p.issues, newIssue] } : p));
    }
  };

  const updateIssueStatus = async (_projectId: string, issueId: string, status: IssueStatus) => {
    const { data } = await supabase.from('crm_issues').update({ status }).eq('id', issueId).select().single();
    if (data) {
      const updated = rowToIssue(data as Record<string, unknown>);
      setProjects(prev => prev.map(p => ({ ...p, issues: p.issues.map(i => i.id === issueId ? updated : i) })));
    }
  };

  const updateIssue = async (issueId: string, fields: { title?: string; status?: IssueStatus; priority?: Issue['priority']; dueDate?: string; assignee?: string; memo?: string }) => {
    const db: Record<string, unknown> = {};
    if (fields.title !== undefined) db.title = fields.title;
    if (fields.status !== undefined) db.status = fields.status;
    if (fields.priority !== undefined) db.priority = fields.priority;
    if (fields.dueDate !== undefined) db.due_date = fields.dueDate || null;
    if (fields.assignee !== undefined) db.assignee = fields.assignee || null;
    if (fields.memo !== undefined) db.memo = fields.memo || null;
    const { data } = await supabase.from('crm_issues').update(db).eq('id', issueId).select().single();
    if (data) {
      const updated = rowToIssue(data as Record<string, unknown>);
      setProjects(prev => prev.map(p => ({ ...p, issues: p.issues.map(i => i.id === issueId ? updated : i) })));
    }
  };

  const deleteProject = async (projectId: string) => {
    const { error } = await supabase.from('crm_projects').delete().eq('id', projectId);
    if (error) { showToast('프로젝트 삭제에 실패했습니다.', 'error'); return; }
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setMembers(prev => prev.filter(m => m.projectId !== projectId));
  };

  const deleteIssue = async (_projectId: string, issueId: string) => {
    const { error } = await supabase.from('crm_issues').delete().eq('id', issueId);
    if (error) { showToast('이슈 삭제에 실패했습니다.', 'error'); return; }
    setProjects(prev => prev.map(p => ({ ...p, issues: p.issues.filter(i => i.id !== issueId) })));
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const { data } = await supabase.from('crm_tasks').update({ done: !task.done }).eq('id', id).select().single();
    if (data) setTasks(prev => prev.map(t => t.id === id ? rowToTask(data as Record<string, unknown>) : t));
  };

  const updateTaskSubtasks = async (id: string, subtasks: Subtask[]) => {
    const { data } = await supabase.from('crm_tasks').update({ subtasks }).eq('id', id).select().single();
    if (data) setTasks(prev => prev.map(t => t.id === id ? rowToTask(data as Record<string, unknown>) : t));
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('crm_tasks').delete().eq('id', id);
    if (error) { showToast('할 일 삭제에 실패했습니다.', 'error'); return; }
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    const { data, error } = await supabase.from('crm_tasks').insert({
      title: task.title, done: task.done, due_date: task.dueDate,
      linked_type: task.linkedTo?.type || null, linked_id: task.linkedTo?.id || null, linked_name: task.linkedTo?.name || null,
    }).select().single();
    if (error) { showToast('할 일 추가에 실패했습니다.', 'error'); return; }
    if (data) setTasks(prev => [...prev, rowToTask(data as Record<string, unknown>)]);
  };

  const updateTaskDate = async (id: string, dueDate: string) => {
    const { data } = await supabase.from('crm_tasks').update({ due_date: dueDate }).eq('id', id).select().single();
    if (data) setTasks(prev => prev.map(t => t.id === id ? rowToTask(data as Record<string, unknown>) : t));
  };

  const addActivity = async (leadId: string, type: ActivityType, content: string) => {
    const { data } = await supabase.from('crm_activities').insert({ lead_id: leadId, type, content }).select().single();
    if (data) setActivities(prev => [rowToActivity(data as Record<string, unknown>), ...prev]);
  };


  // ── Bids ──
  const addBid = async (bid: Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase.from('crm_bids').insert({
      title: bid.title, agency: bid.agency, deadline: bid.deadline || null,
      amount: bid.amount || null, status: bid.status, memo: bid.memo || null, bid_no: bid.bidNo || null,
    }).select().single();
    if (error) { showToast('입찰 추가에 실패했습니다.', 'error'); return; }
    if (data) setBids(prev => [rowToBid(data as Record<string, unknown>), ...prev]);
  };

  const updateBid = async (id: string, fields: Partial<Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const db: Record<string, unknown> = {};
    if (fields.title !== undefined) db.title = fields.title;
    if (fields.agency !== undefined) db.agency = fields.agency;
    if (fields.deadline !== undefined) db.deadline = fields.deadline || null;
    if (fields.amount !== undefined) db.amount = fields.amount || null;
    if (fields.status !== undefined) db.status = fields.status;
    if (fields.memo !== undefined) db.memo = fields.memo || null;
    if (fields.bidNo !== undefined) db.bid_no = fields.bidNo || null;
    const { data, error } = await supabase.from('crm_bids').update(db).eq('id', id).select().single();
    if (error) { showToast('입찰 수정에 실패했습니다.', 'error'); return; }
    if (data) setBids(prev => prev.map(b => b.id === id ? rowToBid(data as Record<string, unknown>) : b));
  };

  const deleteBid = async (id: string) => {
    const { error } = await supabase.from('crm_bids').delete().eq('id', id);
    if (error) { showToast('입찰 삭제에 실패했습니다.', 'error'); return; }
    setBids(prev => prev.filter(b => b.id !== id));
  };

  // ── Weekly Activities ──
  const addWeeklyActivity = async (a: Omit<WeeklyActivity, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('crm_weekly_activities').insert({
      activity_date: a.activityDate, type: a.type, count: a.count, note: a.note || null,
    }).select().single();
    if (error) { showToast('활동 추가에 실패했습니다.', 'error'); return; }
    if (data) setWeeklyActivities(prev => [rowToWeeklyActivity(data as Record<string, unknown>), ...prev]);
  };

  const deleteWeeklyActivity = async (id: string) => {
    const { error } = await supabase.from('crm_weekly_activities').delete().eq('id', id);
    if (error) { showToast('활동 삭제에 실패했습니다.', 'error'); return; }
    setWeeklyActivities(prev => prev.filter(a => a.id !== id));
  };

  // ── AI Chats ──
  const addAiChat = async (mode: AiChatMode, role: AiChatRole, content: string) => {
    const { data } = await supabase.from('crm_ai_chats').insert({ mode, role, content }).select().single();
    if (data) setAiChats(prev => [...prev, rowToAiChat(data as Record<string, unknown>)]);
  };

  const clearAiChats = async (mode: AiChatMode) => {
    await supabase.from('crm_ai_chats').delete().eq('mode', mode);
    setAiChats(prev => prev.filter(c => c.mode !== mode));
  };

  // ── Contracts ──
  const addContract = async (c: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase.from('crm_contracts').insert({
      title: c.title, contract_no: c.contractNo || null, client: c.client,
      amount: c.amount || null, contract_date: c.contractDate || null, status: c.status,
      lead_id: c.leadId || null, bid_id: c.bidId || null, project_id: c.projectId || null,
      mid_delivery_date: c.midDeliveryDate || null, mid_delivery_done: c.midDeliveryDone,
      final_delivery_date: c.finalDeliveryDate || null, final_delivery_done: c.finalDeliveryDone,
      deposit_rate: c.depositRate, deposit_paid: c.depositPaid, deposit_date: c.depositDate || null,
      mid_payment_rate: c.midPaymentRate, mid_payment_paid: c.midPaymentPaid, mid_payment_date: c.midPaymentDate || null,
      balance_rate: c.balanceRate, balance_paid: c.balancePaid, balance_date: c.balanceDate || null,
      notes: c.notes || null,
    }).select().single();
    if (error) { showToast('계약 추가에 실패했습니다.', 'error'); return; }
    if (data) setContracts(prev => [rowToContract(data as Record<string, unknown>), ...prev]);
  };

  const updateContract = async (id: string, fields: Partial<Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const db: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (fields.title !== undefined) db.title = fields.title;
    if (fields.contractNo !== undefined) db.contract_no = fields.contractNo || null;
    if (fields.client !== undefined) db.client = fields.client;
    if (fields.amount !== undefined) db.amount = fields.amount || null;
    if (fields.contractDate !== undefined) db.contract_date = fields.contractDate || null;
    if (fields.status !== undefined) db.status = fields.status;
    if (fields.leadId !== undefined) db.lead_id = fields.leadId || null;
    if (fields.bidId !== undefined) db.bid_id = fields.bidId || null;
    if (fields.projectId !== undefined) db.project_id = fields.projectId || null;
    if (fields.midDeliveryDate !== undefined) db.mid_delivery_date = fields.midDeliveryDate || null;
    if (fields.midDeliveryDone !== undefined) db.mid_delivery_done = fields.midDeliveryDone;
    if (fields.finalDeliveryDate !== undefined) db.final_delivery_date = fields.finalDeliveryDate || null;
    if (fields.finalDeliveryDone !== undefined) db.final_delivery_done = fields.finalDeliveryDone;
    if (fields.depositRate !== undefined) db.deposit_rate = fields.depositRate;
    if (fields.depositPaid !== undefined) db.deposit_paid = fields.depositPaid;
    if (fields.depositDate !== undefined) db.deposit_date = fields.depositDate || null;
    if (fields.midPaymentRate !== undefined) db.mid_payment_rate = fields.midPaymentRate;
    if (fields.midPaymentPaid !== undefined) db.mid_payment_paid = fields.midPaymentPaid;
    if (fields.midPaymentDate !== undefined) db.mid_payment_date = fields.midPaymentDate || null;
    if (fields.balanceRate !== undefined) db.balance_rate = fields.balanceRate;
    if (fields.balancePaid !== undefined) db.balance_paid = fields.balancePaid;
    if (fields.balanceDate !== undefined) db.balance_date = fields.balanceDate || null;
    if (fields.notes !== undefined) db.notes = fields.notes || null;
    const { data, error } = await supabase.from('crm_contracts').update(db).eq('id', id).select().single();
    if (error) { showToast('계약 수정에 실패했습니다.', 'error'); return; }
    if (data) setContracts(prev => prev.map(c => c.id === id ? rowToContract(data as Record<string, unknown>) : c));
  };

  const deleteContract = async (id: string) => {
    const { error } = await supabase.from('crm_contracts').delete().eq('id', id);
    if (error) { showToast('계약 삭제에 실패했습니다.', 'error'); return; }
    setContracts(prev => prev.filter(c => c.id !== id));
  };

  // ── Competitors ──
  const addCompetitor = async (c: Omit<Competitor, 'id' | 'bids' | 'createdAt' | 'updatedAt'>) => {
    const { data, error } = await supabase.from('crm_competitors').insert({
      name: c.name, size: c.size || null, main_field: c.mainField || null,
      bid_types: c.bidTypes || null, strengths: c.strengths || null,
      weaknesses: c.weaknesses || null, notes: c.notes || null,
    }).select().single();
    if (error) { showToast('경쟁사 추가에 실패했습니다.', 'error'); return; }
    if (data) setCompetitors(prev => [rowToCompetitor(data as Record<string, unknown>, []), ...prev]);
  };

  const updateCompetitor = async (id: string, fields: Partial<Omit<Competitor, 'id' | 'bids' | 'createdAt' | 'updatedAt'>>) => {
    const db: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (fields.name !== undefined) db.name = fields.name;
    if (fields.size !== undefined) db.size = fields.size || null;
    if (fields.mainField !== undefined) db.main_field = fields.mainField || null;
    if (fields.bidTypes !== undefined) db.bid_types = fields.bidTypes || null;
    if (fields.strengths !== undefined) db.strengths = fields.strengths || null;
    if (fields.weaknesses !== undefined) db.weaknesses = fields.weaknesses || null;
    if (fields.notes !== undefined) db.notes = fields.notes || null;
    const { data, error } = await supabase.from('crm_competitors').update(db).eq('id', id).select().single();
    if (error) { showToast('경쟁사 수정에 실패했습니다.', 'error'); return; }
    if (data) setCompetitors(prev => prev.map(c => c.id === id ? rowToCompetitor(data as Record<string, unknown>, c.bids) : c));
  };

  const deleteCompetitor = async (id: string) => {
    const { error } = await supabase.from('crm_competitors').delete().eq('id', id);
    if (error) { showToast('경쟁사 삭제에 실패했습니다.', 'error'); return; }
    setCompetitors(prev => prev.filter(c => c.id !== id));
  };

  const addCompetitorBid = async (competitorId: string, bid: Omit<CompetitorBid, 'id' | 'competitorId' | 'createdAt'>) => {
    const { data, error } = await supabase.from('crm_competitor_bids').insert({
      competitor_id: competitorId, bid_id: bid.bidId || null,
      bid_title: bid.bidTitle, bid_agency: bid.bidAgency || null,
      bid_date: bid.bidDate || null, result: bid.result || null, memo: bid.memo || null,
    }).select().single();
    if (error) { showToast('입찰 이력 추가에 실패했습니다.', 'error'); return; }
    if (data) {
      const newBid = rowToCompetitorBid(data as Record<string, unknown>);
      setCompetitors(prev => prev.map(c => c.id === competitorId ? { ...c, bids: [...c.bids, newBid] } : c));
    }
  };

  const deleteCompetitorBid = async (id: string, competitorId: string) => {
    const { error } = await supabase.from('crm_competitor_bids').delete().eq('id', id);
    if (error) { showToast('입찰 이력 삭제에 실패했습니다.', 'error'); return; }
    setCompetitors(prev => prev.map(c => c.id === competitorId ? { ...c, bids: c.bids.filter(b => b.id !== id) } : c));
  };

  const getLeadActivities = (leadId: string) => activities.filter(a => a.leadId === leadId);

  return (
    <AppContext.Provider value={{ leads, projects, tasks, activities, bossItems, addBossItem, updateBossItem, deleteBossItem, session, loading, theme, toggleTheme, signOut, addLead, updateLead, updateLeadStatus, deleteLead, addProject, deleteProject, updateIssue, members, addMember, updateMember, deleteMember, addIssue, updateIssueStatus, deleteIssue, toggleTask, deleteTask, addTask, updateTaskDate, updateTaskSubtasks, addActivity, getLeadActivities, toasts, removeToast, bids, addBid, updateBid, deleteBid, weeklyActivities, addWeeklyActivity, deleteWeeklyActivity, aiChats, addAiChat, clearAiChats, contracts, addContract, updateContract, deleteContract, competitors, addCompetitor, updateCompetitor, deleteCompetitor, addCompetitorBid, deleteCompetitorBid }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
