import { CheckSquare, TrendingUp, FolderKanban, Plus, Check, ExternalLink, AlertCircle, Trophy, Target, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LeadStatusBadge, IssueStatusBadge } from '../components/StatusBadge';
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
  const { tasks, leads, projects, toggleTask } = useApp();
  const navigate = useNavigate();
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })).toISOString().split('T')[0];

  const todayTasks = tasks.filter(t => t.dueDate && t.dueDate <= today).sort((a, b) => Number(a.done) - Number(b.done));
  const activeLeads = leads.filter(l => l.status !== 'won' && l.status !== 'lost');
  const activeProjects = projects.filter(p => p.status === 'active');
  const totalPipelineValue = activeLeads.reduce((sum, l) => sum + l.value, 0);
  const wonLeads = leads.filter(l => l.status === 'won');
  const wonValue = wonLeads.reduce((sum, l) => sum + l.value, 0);
  const winRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;

  // 월별 수주 추이 (최근 6개월, 바 차트)
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>대시보드</h1>
          <p className={styles.subtitle}>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
      </header>

      {/* KPI 카드 */}
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
            <div className={styles.kpiLabel}>수주 완료</div>
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
          <div className={styles.kpiIcon} style={{ background: 'var(--accent2-light)', color: 'var(--accent2)' }}><Activity size={16} /></div>
          <div>
            <div className={styles.kpiNum}>{activeLeads.length}건</div>
            <div className={styles.kpiLabel}>진행 중 딜</div>
          </div>
        </div>
      </div>

      {/* 차트 행 */}
      <div className={styles.chartRowSingle}>
        {/* 월별 파이프라인 바 차트 */}
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

      {/* 3섹션 */}
      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <CheckSquare size={15} />
              <span>오늘 처리할 일</span>
              <span className={styles.count}>{todayTasks.filter(t => !t.done).length}</span>
            </div>
            <button className={styles.link} onClick={() => navigate('/tasks')}>전체 보기 <ExternalLink size={12} /></button>
          </div>
          <div className={styles.taskList}>
            {todayTasks.length === 0 && <div className={styles.empty}>오늘 할 일이 없습니다</div>}
            {todayTasks.map(task => (
              <div key={task.id} className={`${styles.taskItem} ${task.done ? styles.taskDone : ''}`} onClick={() => toggleTask(task.id)}>
                <div className={styles.taskCheck}>{task.done ? <Check size={12} strokeWidth={3} /> : null}</div>
                <div className={styles.taskInfo}>
                  <span className={styles.taskTitle}>{task.title}</span>
                  {task.linkedTo && <span className={styles.taskLink}>{task.linkedTo.type === 'lead' ? '🤝' : '📁'} {task.linkedTo.name}</span>}
                </div>
                {task.dueDate < today && !task.done && <AlertCircle size={13} className={styles.overdue} />}
              </div>
            ))}
          </div>
        </section>

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
            {activeLeads.slice(0, 5).map(lead => (
              <div key={lead.id} className={styles.dealItem} onClick={() => navigate(`/leads/${lead.id}`)}>
                <div className={styles.dealLeft}>
                  <div className={styles.dealAvatar}>{lead.company[0]}</div>
                  <div className={styles.dealInfo}>
                    <span className={styles.dealName}>{lead.name}</span>
                    <span className={styles.dealCompany}>{lead.company}</span>
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
                  <div className={styles.issuePreview}>
                    {project.issues.filter(i => i.status !== 'done').slice(0, 2).map(issue => (
                      <div key={issue.id} className={styles.issueChip}>
                        <IssueStatusBadge status={issue.status} />
                        <span>{issue.title}</span>
                      </div>
                    ))}
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
