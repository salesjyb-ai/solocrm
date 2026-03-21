import { useState, useMemo } from 'react';
import { Building2, Search, TrendingUp, Gavel, CheckSquare, Clock, ChevronDown, ChevronRight, ExternalLink, Phone, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LeadStatusBadge } from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import styles from './Customers.module.css';

function formatKRW(val: number) {
  if (val >= 100000000) return `${(val / 100000000).toFixed(1)}억`;
  if (val >= 10000) return `${Math.round(val / 10000)}만`;
  return `${val.toLocaleString()}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const ACTIVITY_LABEL: Record<string, string> = {
  note: '메모', call: '전화', email: '이메일', meeting: '미팅', status_change: '상태변경',
};
const ACTIVITY_COLOR: Record<string, string> = {
  note: 'var(--text-muted)', call: 'var(--status-contact)', email: 'var(--accent)',
  meeting: 'var(--status-won)', status_change: 'var(--text-secondary)',
};

export default function Customers() {
  const { leads, bids, tasks, activities } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  // 고객사 목록: leads.company + bids.agency를 합쳐서 중복 제거
  const customers = useMemo(() => {
    const map = new Map<string, {
      name: string;
      leads: typeof leads;
      bids: typeof bids;
      tasks: typeof tasks;
      activities: typeof activities;
      totalValue: number;
      wonValue: number;
      lastContact: string;
    }>();

    // 리드에서 고객사 수집
    leads.forEach(lead => {
      const key = lead.company.trim();
      if (!map.has(key)) map.set(key, { name: key, leads: [], bids: [], tasks: [], activities: [], totalValue: 0, wonValue: 0, lastContact: '' });
      const c = map.get(key)!;
      c.leads.push(lead);
      c.totalValue += lead.value;
      if (lead.status === 'won') c.wonValue += lead.value;
      if (!c.lastContact || lead.updatedAt > c.lastContact) c.lastContact = lead.updatedAt;
    });

    // 입찰에서 고객사 수집
    bids.forEach(bid => {
      const key = bid.agency.trim();
      if (!map.has(key)) map.set(key, { name: key, leads: [], bids: [], tasks: [], activities: [], totalValue: 0, wonValue: 0, lastContact: '' });
      const c = map.get(key)!;
      c.bids.push(bid);
      if (bid.amount && bid.status === 'won') c.wonValue += bid.amount;
      if (!c.lastContact || bid.updatedAt > c.lastContact) c.lastContact = bid.updatedAt;
    });

    // 활동 이력 연결 (리드 → 회사)
    activities.forEach(act => {
      const lead = leads.find(l => l.id === act.leadId);
      if (!lead) return;
      const key = lead.company.trim();
      if (map.has(key)) map.get(key)!.activities.push(act);
    });

    // 할일 연결 (linked lead → 회사)
    tasks.forEach(task => {
      if (!task.linkedTo || task.linkedTo.type !== 'lead') return;
      const lead = leads.find(l => l.id === task.linkedTo!.id);
      if (!lead) return;
      const key = lead.company.trim();
      if (map.has(key)) map.get(key)!.tasks.push(task);
    });

    return Array.from(map.values())
      .filter(c => c.name.toLowerCase().includes(search.toLowerCase().trim()))
      .sort((a, b) => {
        // 최근 접촉일 내림차순
        if (b.lastContact && a.lastContact) return b.lastContact.localeCompare(a.lastContact);
        return a.name.localeCompare(b.name, 'ko');
      });
  }, [leads, bids, tasks, activities, search]);

  const toggle = (name: string) => setExpanded(prev => prev === name ? null : name);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>고객사</h1>
          <p className={styles.subtitle}>총 {customers.length}개 고객사 · 리드/입찰/활동 통합 뷰</p>
        </div>
      </div>

      {/* 검색 */}
      <div className={styles.searchWrap}>
        <Search size={14} className={styles.searchIcon} />
        <input
          className={styles.search}
          placeholder="고객사명 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* 고객사 목록 */}
      <div className={styles.list}>
        {customers.length === 0 && (
          <div className={styles.empty}>
            {search ? `"${search}" 검색 결과가 없습니다` : '등록된 고객사가 없습니다. 리드나 입찰을 먼저 추가해보세요.'}
          </div>
        )}
        {customers.map(c => {
          const isOpen = expanded === c.name;
          const activeBids = c.bids.filter(b => b.status === 'preparing' || b.status === 'active');
          const pendingTasks = c.tasks.filter(t => !t.done);
          const activeLeads = c.leads.filter(l => l.status !== 'won' && l.status !== 'lost');

          return (
            <div key={c.name} className={`${styles.card} ${isOpen ? styles.cardOpen : ''}`}>
              {/* 헤더 행 */}
              <div className={styles.cardHeader} onClick={() => toggle(c.name)}>
                <div className={styles.avatar}>{c.name[0]}</div>
                <div className={styles.nameBlock}>
                  <span className={styles.companyName}>{c.name}</span>
                  {c.lastContact && (
                    <span className={styles.lastContact}>최근 {formatDateTime(c.lastContact)}</span>
                  )}
                </div>
                {/* 요약 배지들 */}
                <div className={styles.badges}>
                  {activeLeads.length > 0 && (
                    <span className={styles.badge} style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                      <TrendingUp size={10} /> 딜 {activeLeads.length}
                    </span>
                  )}
                  {activeBids.length > 0 && (
                    <span className={styles.badge} style={{ background: 'var(--status-contact-bg)', color: 'var(--status-contact)' }}>
                      <Gavel size={10} /> 입찰 {activeBids.length}
                    </span>
                  )}
                  {pendingTasks.length > 0 && (
                    <span className={styles.badge} style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      <CheckSquare size={10} /> 할일 {pendingTasks.length}
                    </span>
                  )}
                  {c.wonValue > 0 && (
                    <span className={styles.badge} style={{ background: 'var(--status-won-bg)', color: 'var(--status-won)' }}>
                      수주 {formatKRW(c.wonValue)}
                    </span>
                  )}
                </div>
                <button className={styles.toggle}>{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
              </div>

              {/* 펼쳐진 상세 */}
              {isOpen && (
                <div className={styles.detail}>

                  {/* 리드/딜 */}
                  {c.leads.length > 0 && (
                    <section className={styles.section}>
                      <div className={styles.sectionTitle}>
                        <TrendingUp size={13} /> 리드 / 딜
                        <span className={styles.sectionCount}>{c.leads.length}</span>
                      </div>
                      <div className={styles.itemList}>
                        {c.leads.map(lead => (
                          <div key={lead.id} className={styles.leadItem} onClick={() => navigate(`/leads/${lead.id}`)}>
                            <div className={styles.itemLeft}>
                              <span className={styles.itemTitle}>{lead.dealName || lead.name}</span>
                              {lead.dealName && <span className={styles.itemSub}>{lead.name}</span>}
                            </div>
                            <div className={styles.itemRight}>
                              <LeadStatusBadge status={lead.status} />
                              {lead.value > 0 && <span className={styles.itemValue}>{formatKRW(lead.value)}원</span>}
                              {lead.nextActionDate && (
                                <span className={styles.itemDate}><Clock size={10} /> {lead.nextActionDate}</span>
                              )}
                              <ExternalLink size={11} className={styles.extIcon} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 입찰 */}
                  {c.bids.length > 0 && (
                    <section className={styles.section}>
                      <div className={styles.sectionTitle}>
                        <Gavel size={13} /> 입찰
                        <span className={styles.sectionCount}>{c.bids.length}</span>
                      </div>
                      <div className={styles.itemList}>
                        {c.bids.map(bid => (
                          <div key={bid.id} className={styles.leadItem} onClick={() => navigate('/bids')}>
                            <div className={styles.itemLeft}>
                              <span className={styles.itemTitle}>{bid.title}</span>
                              {bid.bidNo && <span className={styles.itemSub}>{bid.bidNo}</span>}
                            </div>
                            <div className={styles.itemRight}>
                              <span className={styles.statusChip} style={{
                                background: bid.status === 'won' ? 'var(--status-won-bg)' : bid.status === 'lost' ? 'var(--status-lost-bg)' : 'var(--status-contact-bg)',
                                color: bid.status === 'won' ? 'var(--status-won)' : bid.status === 'lost' ? 'var(--status-lost)' : 'var(--status-contact)',
                              }}>
                                {bid.status === 'preparing' ? '준비중' : bid.status === 'active' ? '진행중' : bid.status === 'won' ? '낙찰' : '탈락'}
                              </span>
                              {bid.amount && <span className={styles.itemValue}>{formatKRW(bid.amount)}원</span>}
                              {bid.deadline && <span className={styles.itemDate}><Clock size={10} /> {bid.deadline}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 할일 */}
                  {c.tasks.length > 0 && (
                    <section className={styles.section}>
                      <div className={styles.sectionTitle}>
                        <CheckSquare size={13} /> 할 일
                        <span className={styles.sectionCount}>{c.tasks.length}</span>
                        {pendingTasks.length > 0 && <span className={styles.sectionBadge}>미완료 {pendingTasks.length}</span>}
                      </div>
                      <div className={styles.itemList}>
                        {c.tasks.sort((a, b) => Number(a.done) - Number(b.done)).map(task => (
                          <div key={task.id} className={`${styles.taskItem} ${task.done ? styles.taskDone : ''}`} onClick={() => navigate('/tasks')}>
                            <div className={`${styles.taskCheck} ${task.done ? styles.taskChecked : ''}`} />
                            <span className={styles.itemTitle}>{task.title}</span>
                            {task.dueDate && <span className={styles.itemDate}>{formatDate(task.dueDate)}</span>}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* 활동 이력 타임라인 */}
                  {c.activities.length > 0 && (
                    <section className={styles.section}>
                      <div className={styles.sectionTitle}>
                        <Clock size={13} /> 활동 이력
                        <span className={styles.sectionCount}>{c.activities.length}</span>
                      </div>
                      <div className={styles.timeline}>
                        {c.activities
                          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                          .slice(0, 10)
                          .map(act => (
                            <div key={act.id} className={styles.timelineItem}>
                              <div className={styles.timelineDot} style={{ background: ACTIVITY_COLOR[act.type] }} />
                              <div className={styles.timelineBody}>
                                <span className={styles.timelineType} style={{ color: ACTIVITY_COLOR[act.type] }}>
                                  {ACTIVITY_LABEL[act.type]}
                                </span>
                                <span className={styles.timelineContent}>{act.content}</span>
                                <span className={styles.timelineDate}>{formatDateTime(act.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </section>
                  )}

                  {/* 연락처 정보 (리드에서 수집) */}
                  {c.leads.some(l => l.contact || l.phone) && (
                    <section className={styles.section}>
                      <div className={styles.sectionTitle}>
                        <Building2 size={13} /> 연락처
                      </div>
                      <div className={styles.contactList}>
                        {c.leads.filter(l => l.contact || l.phone).map(lead => (
                          <div key={lead.id} className={styles.contactItem}>
                            <span className={styles.contactName}>{lead.name}</span>
                            {lead.phone && <a href={`tel:${lead.phone}`} className={styles.contactLink}><Phone size={11} /> {lead.phone}</a>}
                            {lead.contact && <a href={`mailto:${lead.contact}`} className={styles.contactLink}><Mail size={11} /> {lead.contact}</a>}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {c.leads.length === 0 && c.bids.length === 0 && c.activities.length === 0 && (
                    <div className={styles.emptyDetail}>연결된 데이터가 없습니다.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
