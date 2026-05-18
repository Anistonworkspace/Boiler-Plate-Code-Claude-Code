import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, LogIn } from 'lucide-react';
import { useLoginMutation } from './authApi';
import { setCredentials } from './authSlice';
import { useAppDispatch } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage(): JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues): Promise<void> => {
    try {
      const result = await login(values).unwrap();
      dispatch(setCredentials({ accessToken: result.data.accessToken, user: result.data.user }));
      toast.success('Logged in successfully');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = (err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? 'Login failed';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-100 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="glass-panel w-full max-w-md p-8">
        <h1 className="text-3xl font-heading text-brand-700 mb-1">Welcome back</h1>
        <p className="text-sm text-slate-600 mb-6">Sign in to your Boilerplate App account.</p>

        <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" {...register('email')} className="input-base" placeholder="you@example.com" />
        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}

        <label className="block text-sm font-medium text-slate-700 mb-1.5 mt-4" htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" {...register('password')} className="input-base" placeholder="••••••••" />
        {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}

        <button type="submit" disabled={isLoading} className="brand-button w-full mt-6">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-xs text-slate-500 mt-6 text-center">
          Demo: <code className="font-mono">admin@example.com</code> / <code className="font-mono">Admin@12345</code>
        </p>
      </form>
    </div>
  );
}
