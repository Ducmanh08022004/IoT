import { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

type NavigationItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type UiTheme = 'aurora' | 'sunset' | 'graphite';

type SidebarProps = {
  items: NavigationItem[];
  theme: UiTheme;
  onThemeChange: (theme: UiTheme) => void;
};

const themeOptions: Array<{ value: UiTheme; label: string }> = [
  { value: 'aurora', label: 'Ocean' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'graphite', label: 'Graphite' },
];

export function Sidebar({ items, theme, onThemeChange }: SidebarProps) {
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

      <div className="theme-switch">
        <p className="theme-switch__label">Theme</p>
        <div className="theme-switch__list">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onThemeChange(option.value)}
              className={
                option.value === theme
                  ? 'theme-switch__option theme-switch__option--active'
                  : 'theme-switch__option'
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}