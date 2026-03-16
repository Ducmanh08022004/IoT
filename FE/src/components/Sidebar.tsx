import { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type SidebarProps = {
  items: NavigationItem[];
};

export function Sidebar({ items }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="brand-mark">SM</div>
        <div>
          <p className="brand-title">Smart Home</p>
          <p className="brand-subtitle">Monitoring UI</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link'
            }
          >
            <Icon size={18} strokeWidth={2.4} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}