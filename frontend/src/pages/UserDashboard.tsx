import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Ticket, 
  Clock, 
  Users, 
  MapPin, 
  Search, 
  QrCode, 
  Share2, 
  XCircle,
  ChevronRight,
  Bell
} from 'lucide-react';

const UserDashboard = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Dummy active token data (will be connected to API later)
  const activeToken = {
    number: 'A-124',
    service: 'Account Services',
    branch: 'HDFC Bank, Jaipur Branch',
    peopleAhead: 8,
    estimatedWait: 18,
    counter: 'Not assigned'
  };

  // Dummy services data
  const availableServices = [
    {
      id: 1,
      org: 'HDFC Bank',
      branch: 'Jaipur Branch',
      name: 'Account Services',
      waiting: 12,
      waitMins: 22,
      isOpen: true
    },
    {
      id: 2,
      org: 'Apollo Hospital',
      branch: 'City Center',
      name: 'General OPD',
      waiting: 45,
      waitMins: 65,
      isOpen: true
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200 pb-20 md:pb-0">
      
      {/* Top Navigation */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* MyTurn Monogram */}
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm tracking-tighter">
              MT
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">MyTurn</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-500 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome Section */}
        <section>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Good Morning, {user?.name?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-light max-w-xl">
            Manage your tokens, appointments and queues from one place.
          </p>
        </section>

        {/* Active Token Card (Bento Style) */}
        {activeToken ? (
          <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            
            <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Active Token
                  </div>
                  <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {activeToken.number}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    {activeToken.service} &bull; {activeToken.branch}
                  </p>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">People Ahead</p>
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-lg">
                      <Users className="w-5 h-5 text-indigo-500" />
                      {activeToken.peopleAhead}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Estimated Wait</p>
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-lg">
                      <Clock className="w-5 h-5 text-amber-500" />
                      ~{activeToken.estimatedWait} min
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Counter</p>
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-lg">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                      {activeToken.counter}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-3 justify-center">
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-medium transition-colors">
                  <QrCode className="w-5 h-5" />
                  Show QR
                </button>
                <div className="flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-xl font-medium transition-colors">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl font-medium transition-colors">
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-8 text-center border border-dashed border-slate-300 dark:border-slate-700">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Ticket className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No active tokens</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              You currently don't have an active queue. Find a service below to get your token.
            </p>
          </section>
        )}

        {/* Find a Service Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Find a Service</h2>
            
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search organizations, branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableServices.map((service) => (
              <div key={service.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl hover:shadow-md transition-shadow group cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{service.org}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{service.branch}</p>
                  </div>
                  {service.isOpen && (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                      Open
                    </span>
                  )}
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">{service.name}</h4>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Users className="w-4 h-4" />
                      <span>{service.waiting} waiting</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>~{service.waitMins} min wait</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Get Token
                  </button>
                  <button className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default UserDashboard;
