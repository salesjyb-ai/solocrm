import { type ReactNode, useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FolderKanban, CheckSquare, Kanban, Sun, Moon, Zap, LogOut, UserCheck, ClipboardList, BarChart2, BotMessageSquare, Building2, Swords, ScrollText, NotebookPen, GripVertical } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Toast from './Toast';
import { supabase } from '../supabase';
import styles from './Layout.module.css';

const DEFAULT_NAV = [
  { path: '/',            label: '대시보드',    icon: 'LayoutDashboard' },
  { path: '/leads',       label: '리드 & 딜',   icon: 'Users' },
  { path: '/customers',   label: '고객사',      icon: 'Building2' },
  { path: '/competitors', label: '경쟁사',      icon: 'Swords' },
  { path: '/contracts',   label: '계약 관리',   icon: 'ScrollText' },
  { path: '/notes',       label: '메모장',      icon: 'NotebookPen' },
  { path: '/projects',    label: '프로젝트',    icon: 'FolderKanban' },
  { path: '/tasks',       label: '할 일',       icon: 'CheckSquare' },
  { path: '/kanban',      label: '칸반',        icon: 'Kanban' },
  { path: '/boss',        label: '대표님 관리', icon: 'UserCheck' },
];

const NAV_EXTRA = [
  { path: '/bids',   label: '입찰 트래커',   icon: 'ClipboardList' },
  { path: '/weekly', label: '주간 리포트',   icon: 'BarChart2' },
  { path: '/ai',     label: 'AI 어시스턴트', icon: 'BotMessageSquare' },
];

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Building2, Swords, ScrollText, NotebookPen,
  FolderKanban, CheckSquare, Kanban, UserCheck, ClipboardList, BarChart2, BotMessageSquare,
};

function mergeOrder(saved: string[]): string[] {
  const all = DEFAULT_NAV.map(n => n.path);
  const valid = saved.filter(p => all.includes(p));
  const missing = all.filter(p => !valid.includes(p));
  return [...valid, ...missing];
}

export default function Layout({ children }: { children: ReactNode }) {
  const { theme, toggleTheme, signOut, toasts, removeToast, session } = useApp();
  const [order, setOrder] = useState<string[]>(DEFAULT_NAV.map(n => n.path));
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 로그인 후 서버에서 순서 불러오기
  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('crm_user_settings')
      .select('nav_order')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.nav_order?.length) {
          setOrder(mergeOrder(data.nav_order));
        }
      });
  }, [session?.user?.id]);

  // 순서 변경 시 Supabase에 저장 (debounce 500ms)
  const saveToServer = (newOrder: string[]) => {
    if (!session?.user?.id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase
        .from('crm_user_settings')
        .upsert({ user_id: session.user.id, nav_order: newOrder, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    }, 500);
  };

  const sortedNav = order
    .map(path => DEFAULT_NAV.find(n => n.path === path))
    .filter(Boolean) as typeof DEFAULT_NAV;

  const handleDragStart = (path: string, el: HTMLDivElement) => {
    setDraggingPath(path);
    dragNode.current = el;
    setTimeout(() => { if (dragNode.current) dragNode.current.style.opacity = '0.4'; }, 0);
  };

  const handleDragEnd = () => {
    if (dragNode.current) dragNode.current.style.opacity = '1';
    setDraggingPath(null);
    setDragOverPath(null);
    dragNode.current = null;
  };

  const handleDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault();
    if (path !== draggingPath) setDragOverPath(path);
  };

  const handleDrop = (targetPath: string) => {
    if (!draggingPath || draggingPath === targetPath) return;
    const newOrder = [...order];
    const fromIdx = newOrder.indexOf(draggingPath);
    const toIdx = newOrder.indexOf(targetPath);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, draggingPath);
    setOrder(newOrder);
    saveToServer(newOrder);
    setDragOverPath(null);
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <Zap size={18} strokeWidth={2.5} />
          <span>SoloCRM</span>
        </div>

        <nav className={styles.nav}>
          {sortedNav.map(({ path, label, icon }) => {
            const Icon = ICON_MAP[icon];
            const isDragging = draggingPath === path;
            const isDragOver = dragOverPath === path;
            return (
              <div
                key={path}
                className={`${styles.navRow} ${isDragOver ? styles.navRowDragOver : ''}`}
                draggable
                onDragStart={e => handleDragStart(path, e.currentTarget as HTMLDivElement)}
                onDragEnd={handleDragEnd}
                onDragOver={e => handleDragOver(e, path)}
                onDrop={() => handleDrop(path)}
                onDragLeave={() => setDragOverPath(null)}
                style={{ opacity: isDragging ? 0.4 : 1 }}
              >
                <GripVertical size={13} className={styles.grip} />
                <NavLink
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className={styles.divider} />

        <nav className={styles.nav}>
          {NAV_EXTRA.map(({ path, label, icon }) => {
            const Icon = ICON_MAP[icon];
            return (
              <NavLink
                key={path}
                to={path}
                end
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            );
          })}
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
