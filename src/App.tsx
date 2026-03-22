import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import Kanban from './pages/Kanban';
import Boss from './pages/Boss';
import Bids from './pages/Bids';
import WeeklyReport from './pages/WeeklyReport';
import AiAssistant from './pages/AiAssistant';
import ProjectDetail from './pages/ProjectDetail';
import Customers from './pages/Customers';
import Competitors from './pages/Competitors';
import Contracts from './pages/Contracts';
import './index.css';

function AppRoutes() {
  const { session, loading } = useApp();

  if (loading) return <LoadingSpinner />;
  if (!session) return <Login />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/leads/:id" element={<LeadDetail />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/competitors" element={<Competitors />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/kanban" element={<Kanban />} />
        <Route path="/boss" element={<Boss />} />
        <Route path="/bids" element={<Bids />} />
        <Route path="/weekly" element={<WeeklyReport />} />
        <Route path="/ai" element={<AiAssistant />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}
