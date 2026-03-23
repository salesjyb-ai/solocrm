import { CheckSquare, TrendingUp, FolderKanban, Plus, ExternalLink, AlertCircle, Trophy, Target, Gavel, Clock, CalendarCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LeadStatusBadge } from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';
import styles from './Dashboard.module.css';


function formatKRW(val: number) {
  if (val >= 100000000) return `${(val / 100000000).toFixed(1)}억`;
  if (val >= 10000) return `${Math.round(val / 10000)}만`;
  return `${val.toLocaleString()}`;
}

export default function Dashboard() {
  const { tasks, leads, projects, bids, toggleTask } = useApp();
  const navigate = useNavigate();
  const today = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
  const week = new Date(new Date().getTime() + 9 * 60 * 60 * 1000 + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 할일
  const todayTasks = tasks.filter(t => t.dueDate && t.dueDate <= today && !t.done);
  const pendingCount = tasks.filter(t => !t.done).length;

  // 리드
  const activeLeads = leads.filter(l => l.status !== 'won' && l.status !== 'lost');
  const wonLeads = leads.filter(l => l.status === 'won');
  const totalPipelineValue = activeLeads.reduce((sum, l) => sum + l.value, 0);
  const wonValue = wonLeads.reduce((sum, l) => sum + l.value, 0);
  const winRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;

  // 입찰
  const activeBids = bids.filter(b => b.status === 'preparing' || b.status === 'active');
  const urgentBids = bids.filter(b =>
    (b.status === 'preparing' || b.status === 'active') &&
    b.deadline && b.deadline >= today && b.deadline <= week
  ).sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
  const wonBids = bids.filter(b => b.status === 'won');
  const wonBidValue = wonBids.reduce((sum, b) => sum + (b.amount || 0), 0);

  // 프로젝트
  const activeProjects = projects.filter(p => p.status === 'active');

  // 월별 차트
  const monthlyData = (() => {
    const months: { month: string; label: string; won: number; pipeline: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${d.getMonth() + 1}월`;
      const wonAmt = leads
        .filter(l => l.status === 'won' && l.updatedAt?.startsWith(key))
        .reduce((s, l) => s + l.value, 0);
      const pipelineAmt = leads
        .filter(l => l.createdAt?.startsWith(key))
        .reduce((s, l) => s + l.value, 0);
      months.push({ month: key, label, won: wonAmt, pipeline: pipelineAmt });
    }
    return months;
  })();

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipLabel}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {formatKRW(p.value)}원</p>
        ))}
      </div>
    );
  };

  const getDday = (deadline: string) => {
    const diff = Math.ceil((new Date(deadline + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000);
    if (diff === 0) return { label: 'D-day', urgent: true };
    if (diff > 0) return { label: `D-${diff}`, urgent: diff <= 3 };
    return { label: '종료', urgent: false };
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>대시보드</h1>
          <p className={styles.subtitle}>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
      </header>

      {/* KPI 카드 - 6개 */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><TrendingUp size={16} /></div>
          <div>
            <div className={styles.kpiNum}>{formatKRW(totalPipelineValue)}원</div>
            <div className={styles.kpiLabel}>파이프라인 총액</div>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'var(--status-won-bg)', color: 'var(--status-won)' }}><Trophy size={16} /></div>
          <div>
            <div className={styles.kpiNum}>{formatKRW(wonValue)}원</div>
            <div className={styles.kpiLabel}>리드 수주 완료</div>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'var(--status-contact-bg)', color: 'var(--status-contact)' }}><Target size={16} /></div>
          <div>
            <div className={styles.kpiNum}>{winRate}%</div>
            <div className={styles.kpiLabel}>수주율 ({wonLeads.length}/{leads.length})</div>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'var(--accent2-light)', color: 'var(--accent2)' }}><Gavel size={16} /></div>
          <div>
            <div className={styles.kpiNum}>{activeBids.length}건</div>
            <div className={styles.kpiLabel}>진행 중 입찰</div>
          </div>
        </div>
        <div className={styles.kpiCard} style={{ cursor: urgentBids.length > 0 ? 'pointer' : 'default' }} onClick={() => urgentBids.length > 0 && navigate('/bids')}>
          <div className={styles.kpiIcon} style={{ background: urgentBids.length > 0 ? 'var(--status-lost-bg)' : 'var(--bg-secondary)', color: urgentBids.length > 0 ? 'var(--status-lost)' : 'var(--text-muted)' }}><Clock size={16} /></div>
          <div>
            <div className={styles.kpiNum} style={{ color: urgentBids.length > 0 ? 'var(--status-lost)' : undefined }}>{urgentBids.length}건</div>
            <div className={styles.kpiLabel}>7일 내 마감 입찰</div>
          </div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: 'var(--status-won-bg)', color: 'var(--status-won)' }}><CalendarCheck size={16} /></div>
          <div>
            <div className={styles.kpiNum}>{formatKRW(wonBidValue)}원</div>
            <div className={styles.kpiLabel}>입찰 낙찰 총액</div>
          </div>
        </div>
      </div>

      {/* 차트 */}
      <div className={styles.chartRowSingle}>
        <div className={styles.chartCard}>
          <div className={styles.chartTitle}>월별 현황 (최근 6개월)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={formatKRW} width={48} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="pipeline" name="신규 리드" fill="var(--accent-muted)" radius={[4,4,0,0]} opacity={0.6} />
              <Bar dataKey="won" name="수주" fill="var(--accent)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4섹션 그리드 */}
      <div className={styles.grid}>

        {/* 오늘 처리할 일 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <CheckSquare size={15} />
              <span>오늘 처리할 일</span>
              <span className={styles.count}>{todayTasks.length}</span>
            </div>
            <button className={styles.link} onClick={() => navigate('/tasks')}>전체 {pendingCount}건 <ExternalLink size={12} /></button>
          </div>
          <div className={styles.taskList}>
            {todayTasks.length === 0 && <div className={styles.empty}>오늘 처리할 일이 없어요 🎉</div>}
            {todayTasks.slice(0, 6).map(task => (
              <div key={task.id} className={styles.taskItem} onClick={() => toggleTask(task.id)}>
                <div className={styles.taskCheck} />
                <div className={styles.taskInfo}>
                  <span className={styles.taskTitle}>{task.title}</span>
                  {task.linkedTo && <span className={styles.taskLink}>{task.linkedTo.type === 'lead' ? '🤝' : '📁'} {task.linkedTo.name}</span>}
                </div>
                {task.dueDate < today && <AlertCircle size={13} className={styles.overdue} />}
              </div>
            ))}
          </div>
        </section>

        {/* 진행 중인 딜 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <TrendingUp size={15} />
              <span>진행 중인 딜</span>
              <span className={styles.count}>{activeLeads.length}</span>
            </div>
            <button className={styles.link} onClick={() => navigate('/leads')}>전체 보기 <ExternalLink size={12} /></button>
          </div>
          <div className={styles.dealList}>
            {activeLeads.length === 0 && <div className={styles.empty}>진행 중인 딜이 없습니다</div>}
            {activeLeads.slice(0, 5).map(lead => (
              <div key={lead.id} className={styles.dealItem} onClick={() => navigate(`/leads/${lead.id}`)}>
                <div className={styles.dealLeft}>
                  <div className={styles.dealAvatar}>{lead.company[0]}</div>
                  <div className={styles.dealInfo}>
                    <span className={styles.dealName}>{lead.dealName || lead.company}</span>
                    <span className={styles.dealCompany}>{lead.company} · {lead.name}</span>
                  </div>
                </div>
                <div className={styles.dealRight}>
                  <LeadStatusBadge status={lead.status} />
                  <span className={styles.dealValue}>{formatKRW(lead.value)}원</span>
                </div>
              </div>
            ))}
          </div>
          <button className={styles.addBtn} onClick={() => navigate('/leads')}><Plus size={13} /> 새 리드 추가</button>
        </section>

        {/* 마감 임박 입찰 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <Gavel size={15} />
              <span>마감 임박 입찰</span>
              <span className={styles.count}>{urgentBids.length}</span>
            </div>
            <button className={styles.link} onClick={() => navigate('/bids')}>전체 {activeBids.length}건 <ExternalLink size={12} /></button>
          </div>
          <div className={styles.dealList}>
            {urgentBids.length === 0 && (
              <div className={styles.empty}>
                {activeBids.length > 0
                  ? `진행 중 ${activeBids.length}건, 이번 주 마감 없음`
                  : '진행 중인 입찰이 없습니다'}
              </div>
            )}
            {urgentBids.slice(0, 5).map(bid => {
              const dday = bid.deadline ? getDday(bid.deadline) : null;
              return (
                <div key={bid.id} className={styles.dealItem} onClick={() => navigate('/bids')}>
                  <div className={styles.dealLeft}>
                    <div className={styles.dealAvatar} style={{ background: 'var(--status-contact-bg)', color: 'var(--status-contact)', fontSize: 10, fontWeight: 700 }}>입찰</div>
                    <div className={styles.dealInfo}>
                      <span className={styles.dealName}>{bid.title}</span>
                      <span className={styles.dealCompany}>{bid.agency}</span>
                    </div>
                  </div>
                  <div className={styles.dealRight}>
                    {dday && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                        background: dday.urgent ? 'var(--status-lost-bg)' : 'var(--bg-secondary)',
                        color: dday.urgent ? 'var(--status-lost)' : 'var(--text-secondary)',
                      }}>{dday.label}</span>
                    )}
                    {bid.amount && <span className={styles.dealValue}>{formatKRW(bid.amount)}원</span>}
                  </div>
                </div>
              );
            })}
            {/* 마감임박 없을 때 전체 진행중 입찰 미리보기 */}
            {urgentBids.length === 0 && activeBids.slice(0, 3).map(bid => (
              <div key={bid.id} className={styles.dealItem} onClick={() => navigate('/bids')}>
                <div className={styles.dealLeft}>
                  <div className={styles.dealAvatar} style={{ background: 'var(--status-contact-bg)', color: 'var(--status-contact)', fontSize: 10, fontWeight: 700 }}>입찰</div>
                  <div className={styles.dealInfo}>
                    <span className={styles.dealName}>{bid.title}</span>
                    <span className={styles.dealCompany}>{bid.agency}</span>
                  </div>
                </div>
                <div className={styles.dealRight}>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {bid.status === 'preparing' ? '준비중' : '진행중'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className={styles.addBtn} onClick={() => navigate('/bids')}><Plus size={13} /> 입찰 추가</button>
        </section>

        {/* 진행 중 프로젝트 */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <FolderKanban size={15} />
              <span>진행 중 프로젝트</span>
              <span className={styles.count}>{activeProjects.length}</span>
            </div>
            <button className={styles.link} onClick={() => navigate('/projects')}>전체 보기 <ExternalLink size={12} /></button>
          </div>
          <div className={styles.projectList}>
            {activeProjects.length === 0 && <div className={styles.empty}>진행 중인 프로젝트가 없습니다</div>}
            {activeProjects.map(project => {
              const done = project.issues.filter(i => i.status === 'done').length;
              const total = project.issues.length;
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <div key={project.id} className={styles.projectItem} onClick={() => navigate(`/projects/${project.id}`)}>
                  <div className={styles.projectHeader}>
                    <div className={styles.projectDot} style={{ background: project.color }} />
                    <span className={styles.projectName}>{project.name}</span>
                    <span className={styles.projectProgress}>{done}/{total}</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${pct}%`, background: project.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
