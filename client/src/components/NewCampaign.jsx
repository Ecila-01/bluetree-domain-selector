import { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Plus, Trash2, Loader2, Sparkles, FileSpreadsheet, SlidersHorizontal, Moon, Sun, ListChecks, ChevronDown } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function NewCampaign() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  const [brief, setBrief] = useState({
    client_name: '',
    niches: '',
    target_pages: [{ url: '', keyword: '' }],
    budget: '',
    link_count_goal: '',
    geo: '',
    follow_preference: 'dofollow',
    min_dr: 45,
    min_traffic: 2000,
    profile: 'Standard'
});

  const [file, setFile] = useState(null);

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/api/config/profiles`)
      .then(res => setProfiles(res.data))
      .catch(err => console.error("Failed to load profiles:", err));
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

  const addTargetPage = () => setBrief({ ...brief, target_pages: [...brief.target_pages, { url: '', keyword: '' }] });
  const updateTargetPage = (index, field, value) => {
    const newPages = [...brief.target_pages];
    newPages[index][field] = value;
    setBrief({ ...brief, target_pages: newPages });
  };
  const removeTargetPage = (index) => setBrief({ ...brief, target_pages: brief.target_pages.filter((_, i) => i !== index) });

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Please upload a vendor inventory CSV.");
    if (!brief.client_name || !brief.budget || !brief.niches || !brief.link_count_goal) return setError("Please fill in all required fields.");

    setIsLoading(true);
    const formData = new FormData();
    formData.append('inventory', file);
    formData.append('brief', JSON.stringify(brief));

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/campaigns`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      try { localStorage.setItem('lastCampaignId', res.data.campaignId); } catch (e) {}
      navigate(`/campaign/${res.data.campaignId}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = "w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 outline-none";
  const labelClasses = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2";

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Campaign Intelligence</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/campaigns"
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
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
          <p className="text-gray-500 dark:text-gray-400 text-lg">Define your brief and AI will score the perfect publisher domains.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">

          {error && (
            <div className="m-6 mb-0 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>{error}
            </div>
          )}

          <div className="p-8 space-y-10">

            {/* Section 1: Core Client Brief */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold">1</span>
                Client Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <label className={labelClasses}>Client Name *</label>
                  <input type="text" className={inputClasses} required placeholder="e.g. Acme Corp"
                    value={brief.client_name} onChange={e => setBrief({...brief, client_name: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClasses}>Client Niches (Comma Separated) *</label>
                  <input type="text" className={inputClasses} required placeholder="e.g. saas, hr software, employee management"
                    value={brief.niches} onChange={e => setBrief({...brief, niches: e.target.value})} />
                </div>
                <div>
                  <label className={labelClasses}>Geo Focus</label>
                  <input type="text" className={inputClasses} placeholder="e.g. global, US, UK"
                    value={brief.geo} onChange={e => setBrief({...brief, geo: e.target.value})} />
                </div>
                <div>
                  <label className={labelClasses}>Scoring Profile</label>
                  <div className="relative">
                    <select className={`${inputClasses} cursor-pointer appearance-none pr-10`}
                      value={brief.profile} onChange={e => setBrief({...brief, profile: e.target.value})}>
                      {profiles.map(p => (
                        <option key={p.id} value={p.name}>{p.name} Profile</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              </div>
            </section>

            <div className="h-px w-full bg-gray-100 dark:bg-gray-700"></div>

            {/* Section 2: Campaign Thresholds */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold"><SlidersHorizontal className="w-3 h-3"/></span>
                Campaign Thresholds
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-6">
                <div>
                  <label className={labelClasses}>Budget Per Link ($) *</label>
                  <input type="number" className={inputClasses} required min="1" placeholder="300"
                    value={brief.budget} onChange={e => setBrief({...brief, budget: e.target.value})} />
                </div>
                <div>
                  <label className={labelClasses}>Link Goal *</label>
                  <input type="number" className={inputClasses} required min="1" placeholder="10"
                    value={brief.link_count_goal} onChange={e => setBrief({...brief, link_count_goal: e.target.value})} />
                </div>
                <div>
                  <label className={labelClasses}>Minimum DR</label>
                  <input type="number" className={inputClasses} required min="0" max="100" placeholder="e.g. 45"
                    value={brief.min_dr} onChange={e => setBrief({...brief, min_dr: e.target.value})} />
                </div>
                <div>
                  <label className={labelClasses}>Min Traffic</label>
                  <input type="number" className={inputClasses} required min="0" step="100" placeholder="e.g. 2000"
                    value={brief.min_traffic} onChange={e => setBrief({...brief, min_traffic: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClasses}>Link Preference</label>
                  <div className="relative">
                    <select className={`${inputClasses} cursor-pointer appearance-none pr-10`}
                      value={brief.follow_preference} onChange={e => setBrief({...brief, follow_preference: e.target.value})}>
                      <option value="dofollow">Dofollow Only</option>
                      <option value="either">Either (Dofollow or Nofollow)</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              </div>
            </section>

            <div className="h-px w-full bg-gray-100 dark:bg-gray-700"></div>

            {/* Section 3: Target Pages */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold">2</span>
                  Target Pages
                </h2>
                <button type="button" onClick={addTargetPage}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3 py-1.5 rounded-md flex items-center font-medium transition-colors">
                  <Plus className="w-4 h-4 mr-1" /> Add Target URL
                </button>
              </div>

              <div className="space-y-4">
                {brief.target_pages.map((page, index) => (
                  <div key={index} className="flex gap-4 items-start group">
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 dark:text-gray-500 text-sm">https://</span>
                      </div>
                      <input type="text" placeholder="acme.com/pricing" className={`${inputClasses} pl-16`} required
                        value={page.url.replace(/^https?:\/\//, '')} onChange={e => updateTargetPage(index, 'url', e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <input type="text" placeholder="Primary Keyword" className={inputClasses} required
                        value={page.keyword} onChange={e => updateTargetPage(index, 'keyword', e.target.value)} />
                    </div>
                    {brief.target_pages.length > 1 && (
                      <button type="button" onClick={() => removeTargetPage(index)}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <div className="h-px w-full bg-gray-100 dark:bg-gray-700"></div>

            {/* Section 4: Data Upload */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold">3</span>
                Vendor Inventory
              </h2>

              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                htmlFor="file-upload"
                className={`relative block w-full border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
                  ${isDragging ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100/50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'}
                  ${file ? 'border-green-500 bg-green-50/30 dark:bg-green-900/10' : ''}
                `}
              >
                <input type="file" accept=".csv" className="hidden" id="file-upload" onChange={(e) => setFile(e.target.files[0])} />

                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-3">
                      <FileSpreadsheet className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB · Ready to process</p>
                    <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">Change file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm rounded-full flex items-center justify-center mb-4">
                      <Upload className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      <span className="text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">CSV files only.</p>
                  </div>
                )}
              </label>
            </section>
          </div>

          <div className="px-8 py-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              Processing 1,000+ domains takes ~3 seconds.
            </p>
            <button type="submit" disabled={isLoading || !file}
              className="w-full sm:w-auto bg-gray-900 dark:bg-blue-600 text-white font-medium py-3 px-8 rounded-lg hover:bg-black dark:hover:bg-blue-700 focus:ring-4 focus:ring-gray-200 dark:focus:ring-blue-900/40 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex justify-center items-center transition-all shadow-sm">
              {isLoading ? (
                <><Loader2 className="w-5 h-5 mr-3 animate-spin text-gray-400 dark:text-blue-300" /> Scoring Engine Running...</>
              ) : (
                'Run Scoring Engine'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
