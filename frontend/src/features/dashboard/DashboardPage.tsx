import { motion } from 'framer-motion';
import { Users, Building2, Activity, Wifi } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGetDashboardSummaryQuery } from './dashboardApi';

const STAT_ICONS = [Users, Building2, Activity, Wifi];

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const { data, isLoading, isError } = useGetDashboardSummaryQuery();

  const summary = data?.data;

  const stats = [
    { label: 'Users',       value: summary?.userCount },
    { label: 'Departments', value: summary?.departmentCount },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <header>
        <h1 className="text-2xl font-heading text-[var(--primary-text-color)]">Dashboard</h1>
        <p className="text-sm text-[var(--secondary-text-color)]">
          Hi {user?.fullName ?? 'there'}, welcome back.
        </p>
      </header>

      {isError && (
        <div className="rounded-md bg-[var(--negative-bg)] text-negative text-sm px-4 py-3">
          Failed to load summary. Please refresh.
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map(({ label, value }, i) => {
          const Icon = STAT_ICONS[i];
          return (
            <div key={label} className="floating-card rounded-md shadow-floating-card p-5 flex items-start gap-4">
              <div className="p-2 rounded-md bg-[var(--primary-bg-tint)]">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--secondary-text-color)]">{label}</div>
                {isLoading ? (
                  <div className="mt-1 h-8 w-16 rounded bg-[var(--skeleton-bg)] animate-pulse" />
                ) : (
                  <div className="mt-1 font-mono text-3xl font-bold text-primary">
                    {value ?? '—'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="floating-card rounded-md shadow-floating-card p-6">
        <h2 className="text-base font-heading font-semibold mb-3 text-[var(--primary-text-color)]">
          Recent activity
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-5 rounded bg-[var(--skeleton-bg)] animate-pulse" />
            ))}
          </div>
        ) : summary?.recentActivity?.length ? (
          <ul className="divide-y divide-[var(--border-color)]">
            {summary.recentActivity.map((item) => (
              <li key={item.id} className="py-2 flex justify-between text-sm">
                <span className="text-[var(--primary-text-color)]">{item.message}</span>
                <span className="text-[var(--secondary-text-color)] tabular-nums">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--secondary-text-color)]">No recent activity yet.</p>
        )}
      </section>

      <section className="floating-card rounded-md shadow-floating-card p-6">
        <h2 className="text-base font-heading font-semibold mb-2 text-[var(--primary-text-color)]">
          Getting started
        </h2>
        <p className="text-sm text-[var(--secondary-text-color)]">
          Run <code className="font-mono text-primary">/new-module &lt;name&gt;</code> in Claude Code
          to scaffold new features following the project conventions.
        </p>
      </section>
    </motion.div>
  );
}
