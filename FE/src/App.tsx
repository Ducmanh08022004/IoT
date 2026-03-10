import { AirVent, ClipboardList, LayoutDashboard, UserRound } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ActionHistoryPage } from './pages/ActionHistoryPage';
import { DashboardPage } from './pages/DashboardPage';
import { DataSensorPage } from './pages/DataSensorPage';
import { ProfilePage } from './pages/ProfilePage';

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/data-sensor', label: 'Data Sensor', icon: AirVent },
  { to: '/action-history', label: 'Action History', icon: ClipboardList },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

function App() {
  return (
    <div className="shell">
      <Sidebar items={navigationItems} />
      <main className="content-shell">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/data-sensor" element={<DataSensorPage />} />
          <Route path="/action-history" element={<ActionHistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;