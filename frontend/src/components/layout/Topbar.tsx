import { useAppDispatch, useAppSelector } from '@/hooks/useAuth';
import { clearCredentials } from '@/features/auth/authSlice';
import { LogOut, Bell } from 'lucide-react';

export function Topbar(): JSX.Element {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  return (
    <header className="glass-panel m-3 px-4 py-3 flex items-center justify-between">
      <div className="text-sm text-slate-600">
        Welcome, <span className="font-medium text-slate-900">{user?.fullName ?? 'Guest'}</span>
      </div>
      <div className="flex items-center gap-2">
        <button aria-label="Notifications" className="p-2 rounded-lg hover:bg-white/60">
          <Bell className="h-4 w-4" />
        </button>
        <button
          onClick={() => dispatch(clearCredentials())}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-white/60"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
