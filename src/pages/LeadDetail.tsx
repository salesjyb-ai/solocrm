import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Edit2, Check, X, Plus, FileText, PhoneCall, AtSign, Users, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LeadStatusSelect } from '../components/StatusBadge';
import type { LeadStatus, ActivityType } from '../types';
import f from './FormField.module.css';
import styles from './LeadDetail.module.css';

const activityTypeInfo: Record<ActivityType, { label: string; icon: typeof FileText; color: string }> = {
  note:          { label: '메모',      icon: FileText,   color: 'var(--text-muted)' },
  call:          { label: '전화',      icon: PhoneCall,  color: 'var(--status-contact)' },
  email:         { label: '이메일',    icon: AtSign,     color: 'var(--accent)' },
  meeting:       { label: '미팅',      icon: Users,      color: 'var(--status-proposal)' },
  status_change: { label: '상태변경',  icon: TrendingUp, color: 'var(--accent2)' },
};

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { leads, updateLead, updateLeadStatus, addActivity, getLeadActivities } = useApp();
  const lead = leads.find(l => l.id === id);

  const [editField, setEditField] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [actType, setActType] = useState<ActivityType>('note');
  const [actContent, setActContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [notesVal, setNotesVal] = useState(lead?.notes || '');

  // lead.notes가 외부(Realtime/fullSync)로 바뀌면 textarea에 반영
  useEffect(() => { setNotesVal(lead?.notes || ''); }, [lead?.notes]);

  if (!lead) return (
    <div className={styles.notFound}>
      <p>리드를 찾을 수 없습니다.</p>
      <button onClick={() => navigate('/leads')} className={styles.backBtn}><ArrowLeft size={14} /> 목록으로</button>
    </div>
  );

  const activities = getLeadActivities(lead.id);

  const startEdit = (field: string, val: string) => { setEditField(field); setEditVal(val); };
  const cancelEdit = () => setEditField(null);

  const saveEdit = async () => {
    if (!editField) return;
    const map: Record<string, keyof typeof lead> = {
      name: 'name', company: 'company', contact: 'contact', phone: 'phone',
      value: 'value', nextAction: 'nextAction', nextActionDate: 'nextActionDate',
    };
    const key = map[editField];
    if (!key) return;
    const val = editField === 'value' ? Number(editVal.replace(/,/g, '')) : editVal;
    await updateLead(lead.id, { [key]: val } as Parameters<typeof updateLead>[1]);
    setEditField(null);
  };

  const saveNotes = async (val: string) => {
    await updateLead(lead.id, { notes: val });
  };

  const handleStatusChange = async (status: LeadStatus) => {
    await updateLeadStatus(lead.id, status, lead.status);
  };

  const handleAddActivity = async () => {
    if (!actContent.trim()) return;
    setSaving(true);
    await addActivity(lead.id, actType, actContent.trim());
    setActContent('');
    setSaving(false);
  };

  const EditableField = ({ field, label, value, type = 'text' }: { field: string; label: string; value: string; type?: string }) => {
    const isValue = field === 'value';
    const displayValue = isValue && value ? Number(value).toLocaleString('ko-KR') : value;
    const inputValue = isValue ? editVal.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',') : editVal;
    return (
      <div className={styles.infoRow}>
        <span className={styles.infoLabel}>{label}</span>
        {editField === field ? (
          <div className={styles.inlineEdit}>
            <input
              className={f.input}
              type={isValue ? 'text' : type}
              inputMode={isValue ? 'numeric' : undefined}
              value={isValue ? inputValue : editVal}
              onChange={e => {
                if (isValue) {
                  setEditVal(e.target.value.replace(/,/g, '').replace(/[^0-9]/g, ''));
                } else {
                  setEditVal(e.target.value);
                }
              }}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              autoFocus
            />
            <button className={styles.iconBtn} onClick={saveEdit}><Check size={13} /></button>
            <button className={styles.iconBtn} onClick={cancelEdit}><X size={13} /></button>
          </div>
        ) : (
          <div className={styles.infoValue} onClick={() => startEdit(field, value)}>
            <span>{displayValue || <span className={styles.empty}>-</span>}</span>
            <Edit2 size={11} className={styles.editIcon} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/leads')}>
          <ArrowLeft size={14} /> 리드 목록
        </button>
      </div>

      <div className={styles.grid}>
        {/* Left: 기본 정보 */}
        <div className={styles.left}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.avatar}>{lead.company[0]}</div>
              <div>
                <h2 className={styles.leadName}>{lead.name}</h2>
                <p className={styles.leadCompany}>{lead.company}</p>
              </div>
              <div className={styles.statusWrap}>
                <LeadStatusSelect value={lead.status} onChange={handleStatusChange} />
              </div>
            </div>

            <div className={styles.infoGrid}>
              <EditableField field="name" label="담당자" value={lead.name} />
              <EditableField field="company" label="회사" value={lead.company} />
              <EditableField field="contact" label="이메일" value={lead.contact || ''} />
              <EditableField field="phone" label="휴대폰" value={lead.phone || ''} />
              <EditableField field="value" label="딜 금액" value={String(lead.value)} type="number" />
              <EditableField field="nextAction" label="다음 액션" value={lead.nextAction || ''} />
              <EditableField field="nextActionDate" label="예정일" value={lead.nextActionDate || ''} type="date" />
            </div>

            {(lead.phone || lead.contact) && (
              <div className={styles.contactBtns}>
                {lead.phone && <a href={`tel:${lead.phone}`} className={styles.contactBtn}><Phone size={13} /> 전화</a>}
                {lead.contact && <a href={`mailto:${lead.contact}`} className={styles.contactBtn}><Mail size={13} /> 이메일</a>}
              </div>
            )}
          </div>

          {/* 메모 */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>메모</h3>
            <textarea
              className={styles.notesArea}
              placeholder="리드에 대한 메모를 자유롭게 작성하세요..."
              value={notesVal}
              onChange={e => setNotesVal(e.target.value)}
              onBlur={() => saveNotes(notesVal)}
            />
            <p className={styles.notesHint}>포커스 해제 시 자동 저장</p>
          </div>
        </div>

        {/* Right: 활동 로그 */}
        <div className={styles.right}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>활동 로그</h3>

            {/* 활동 추가 */}
            <div className={styles.activityForm}>
              <div className={styles.typeRow}>
                {(Object.keys(activityTypeInfo) as ActivityType[]).filter(t => t !== 'status_change').map(t => {
                  const { label, icon: Icon } = activityTypeInfo[t];
                  return (
                    <button key={t} className={`${styles.typeBtn} ${actType === t ? styles.typeBtnActive : ''}`} onClick={() => setActType(t)}>
                      <Icon size={12} /> {label}
                    </button>
                  );
                })}
              </div>
              <textarea
                className={styles.actInput}
                placeholder={`${activityTypeInfo[actType].label} 내용 입력...`}
                value={actContent}
                onChange={e => setActContent(e.target.value)}
                rows={2}
              />
              <button className={styles.actSubmit} onClick={handleAddActivity} disabled={saving || !actContent.trim()}>
                <Plus size={13} /> 추가
              </button>
            </div>

            {/* 활동 목록 */}
            <div className={styles.activityList}>
              {activities.length === 0 && <p className={styles.emptyLog}>아직 활동 기록이 없습니다.</p>}
              {activities.map(act => {
                const { label, icon: Icon, color } = activityTypeInfo[act.type];
                const date = new Date(act.createdAt);
                const dateStr = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
                const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={act.id} className={styles.actItem}>
                    <div className={styles.actIcon} style={{ color, background: `${color}1a` }}>
                      <Icon size={12} />
                    </div>
                    <div className={styles.actBody}>
                      <div className={styles.actMeta}>
                        <span className={styles.actType} style={{ color }}>{label}</span>
                        <span className={styles.actDate}>{dateStr} {timeStr}</span>
                      </div>
                      <p className={styles.actContent}>{act.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
