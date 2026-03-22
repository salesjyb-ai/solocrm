import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, CheckSquare, Kanban, Sun, Moon, Zap, LogOut, UserCheck, ClipboardList, BarChart2, BotMessageSquare, Building2, Swords, ScrollText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Toast from './Toast';
import styles from './Layout.module.css';

const nav = [
  { path: '/', label: '대시보드', icon: LayoutDashboard },
  { path: '/leads', label: '리드 & 딜', icon: Users },
  { path: '/customers', label: '고객사', icon: Building2 },
  { path: '/competitors', label: '경쟁사', icon: Swords },
  { path: '/contracts', label: '계약 관리', icon: ScrollText },
  { path: '/projects', label: '프로젝트', icon: FolderKanban },
  { path: '/tasks', label: '할 일', icon: CheckSquare },
  { path: '/kanban', label: '칸반', icon: Kanban },
  { path: '/boss', label: '상무님 관리', icon: UserCheck },
];
const navExtra = [
  { path: '/bids', label: '입찰 트래커', icon: ClipboardList },
  { path: '/weekly', label: '주간 리포트', icon: BarChart2 },
  { path: '/ai', label: 'AI 어시스턴트', icon: BotMessageSquare },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme, signOut, toasts, removeToast } = useApp();
  
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Zap size={18} strokeWidth={2.5} />
          <span>SoloCRM</span>
        </div>
        <nav className={styles.nav}>
          {nav.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ height: '0.5px', background: 'var(--border)', margin: '4px 12px' }} />
        <nav className={styles.nav}>
          {navExtra.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button className={styles.signOutBtn} onClick={signOut}>
          <LogOut size={15} />
          <span>로그아웃</span>
        </button>
        <button className={styles.themeBtn} onClick={toggleTheme} title="테마 전환">
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          <span>{theme === 'light' ? '다크 모드' : '라이트 모드'}</span>
        </button>
      </aside>
      <main className={styles.main}>
        {children}
      </main>
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
