import type { LeadStatus, IssueStatus } from '../types';
import styles from './StatusBadge.module.css';

const leadLabels: Record<LeadStatus, string> = {
  new: '신규', meeting: '미팅진행', proposal: '제안중', won: '수주', lost: '실패'
};
const issueLabels: Record<IssueStatus, string> = {
  todo: '할 일', in_progress: '진행 중', done: '완료'
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`${styles.badge} ${styles[`lead_${status}`]}`}>{leadLabels[status]}</span>;
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return <span className={`${styles.badge} ${styles[`issue_${status}`]}`}>{issueLabels[status]}</span>;
}

export function LeadStatusSelect({ value, onChange }: { value: LeadStatus; onChange: (s: LeadStatus) => void }) {
  return (
    <select className={`${styles.select} ${styles[`lead_${value}`]}`} value={value} onChange={e => onChange(e.target.value as LeadStatus)}>
      {(Object.keys(leadLabels) as LeadStatus[]).map(s => (
        <option key={s} value={s}>{leadLabels[s]}</option>
      ))}
    </select>
  );
}

export function IssueStatusSelect({ value, onChange }: { value: IssueStatus; onChange: (s: IssueStatus) => void }) {
  return (
    <select className={`${styles.select} ${styles[`issue_${value}`]}`} value={value} onChange={e => onChange(e.target.value as IssueStatus)}>
      {(Object.keys(issueLabels) as IssueStatus[]).map(s => (
        <option key={s} value={s}>{issueLabels[s]}</option>
      ))}
    </select>
  );
}
