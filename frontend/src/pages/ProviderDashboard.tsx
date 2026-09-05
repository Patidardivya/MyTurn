import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

type WaitingTicket = {
  id: string;
  ticketNumber: string;
  priorityType: string;
  service: { name: string };
};

const ProviderDashboard = () => {
  const { user, logout } = useAuth();
  const [queueId, setQueueId] = useState(() => localStorage.getItem('ql_queue_id') || '');
  const [counterId, setCounterId] = useState(() => localStorage.getItem('ql_counter_id') || '');
  const [waiting, setWaiting] = useState<WaitingTicket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<WaitingTicket | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadQueue = useCallback(async () => {
    if (!queueId) return;
    try {
      const response = await api.get(`/queues/${queueId}/live`);
      setWaiting(response.data.waiting);
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Unable to load this queue.');
    }
  }, [queueId]);

  useEffect(() => {
    void loadQueue();
    const interval = window.setInterval(() => void loadQueue(), 10000);
    return () => window.clearInterval(interval);
  }, [loadQueue]);

  const saveSettings = (event: FormEvent) => {
    event.preventDefault();
    localStorage.setItem('ql_queue_id', queueId);
    localStorage.setItem('ql_counter_id', counterId);
    setMessage('Queue settings saved.');
    void loadQueue();
  };

  const callNext = async () => {
    if (!queueId || !counterId) {
      setMessage('Enter both queue ID and counter ID first.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post(`/queues/${queueId}/call-next`, { counterId });
      setCurrentTicket(response.data.ticket);
      setMessage(`Now serving ${response.data.ticket.ticketNumber}.`);
      await loadQueue();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Unable to call the next ticket.');
    } finally {
      setLoading(false);
    }
  };

  const finishCurrent = async (action: 'complete' | 'no-show') => {
    if (!currentTicket) return;
    setLoading(true);
    try {
      await api.post(`/tickets/${currentTicket.id}/${action}`);
      setMessage(action === 'complete' ? 'Ticket completed.' : 'Ticket marked as no-show.');
      setCurrentTicket(null);
      await loadQueue();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Unable to update the current ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm text-slate-500">Provider workspace</p><h1 className="text-3xl font-bold text-slate-900">Queue control</h1><p className="text-slate-600">Welcome, {user?.name}</p></div>
          <button onClick={logout} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Log out</button>
        </header>

        <form onSubmit={saveSettings} className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-medium text-slate-700">Queue ID<input required value={queueId} onChange={event => setQueueId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-slate-700">Counter ID<input required value={counterId} onChange={event => setCounterId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <button className="self-end rounded-lg bg-slate-800 px-4 py-2 font-semibold text-white">Save</button>
        </form>

        {message && <p role="status" className="mt-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">{message}</p>}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Current service</h2>
            {currentTicket ? <><p className="mt-6 text-5xl font-black text-indigo-600">{currentTicket.ticketNumber}</p><p className="mt-2 text-slate-600">{currentTicket.service.name}</p><div className="mt-6 flex gap-3"><button disabled={loading} onClick={() => void finishCurrent('complete')} className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-60">Complete</button><button disabled={loading} onClick={() => void finishCurrent('no-show')} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-60">No-show</button></div></> : <><p className="mt-6 text-slate-500">No ticket is currently being served.</p><button disabled={loading} onClick={() => void callNext()} className="mt-6 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-60">Call next ticket</button></>}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Waiting queue</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{waiting.length} waiting</span></div>{waiting.length ? <ul className="mt-4 divide-y divide-slate-100">{waiting.map(ticket => <li key={ticket.id} className="flex items-center justify-between py-3"><span className="font-semibold">{ticket.ticketNumber}</span><span className="text-sm text-slate-500">{ticket.service.name} · {ticket.priorityType}</span></li>)}</ul> : <p className="mt-6 text-slate-500">No waiting tickets, or configure a queue above.</p>}</div>
        </section>
      </div>
    </main>
  );
};

export default ProviderDashboard;
