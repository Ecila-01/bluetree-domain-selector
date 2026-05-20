import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Loader2, Download, CheckCircle2, XCircle, AlertTriangle,
  Target, DollarSign, Activity, Moon, Sun, ListChecks, ChevronDown, ChevronUp
} from 'lucide-react';
import { exportCampaignToExcel } from '../utils/exportUtils';

// All seeded profiles sum to 100; use this lookup as the canonical max per profile
const PROFILE_MAX = { Standard: 100, SaaS: 100, Ecommerce: 100, Fintech: 100, Local: 100 };
const getProfileMax = (profileName) => PROFILE_MAX[profileName] ?? 100;

export default function Results() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [expandedCard, setExpandedCard] = useState(null);

  // Interactive UI State
  const [selectedDomains, setSelectedDomains] = useState(new Set());
  const [activeTab, setActiveTab] = useState('shortlist');
  const [shortlistLimit, setShortlistLimit] = useState(50);
  const [sortBy, setSortBy] = useState('score');

  const brief = data?.campaign?.brief ? {
    ...data.campaign.brief,
    target_pages: typeof data.campaign.brief.target_pages === 'string'
      ? JSON.parse(data.campaign.brief.target_pages)
      : (data.campaign.brief.target_pages || [])
  } : null;

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/campaigns/${id}/results`)
      .then(res => {
        setData(res.data);
        const goal = parseInt(res.data.campaign.brief.link_count_goal) || 10;
        const initialSelection = new Set();
        res.data.qualified.slice(0, goal).forEach(d => initialSelection.add(d.domain));
        setSelectedDomains(initialSelection);
        // Clear resume banner since user is now viewing this campaign
        try { localStorage.removeItem('lastCampaignId'); } catch (e) {}
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load campaign results.");
        setIsLoading(false);
      });
  }, [id]);

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

  // Derived calculations for the live dashboard
  const stats = useMemo(() => {
    if (!data || !brief) return { spent: 0, count: 0, avgDr: 0, budget: 0 };
    const selected = data.qualified.filter(d => selectedDomains.has(d.domain));
    const budget = (parseFloat(String(brief.budget).replace(/[^0-9.]/g, '')) || 0) *
               (parseFloat(brief.link_count_goal) || 1);

    let spent = 0;
    let totalDr = 0;

    selected.forEach(d => {
      const rawPrice = String(d.raw_data.gp_price || d.raw_data.li_price || '0');
      const cleanPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
      spent += cleanPrice;
      totalDr += parseFloat(String(d.raw_data.dr || '0').replace(/[^0-9.]/g, '')) || 0;
    });

    return {
      spent,
      budget,
      remaining: budget - spent,
      count: selected.length,
      goal: parseInt(brief.link_count_goal) || 0,
      avgDr: selected.length > 0 ? (totalDr / selected.length).toFixed(1) : 0
    };
  }, [data, selectedDomains]);

  // Sorting and filtering
  const displayedShortlist = useMemo(() => {
    if (!data) return [];
    let sorted = [...data.qualified];

    if (sortBy === 'price') {
      sorted.sort((a, b) => {
        const pA = parseFloat(String(a.raw_data.gp_price || a.raw_data.li_price || '0').replace(/[^0-9.]/g, ''));
        const pB = parseFloat(String(b.raw_data.gp_price || b.raw_data.li_price || '0').replace(/[^0-9.]/g, ''));
        return pA - pB;
      });
    } else if (sortBy === 'dr') {
      sorted.sort((a, b) => parseFloat(b.raw_data.dr || 0) - parseFloat(a.raw_data.dr || 0));
    }

    return shortlistLimit === 0 ? sorted : sorted.slice(0, shortlistLimit);
  }, [data, sortBy, shortlistLimit]);

  const toggleDomain = (domain) => {
    const newSet = new Set(selectedDomains);
    if (newSet.has(domain)) newSet.delete(domain);
    else newSet.add(domain);
    setSelectedDomains(newSet);
  };

  const formatPrice = (raw_data) => {
    const raw = String(raw_data.gp_price || raw_data.li_price || '');
    const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    return num ? `$${num}` : '—';
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
    </div>
  );
  if (error) return <div className="p-20 text-center text-red-600 dark:text-red-400 font-medium">{error}</div>;
  if (!data) return null;

  const profileMax = getProfileMax(brief.profile);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-8 py-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Setup
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/campaigns"
                className="hidden sm:flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                <ListChecks className="w-4 h-4" />
                Past Campaigns
              </Link>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Toggle theme"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{data.campaign.client_name}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-3 text-sm flex-wrap">
                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md font-medium">{brief.profile} Profile</span>
                <span>Analyzed {data.qualified.length + data.excluded.length} domains</span>
              </p>
            </div>
            <button
              onClick={() => exportCampaignToExcel(data, selectedDomains)}
              disabled={selectedDomains.size === 0}
              className="hidden md:flex bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 items-center shadow-sm transition-all focus:ring-4 focus:ring-green-100 disabled:bg-gray-400 disabled:cursor-not-allowed">
              <Download className="w-4 h-4 mr-2" /> Export Campaign (XLSX)
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {/* Live Widget Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Target className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Links Selected</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {stats.count} <span className="text-lg text-gray-400 dark:text-gray-500 font-normal">/ {stats.goal}</span>
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-start gap-4">
            <div className={`p-3 rounded-lg ${stats.remaining < 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'}`}>
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Budget Remaining</p>
              <p className={`text-3xl font-bold mt-1 ${stats.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                ${stats.remaining.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Total Spent: ${stats.spent.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg"><Activity className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Average DR</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.avgDr}</p>
            </div>
          </div>
        </div>

        {/* Tab & Filter Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
            <button onClick={() => setActiveTab('shortlist')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'shortlist' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
              Top Shortlist ({data.qualified.length})
            </button>
            <button onClick={() => setActiveTab('excluded')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'excluded' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
              Excluded ({data.excluded.length})
            </button>
          </div>

          {activeTab === 'shortlist' && (
            <div className="flex gap-3 flex-wrap">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500">
                <option value="score">Sort by AI Score</option>
                <option value="dr">Sort by DR (Highest)</option>
                <option value="price">Sort by Price (Lowest)</option>
              </select>
              <select value={shortlistLimit} onChange={e => setShortlistLimit(Number(e.target.value))} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm rounded-lg px-3 py-2 text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500">
                <option value={25}>Top 25</option>
                <option value={50}>Top 50</option>
                <option value={100}>Top 100</option>
                <option value={250}>Top 250</option>
                <option value={500}>Top 500</option>
                <option value={0}>All ({data.qualified.length})</option>
              </select>
            </div>
          )}
        </div>

        {/* Data Table / Card View */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

          {/* SHORTLIST TAB */}
          {activeTab === 'shortlist' && (
            <>
              {/* Desktop Table — hidden on mobile */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-4 w-16">Pick</th>
                      <th className="px-6 py-4 w-1/3">Domain & Reasoning</th>
                      <th className="px-6 py-4 text-center">Score</th>
                      <th className="px-6 py-4">Metrics</th>
                      <th className="px-6 py-4">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {displayedShortlist.map((item, idx) => (
                      <tr key={idx} className={`transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10 ${selectedDomains.has(item.domain) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                        <td className="px-6 py-4 text-center">
                          <input type="checkbox" checked={selectedDomains.has(item.domain)} onChange={() => toggleDomain(item.domain)}
                            className="w-5 h-5 text-blue-600 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500 cursor-pointer" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-base flex items-center gap-2 flex-wrap">
                            {item.domain}
                            {item.raw_data.red_flags && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-normal bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                {item.raw_data.red_flags}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic leading-relaxed">"{item.reasoning_summary}"</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(item.breakdown).map(([key, val]) => (
                              <span key={key} className="text-[10px] uppercase font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                {key}: {val}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex flex-col items-center justify-center w-14 h-14 rounded-full border-4 border-green-100 dark:border-green-900/40 bg-green-50 dark:bg-green-900/20">
                            <span className="font-bold text-base text-green-700 dark:text-green-400 leading-none">{Math.round(item.total_score)}</span>
                            <span className="text-[10px] text-green-600 dark:text-green-500 font-medium leading-none mt-0.5">/{profileMax}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-xs">
                            <div><span className="font-medium text-gray-900 dark:text-gray-200">DR:</span> <span className="text-gray-600 dark:text-gray-300">{item.raw_data.dr}</span></div>
                            <div><span className="font-medium text-gray-900 dark:text-gray-200">Traffic:</span> <span className="text-gray-600 dark:text-gray-300">{item.raw_data.traffic}</span></div>
                            <div><span className="font-medium text-gray-900 dark:text-gray-200">Geo:</span> <span className="text-gray-600 dark:text-gray-300">{item.raw_data.geo || 'Global'}</span></div>
                            {item.raw_data.link_type && (
                              <div><span className="font-medium text-gray-900 dark:text-gray-200">Link Type:</span> <span className="text-gray-600 dark:text-gray-300">{item.raw_data.link_type}</span></div>
                            )}
                            {item.raw_data.contact && (
                              <div><span className="font-medium text-gray-900 dark:text-gray-200">Contact:</span> <span className="text-blue-600 dark:text-blue-400">{item.raw_data.contact}</span></div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-gray-100 text-base">{formatPrice(item.raw_data)}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{item.raw_data.tat ? `TAT: ${item.raw_data.tat}` : ''}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Layout — shown only on mobile */}
              <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {displayedShortlist.map((item, idx) => (
                  <div key={idx} className={`p-4 ${selectedDomains.has(item.domain) ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}`}>
                    {/* Row 1: checkbox + domain + score */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedDomains.has(item.domain)}
                          onChange={() => toggleDomain(item.domain)}
                          className="w-5 h-5 mt-0.5 text-blue-600 border-gray-300 dark:border-gray-500 rounded shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{item.domain}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            DR: {item.raw_data.dr} · {item.raw_data.traffic || '—'} traffic
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full border-4 border-green-100 dark:border-green-900/40 bg-green-50 dark:bg-green-900/20 shrink-0">
                        <span className="font-bold text-sm text-green-700 dark:text-green-400 leading-none">{Math.round(item.total_score)}</span>
                        <span className="text-[9px] text-green-600 dark:text-green-500 leading-none mt-0.5">/{profileMax}</span>
                      </div>
                    </div>

                    {/* Row 2: price + niche + expand */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{formatPrice(item.raw_data)}</span>
                        {item.raw_data.link_type && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{item.raw_data.link_type}</span>
                        )}
                        {item.raw_data.red_flags && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs">
                            <AlertTriangle className="w-3 h-3" /> {item.raw_data.red_flags}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium"
                      >
                        {expandedCard === idx ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> Details</>}
                      </button>
                    </div>

                    {/* Expanded detail */}
                    {expandedCard === idx && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">"{item.reasoning_summary}"</p>
                        {item.raw_data.contact && (
                          <p className="text-xs"><span className="font-medium text-gray-700 dark:text-gray-300">Contact:</span> <span className="text-blue-600 dark:text-blue-400">{item.raw_data.contact}</span></p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(item.breakdown).map(([key, val]) => (
                            <span key={key} className="text-[10px] uppercase font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-2 py-0.5 rounded-full">
                              {key}: {val}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* EXCLUDED TAB */}
          {activeTab === 'excluded' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 w-1/4">Domain</th>
                    <th className="px-6 py-4">Disqualification Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.excluded.length === 0 ? (
                    <tr><td colSpan="2" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No domains were excluded.</td></tr>
                  ) : (
                    data.excluded.map((item, idx) => (
                      <tr key={idx} className="hover:bg-red-50/20 dark:hover:bg-red-900/10">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" /> {item.domain}
                        </td>
                        <td className="px-6 py-4 text-red-600 dark:text-red-400 font-medium">{item.exclusion_reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between md:hidden z-20 transition-transform duration-200 ${selectedDomains.size > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {selectedDomains.size} selected
        </span>
        <button
          onClick={() => exportCampaignToExcel(data, selectedDomains)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm"
        >
          <Download className="w-4 h-4" /> Export XLSX
        </button>
      </div>
    </div>
  );
}
