import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <header>
        <h1 className="text-2xl font-heading text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">Hi {user?.fullName ?? 'there'}, welcome back.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Users', 'Departments', 'Active sessions', 'Health'].map((label) => (
          <div key={label} className="floating-card rounded-md shadow-floating-card p-5">
            <div className="text-xs uppercase tracking-wide text-[var(--secondary-text-color)]">{label}</div>
            <div className="mt-2 font-mono text-3xl text-primary">—</div>
          </div>
        ))}
      </section>

      <section className="floating-card rounded-md shadow-floating-card p-6">
        <h2 className="text-lg font-heading mb-2">Getting started</h2>
        <p className="text-sm text-slate-600">
          This is your starting point. Run <code className="font-mono">/new-module &lt;name&gt;</code> in Claude Code to scaffold
          new features following the project conventions.
        </p>
      </section>
    </motion.div>
  );
}
