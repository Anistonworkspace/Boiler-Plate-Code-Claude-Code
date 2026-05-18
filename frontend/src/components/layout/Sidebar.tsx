import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, Briefcase, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/departments', label: 'Departments', icon: Building2 },
  { to: '/designations', label: 'Designations', icon: Briefcase },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar(): JSX.Element {
  return (
    <aside className="hidden lg:flex w-60 flex-col gap-1 p-4 glass-panel m-3 mr-0">
      <div className="px-3 py-4 font-heading text-lg text-brand-700">Boilerplate</div>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
              isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white/60',
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </aside>
  );
}
