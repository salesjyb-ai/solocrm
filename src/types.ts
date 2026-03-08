export type LeadStatus = 'new' | 'contacted' | 'proposal' | 'won' | 'lost';
export type IssueStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Lead {
  id: string;
  name: string;
  company: string;
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

export interface Task {
  id: string;
  title: string;
  done: boolean;
  dueDate: string;
  linkedTo?: { type: 'lead' | 'project'; id: string; name: string };
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

export interface BossItem {
  id: string;
  type: BossItemType;
  title: string;
  content?: string;
  priority: Priority;
  dueDate?: string;
  done: boolean;
  projectId?: string;
  createdAt: string;
}
