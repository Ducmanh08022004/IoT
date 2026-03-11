import { lazy, Suspense, useEffect, useState } from 'react';
import { AirVent, ClipboardList, LayoutDashboard, UserRound } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const DataSensorPage = lazy(() => import('./pages/DataSensorPage').then((module) => ({ default: module.DataSensorPage })));
const ActionHistoryPage = lazy(() => import('./pages/ActionHistoryPage').then((module) => ({ default: module.ActionHistoryPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));

type UiTheme = 'aurora' | 'sunset' | 'graphite';

const THEME_KEY = 'iot-ui-theme';

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/data-sensor', label: 'Data Sensor', icon: AirVent },
  { to: '/action-history', label: 'Action History', icon: ClipboardList },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

function App() {
  const [theme, setTheme] = useState<UiTheme>(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === 'sunset' || stored === 'graphite' ? stored : 'aurora';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <div className="shell">
      <Sidebar items={navigationItems} theme={theme} onThemeChange={setTheme} />
      <main className="content-shell">
        <Suspense fallback={<section className="page page--loading">Loading page...</section>}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/data-sensor" element={<DataSensorPage />} />
            <Route path="/action-history" element={<ActionHistoryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;