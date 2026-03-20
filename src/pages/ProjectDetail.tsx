import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Users, ListTodo, Edit2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ProjectMember, MemberType, Issue, IssueStatus } from '../types';
import Modal from '../components/Modal';
import f from './FormField.module.css';
import styles from './ProjectDetail.module.css';

type Tab = 'issues' | 'members';

const CONTRACT_TYPES = ['월정액', '시간제', '건별계약', '기타'];
const UTILIZATION_OPTIONS = [25, 50, 75, 100];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, members, addMember, updateMember, deleteMember, addIssue, updateIssue, updateIssueStatus, deleteIssue } = useApp();

  const project = projects.find(p => p.id === id);
  const projectMembers = members.filter(m => m.projectId === id);

  const [tab, setTab] = useState<Tab>('issues');
  const [memberModal, setMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [issueModal, setIssueModal] = useState(false);
  const [editIssueModal, setEditIssueModal] = useState<Issue | null>(null);
  const [eForm, setEForm] = useState({ title: '', status: 'todo' as IssueStatus, priority: 'medium' as Issue['priority'], dueDate: '', assignee: '', memo: '' });

  const [mForm, setMForm] = useState({
    name: '', type: 'internal' as MemberType, role: '', company: '',
    contractType: '월정액', monthlyRate: '', startDate: '', endDate: '',
    utilization: 100, notes: '',
  });

  const [iForm, setIForm] = useState({ title: '', priority: 'medium' as 'low' | 'medium' | 'high', dueDate: '' });

  if (!project) return (
    <div className={styles.notFound}>
      <p>프로젝트를 찾을 수 없습니다.</p>
      <button onClick={() => navigate('/projects')}>← 목록으로</button>
    </div>
  );

  const doneIssues = project.issues.filter(i => i.status === 'done').length;
  const totalIssues = project.issues.length;
  const pct = totalIssues === 0 ? 0 : Math.round((doneIssues / totalIssues) * 100);

  const totalMM = projectMembers.reduce((sum, m) => {
    const mm = calcMM(m.startDate, m.endDate, m.utilization);
    return sum + (mm || 0);
  }, 0);

  const totalMonthlyCost = projectMembers
    .filter(m => m.type === 'external' && m.monthlyRate)
    .reduce((sum, m) => sum + (m.monthlyRate || 0), 0);

  const openAddMember = () => {
    setEditingMember(null);
    setMForm({ name: '', type: 'internal', role: '', company: '', contractType: '월정액', monthlyRate: '', startDate: '', endDate: '', utilization: 100, notes: '' });
    setMemberModal(true);
  };

  const openEditMember = (m: ProjectMember) => {
    setEditingMember(m);
    setMForm({
      name: m.name, type: m.type, role: m.role || '', company: m.company || '',
      contractType: m.contractType || '월정액',
      monthlyRate: m.monthlyRate ? String(m.monthlyRate) : '',
      startDate: m.startDate || '', endDate: m.endDate || '',
      utilization: m.utilization, notes: m.notes || '',
    });
    setMemberModal(true);
  };

  const handleMemberSave = async () => {
    if (!mForm.name.trim()) return;
    const payload = {
      projectId: id!, name: mForm.name, type: mForm.type, role: mForm.role || undefined,
      company: mForm.company || undefined, contractType: mForm.contractType || undefined,
      monthlyRate: mForm.monthlyRate && Number(mForm.monthlyRate.replace(/,/g, '')) > 0
        ? Number(mForm.monthlyRate.replace(/,/g, ''))
        : undefined,
      startDate: mForm.startDate || undefined, endDate: mForm.endDate || undefined,
      utilization: mForm.utilization, notes: mForm.notes || undefined,
    };
    if (editingMember) {
      await updateMember(editingMember.id, payload);
    } else {
      await addMember(payload);
    }
    setMemberModal(false);
    setEditingMember(null);
    setMForm({ name: '', type: 'internal', role: '', company: '', contractType: '월정액', monthlyRate: '', startDate: '', endDate: '', utilization: 100, notes: '' });
  };

  const handleIssueAdd = async () => {
    if (!iForm.title.trim()) return;
    await addIssue(id!, { title: iForm.title, status: 'todo', priority: iForm.priority, dueDate: iForm.dueDate || undefined });
    setIForm({ title: '', priority: 'medium', dueDate: '' });
    setIssueModal(false);
  };

  return (
    <div className={styles.page}>
      {/* 헤더 */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/projects')}>
          <ArrowLeft size={15} /> 프로젝트 목록
        </button>
        <div className={styles.projectTitle}>
          <span className={styles.colorDot} style={{ background: project.color }} />
          <h1>{project.name}</h1>
        </div>
        {/* 요약 바 */}
        <div className={styles.summaryBar}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>이슈</span>
            <span className={styles.summaryVal}>{doneIssues}/{totalIssues}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>진행률</span>
            <span className={styles.summaryVal}>{pct}%</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>투입 인력</span>
            <span className={styles.summaryVal}>{projectMembers.filter(m => !m.endDate || m.endDate >= new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]).length}명</span>
          </div>
          {totalMM > 0 && (
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>총 M/M</span>
              <span className={styles.summaryVal}>{Math.round(totalMM * 10) / 10}</span>
            </div>
          )}
          {totalMonthlyCost > 0 && (
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>월 외주비</span>
              <span className={styles.summaryVal}>{(totalMonthlyCost / 10000).toLocaleString()}만원</span>
            </div>
          )}
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${pct}%`, background: project.color }} />
            </div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'issues' ? styles.tabActive : ''}`} onClick={() => setTab('issues')}>
          <ListTodo size={14} /> 이슈 <span className={styles.tabBadge}>{project.issues.length}</span>
        </button>
        <button className={`${styles.tab} ${tab === 'members' ? styles.tabActive : ''}`} onClick={() => setTab('members')}>
          <Users size={14} /> 인력 <span className={styles.tabBadge}>{projectMembers.length}</span>
        </button>
      </div>

      {/* 이슈 탭 */}
      {tab === 'issues' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>이슈 목록</span>
            <button className={styles.addBtn} onClick={() => setIssueModal(true)}><Plus size={13} /> 이슈 추가</button>
          </div>
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>이슈</span><span>상태</span><span>우선순위</span><span>마감일</span><span></span>
            </div>
            {project.issues.length === 0 && <div className={styles.empty}>이슈가 없습니다.</div>}
            {project.issues.map(issue => (
              <div key={issue.id} className={styles.tableRow} onClick={() => {
                setEForm({ title: issue.title, status: issue.status, priority: issue.priority, dueDate: issue.dueDate || '', assignee: issue.assignee || '', memo: issue.memo || '' });
                setEditIssueModal(issue);
              }} style={{cursor:'pointer'}}>
                <span className={styles.issueTitle}>{issue.title}</span>
                <span onClick={e => e.stopPropagation()}>
                  <select className={styles.statusSelect} value={issue.status}
                    onChange={e => updateIssueStatus(project.id, issue.id, e.target.value as 'todo' | 'in_progress' | 'done')}>
                    <option value="todo">할 일</option>
                    <option value="in_progress">진행중</option>
                    <option value="done">완료</option>
                  </select>
                </span>
                <span className={`${styles.priority} ${styles[`p_${issue.priority}`]}`}>● {issue.priority === 'high' ? '높음' : issue.priority === 'medium' ? '중간' : '낮음'}</span>
                <span className={styles.dueDate}>{issue.dueDate || '-'}</span>
                <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); if (confirm(`"${issue.title}" 이슈를 삭제할까요?`)) deleteIssue(project.id, issue.id); }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 인력 탭 */}
      {tab === 'members' && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>투입 인력</span>
            <button className={styles.addBtn} onClick={openAddMember}><Plus size={13} /> 인력 추가</button>
          </div>

          {projectMembers.length === 0 && <div className={styles.empty}>등록된 인력이 없습니다.</div>}

          {/* 내부 인력 */}
          {projectMembers.filter(m => m.type === 'internal').length > 0 && (
            <div className={styles.memberGroup}>
              <div className={styles.memberGroupLabel}>내부 인력</div>
              {projectMembers.filter(m => m.type === 'internal').map(m => (
                <MemberCard key={m.id} member={m} onEdit={() => openEditMember(m)} onDelete={() => deleteMember(m.id)} />
              ))}
            </div>
          )}

          {/* 외주 */}
          {projectMembers.filter(m => m.type === 'external').length > 0 && (
            <div className={styles.memberGroup}>
              <div className={styles.memberGroupLabel}>외주</div>
              {projectMembers.filter(m => m.type === 'external').map(m => (
                <MemberCard key={m.id} member={m} onEdit={() => openEditMember(m)} onDelete={() => deleteMember(m.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 인력 추가/수정 모달 */}
      <Modal open={memberModal} onClose={() => { setMemberModal(false); setEditingMember(null); setMForm({ name: '', type: 'internal', role: '', company: '', contractType: '월정액', monthlyRate: '', startDate: '', endDate: '', utilization: 100, notes: '' }); }} title={editingMember ? '인력 수정' : '인력 추가'}>
        <div className={f.form}>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>이름 *</label>
              <input className={f.input} placeholder="홍길동" value={mForm.name} onChange={e => setMForm(p => ({...p, name: e.target.value}))} autoFocus />
            </div>
            <div className={f.field}>
              <label className={f.label}>구분</label>
              <select className={f.select} value={mForm.type} onChange={e => setMForm(p => ({...p, type: e.target.value as MemberType}))}>
                <option value="internal">내부 인력</option>
                <option value="external">외주</option>
              </select>
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>역할/직책</label>
              <input className={f.input} placeholder="PM, 개발자, 디자이너..." value={mForm.role} onChange={e => setMForm(p => ({...p, role: e.target.value}))} />
            </div>
            {mForm.type === 'external' && (
              <div className={f.field}>
                <label className={f.label}>업체명</label>
                <input className={f.input} placeholder="(주)외주업체" value={mForm.company} onChange={e => setMForm(p => ({...p, company: e.target.value}))} />
              </div>
            )}
          </div>
          {mForm.type === 'external' && (
            <div className={f.row}>
              <div className={f.field}>
                <label className={f.label}>계약 형태</label>
                <select className={f.select} value={mForm.contractType} onChange={e => setMForm(p => ({...p, contractType: e.target.value}))}>
                  {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className={f.field}>
                <label className={f.label}>월 단가 (원)</label>
                <input className={f.input} type="text" inputMode="numeric" placeholder="5,000,000"
                  value={mForm.monthlyRate ? Number(mForm.monthlyRate.replace(/,/g,'')).toLocaleString('ko-KR') : ''}
                  onChange={e => { const raw = e.target.value.replace(/,/g,'').replace(/[^0-9]/g,''); setMForm(p => ({...p, monthlyRate: raw})); }} />
              </div>
            </div>
          )}
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>투입일</label>
              <input className={f.input} type="date" value={mForm.startDate} onChange={e => setMForm(p => ({...p, startDate: e.target.value}))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>철수일</label>
              <input className={f.input} type="date" value={mForm.endDate} onChange={e => setMForm(p => ({...p, endDate: e.target.value}))} />
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>투입률</label>
              <select className={f.select} value={mForm.utilization} onChange={e => setMForm(p => ({...p, utilization: Number(e.target.value)}))}>
                {UTILIZATION_OPTIONS.map(u => <option key={u} value={u}>{u}%</option>)}
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>메모</label>
              <input className={f.input} placeholder="기타 메모" value={mForm.notes} onChange={e => setMForm(p => ({...p, notes: e.target.value}))} />
            </div>
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => { setMemberModal(false); setEditingMember(null); setMForm({ name: '', type: 'internal', role: '', company: '', contractType: '월정액', monthlyRate: '', startDate: '', endDate: '', utilization: 100, notes: '' }); }}>취소</button>
            <button className={f.btnPrimary} onClick={handleMemberSave}>{editingMember ? '저장' : '추가'}</button>
          </div>
        </div>
      </Modal>


      {/* 이슈 수정 모달 */}
      <Modal open={!!editIssueModal} onClose={() => setEditIssueModal(null)} title="이슈 수정">
        <div className={f.form}>
          <div className={f.field}>
            <label className={f.label}>제목 *</label>
            <input className={f.input} value={eForm.title} onChange={e => setEForm(p => ({...p, title: e.target.value}))} autoFocus />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>상태</label>
              <select className={f.select} value={eForm.status} onChange={e => setEForm(p => ({...p, status: e.target.value as IssueStatus}))}>
                <option value="todo">할 일</option>
                <option value="in_progress">진행중</option>
                <option value="done">완료</option>
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>우선순위</label>
              <select className={f.select} value={eForm.priority} onChange={e => setEForm(p => ({...p, priority: e.target.value as Issue['priority']}))}>
                <option value="high">높음</option>
                <option value="medium">중간</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>마감일</label>
              <input className={f.input} type="date" value={eForm.dueDate} onChange={e => setEForm(p => ({...p, dueDate: e.target.value}))} />
            </div>
            <div className={f.field}>
              <label className={f.label}>담당자</label>
              <input className={f.input} placeholder="담당자 이름" value={eForm.assignee} onChange={e => setEForm(p => ({...p, assignee: e.target.value}))} />
            </div>
          </div>
          <div className={f.field}>
            <label className={f.label}>메모</label>
            <textarea className={f.textarea} rows={3} placeholder="메모를 입력하세요..." value={eForm.memo} onChange={e => setEForm(p => ({...p, memo: e.target.value}))} />
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => setEditIssueModal(null)}>취소</button>
            <button className={f.btnPrimary} onClick={async () => {
              if (!eForm.title.trim() || !editIssueModal) return;
              await updateIssue(editIssueModal.id, { title: eForm.title, status: eForm.status, priority: eForm.priority, dueDate: eForm.dueDate, assignee: eForm.assignee, memo: eForm.memo });
              setEditIssueModal(null);
            }}>저장</button>
          </div>
        </div>
      </Modal>
      {/* 이슈 추가 모달 */}
      <Modal open={issueModal} onClose={() => { setIssueModal(false); setIForm({ title: '', priority: 'medium', dueDate: '' }); }} title="이슈 추가">
        <div className={f.form}>
          <div className={f.field}>
            <label className={f.label}>이슈 제목 *</label>
            <input className={f.input} placeholder="예: API 연동 오류 수정" value={iForm.title}
              onChange={e => setIForm(p => ({...p, title: e.target.value}))}
              onKeyDown={e => { if (e.key === 'Enter') handleIssueAdd(); }} autoFocus />
          </div>
          <div className={f.row}>
            <div className={f.field}>
              <label className={f.label}>우선순위</label>
              <select className={f.select} value={iForm.priority} onChange={e => setIForm(p => ({...p, priority: e.target.value as 'low'|'medium'|'high'}))}>
                <option value="high">높음</option>
                <option value="medium">중간</option>
                <option value="low">낮음</option>
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>마감일</label>
              <input className={f.input} type="date" value={iForm.dueDate} onChange={e => setIForm(p => ({...p, dueDate: e.target.value}))} />
            </div>
          </div>
          <div className={f.actions}>
            <button className={f.btnSecondary} onClick={() => { setIssueModal(false); setIForm({ title: '', priority: 'medium', dueDate: '' }); }}>취소</button>
            <button className={f.btnPrimary} onClick={handleIssueAdd}>추가</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


// M/M 계산: 1일 = 0.05 M/M, 투입률 반영
function calcMM(startDate?: string, endDate?: string, utilization = 100): number | null {
  if (!startDate) return null;
  const end = endDate ? new Date(endDate + 'T00:00:00') : new Date();
  const start = new Date(startDate + 'T00:00:00');
  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  return Math.round(days * 0.05 * (utilization / 100) * 10) / 10;
}

function MemberCard({ member, onEdit, onDelete }: { member: ProjectMember; onEdit: () => void; onDelete: () => void }) {
  const today = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
  const isActive = !member.endDate || member.endDate >= today;

  return (
    <div className={`${styles.memberCard} ${!isActive ? styles.memberInactive : ''}`}>
      <div className={styles.memberLeft}>
        <div className={styles.memberAvatar}>{member.name[0]}</div>
        <div className={styles.memberInfo}>
          <div className={styles.memberName}>
            {member.name}
            {!isActive && <span className={styles.exitBadge}>철수</span>}
          </div>
          <div className={styles.memberMeta}>
            {member.role && <span>{member.role}</span>}
            {member.company && <span className={styles.companyTag}>🏢 {member.company}</span>}
            <span className={styles.utilTag}>{member.utilization}%</span>
          </div>
        </div>
      </div>
      <div className={styles.memberRight}>
        {(() => {
          const mm = calcMM(member.startDate, member.endDate, member.utilization);
          return mm !== null ? <div className={styles.mmBadge}>{mm} M/M</div> : null;
        })()}
        {member.monthlyRate && (
          <div className={styles.monthlyRate}>{(member.monthlyRate / 10000).toLocaleString()}만원/월</div>
        )}
        {member.contractType && <div className={styles.contractType}>{member.contractType}</div>}
        <div className={styles.memberDates}>
          {member.startDate && <span>▶ {member.startDate}</span>}
          {member.endDate && <span>◀ {member.endDate}</span>}
        </div>
        <div className={styles.memberActions}>
          <button className={styles.editBtn} onClick={onEdit}><Edit2 size={12} /></button>
          <button className={styles.deleteBtn} onClick={() => { if (confirm(`"${member.name}" 인력을 삭제할까요?`)) onDelete(); }}><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );
}
