import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await api.post('/auth/register', form);
      login(response.data.token, response.data.user);
      navigate(`/${response.data.user.role.toLowerCase()}/dashboard`, { replace: true });
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Unable to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <Link to="/" className="text-indigo-600 font-bold">MyTurn</Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-8">Create your account</h1>
        <p className="text-slate-500 mt-2">Start using digital queues in less than a minute.</p>
        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="block text-sm font-medium text-slate-700">Full name
            <input required minLength={2} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" autoComplete="name" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Email
            <input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" autoComplete="email" />
          </label>
          <label className="block text-sm font-medium text-slate-700">Password
            <input required minLength={6} type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" autoComplete="new-password" />
          </label>
          <button disabled={submitting} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link className="font-semibold text-indigo-600" to="/login">Log in</Link></p>
      </section>
    </main>
  );
};

export default Register;
