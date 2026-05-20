import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2, ListChecks, Moon, Sun } from 'lucide-react';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/campaigns`)
      .then(res => {
        setCampaigns(res.data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load campaigns.');
        setIsLoading(false);
      });
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-gray-900">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 pb-16">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center mb-3 transition-colors w-fit">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Setup
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <ListChecks className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Past Campaigns</h1>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        {campaigns.length === 0 && !error ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No campaigns yet.</p>
            <Link to="/" className="mt-4 inline-block text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Start your first campaign
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Profile</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Domains</th>
                  <th className="px-6 py-4 text-right">Qualified</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">{c.client_name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md text-xs font-medium">
                        {c.brief?.profile || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(c.created_at)}</td>
                    <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-300">{c.total_count ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-green-700 dark:text-green-400 font-semibold">{c.qualified_count ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/campaign/${c.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-xs bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-md transition-colors"
                      >
                        View Results →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
