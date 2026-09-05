import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

type Organization = { id: string; name: string; status: string };
type Branch = { id: string; name: string; organization: { name: string } };
type Queue = { id: string; branch: { name: string }; service?: { name: string } | null };

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [organization, setOrganization] = useState({ name: '', category: '', description: '' });
  const [branch, setBranch] = useState({ organizationId: '', name: '', city: '', address: '' });
  const [queue, setQueue] = useState({ branchId: '', serviceId: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [orgResponse, branchResponse, queueResponse] = await Promise.all([
        api.get('/organizations'),
        api.get('/branches'),
        api.get('/queues'),
      ]);
      setOrganizations(orgResponse.data.organizations);
      setBranches(branchResponse.data.branches);
      setQueues(queueResponse.data.queues);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Unable to load admin data.');
    }
  };

  useEffect(() => { void loadData(); }, []);

  const submit = async (path: string, body: object, success: string, reset: () => void) => {
    setError('');
    try {
      await api.post(path, body);
      reset();
      setMessage(success);
      await loadData();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Unable to save changes.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm text-slate-500">Administrator workspace</p><h1 className="text-3xl font-bold text-slate-900">Manage locations</h1><p className="text-slate-600">Welcome, {user?.name}</p></div>
          <button onClick={logout} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Log out</button>
        </header>
        {message && <p role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <form onSubmit={event => { event.preventDefault(); void submit('/organizations', organization, 'Organization created.', () => setOrganization({ name: '', category: '', description: '' })); }} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold">Create organization</h2>
            <input required placeholder="Name" value={organization.name} onChange={event => setOrganization({ ...organization, name: event.target.value })} className="w-full rounded-lg border p-2.5" />
            <input placeholder="Category" value={organization.category} onChange={event => setOrganization({ ...organization, category: event.target.value })} className="w-full rounded-lg border p-2.5" />
            <textarea placeholder="Description" value={organization.description} onChange={event => setOrganization({ ...organization, description: event.target.value })} className="w-full rounded-lg border p-2.5" />
            <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white">Create organization</button>
          </form>
          <form onSubmit={event => { event.preventDefault(); void submit('/branches', branch, 'Branch created.', () => setBranch({ organizationId: '', name: '', city: '', address: '' })); }} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold">Create branch</h2>
            <select required value={branch.organizationId} onChange={event => setBranch({ ...branch, organizationId: event.target.value })} className="w-full rounded-lg border p-2.5"><option value="">Select organization</option>{organizations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input required placeholder="Branch name" value={branch.name} onChange={event => setBranch({ ...branch, name: event.target.value })} className="w-full rounded-lg border p-2.5" />
            <input placeholder="City" value={branch.city} onChange={event => setBranch({ ...branch, city: event.target.value })} className="w-full rounded-lg border p-2.5" />
            <input placeholder="Address" value={branch.address} onChange={event => setBranch({ ...branch, address: event.target.value })} className="w-full rounded-lg border p-2.5" />
            <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white">Create branch</button>
          </form>
          <form onSubmit={event => { event.preventDefault(); void submit('/queues', { branchId: queue.branchId, ...(queue.serviceId ? { serviceId: queue.serviceId } : {}) }, 'Queue created.', () => setQueue({ branchId: '', serviceId: '' })); }} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-xl font-bold">Create queue</h2>
            <select required value={queue.branchId} onChange={event => setQueue({ ...queue, branchId: event.target.value })} className="w-full rounded-lg border p-2.5"><option value="">Select branch</option>{branches.map(item => <option key={item.id} value={item.id}>{item.organization.name} · {item.name}</option>)}</select>
            <input placeholder="Service ID (optional)" value={queue.serviceId} onChange={event => setQueue({ ...queue, serviceId: event.target.value })} className="w-full rounded-lg border p-2.5" />
            <button className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white">Create queue</button>
          </form>
        </section>
        <section className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Organizations ({organizations.length})</h2>{organizations.map(item => <p key={item.id} className="mt-3 text-sm">{item.name} <span className="text-slate-400">({item.status})</span></p>)}</div>
          <div className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Branches ({branches.length})</h2>{branches.map(item => <p key={item.id} className="mt-3 text-sm">{item.name} <span className="text-slate-400">· {item.organization.name}</span></p>)}</div>
          <div className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Queues ({queues.length})</h2>{queues.map(item => <p key={item.id} className="mt-3 text-sm">{item.branch.name} <span className="text-slate-400">· {item.service?.name || 'All services'}</span></p>)}</div>
        </section>
      </div>
    </main>
  );
};

export default AdminDashboard;
