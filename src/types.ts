export type LeadStatus = 'new' | 'contacted' | 'proposal' | 'won' | 'lost';
export type IssueStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';
export type BidStatus = 'preparing' | 'active' | 'won' | 'lost';
export type WeeklyActivityType = 'call' | 'meeting' | 'email' | 'proposal' | 'new_contact';
export type AiChatMode = 'research' | 'objection' | 'summary';
export type AiChatRole = 'user' | 'assistant';

export interface Bid {
  id: string;
  title: string;
  agency: string;
  deadline?: string;
  amount?: number;
  status: BidStatus;
  memo?: string;
  bidNo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyActivity {
  id: string;
  activityDate: string;
  type: WeeklyActivityType;
  count: number;
  note?: string;
  createdAt: string;
}

export interface AiChat {
  id: string;
  mode: AiChatMode;
  role: AiChatRole;
  content: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  dealName?: string;
  status: LeadStatus;
  value: number;
  contact?: string;
  phone?: string;
  nextAction?: string;
  nextActionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  status: IssueStatus;
  priority: Priority;
  dueDate?: string;
  assignee?: string;
  memo?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  status: 'active' | 'paused' | 'done';
  issues: Issue[];
  createdAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  dueDate: string;
  linkedTo?: { type: 'lead' | 'project'; id: string; name: string };
  subtasks: Subtask[];
}

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'status_change';

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  content: string;
  createdAt: string;
}

export type BossItemType = 'question' | 'task' | 'memo';

export interface BossSubItem {
  id: string;
  title: string;
  done: boolean;
}

export interface BossItem {
  id: string;
  type: BossItemType;
  title: string;
  content?: string;
  priority: Priority;
  dueDate?: string;
  done: boolean;
  projectId?: string;
  subItems: BossSubItem[];
  createdAt: string;
}

export type MemberType = 'internal' | 'external';

export interface ProjectMember {
  id: string;
  projectId: string;
  name: string;
  type: MemberType;
  role?: string;
  company?: string;
  contractType?: string;
  monthlyRate?: number;
  startDate?: string;
  endDate?: string;
  utilization: number;
  notes?: string;
  createdAt: string;
}

export type CompetitorBidResult = 'won_us' | 'won_them' | 'other';

export interface CompetitorBid {
  id: string;
  competitorId: string;
  bidId?: string;
  bidTitle: string;
  bidAgency?: string;
  bidDate?: string;
  result?: CompetitorBidResult;
  memo?: string;
  createdAt: string;
}

export interface Competitor {
  id: string;
  name: string;
  size?: string;
  mainField?: string;
  bidTypes?: string;
  strengths?: string;
  weaknesses?: string;
  notes?: string;
  bids: CompetitorBid[];
  createdAt: string;
  updatedAt: string;
}

export type ContractStatus = 'active' | 'completed' | 'cancelled';

export interface Contract {
  id: string;
  title: string;
  contractNo?: string;
  client: string;
  amount?: number;
  contractDate?: string;
  status: ContractStatus;
  // 연결
  leadId?: string;
  bidId?: string;
  projectId?: string;
  // 납품 일정
  midDeliveryDate?: string;
  midDeliveryDone: boolean;
  finalDeliveryDate?: string;
  finalDeliveryDone: boolean;
  // 대금 수금
  depositRate: number;
  depositPaid: boolean;
  depositDate?: string;
  midPaymentRate: number;
  midPaymentPaid: boolean;
  midPaymentDate?: string;
  balanceRate: number;
  balancePaid: boolean;
  balanceDate?: string;
  // 기타
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NoteCategory = 'tip' | 'knowledge' | 'network' | 'general';

export interface NoteChecklist {
  id: string;
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  title: string;
  content?: string;
  category: NoteCategory;
  tags: string[];
  checklist: NoteChecklist[];
  leadId?: string;
  projectId?: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}
