import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import NewCampaign from './components/NewCampaign';
import Results from './components/Results';
import Campaigns from './components/Campaigns';

function ResumeBanner() {
  const [campaignId, setCampaignId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const id = localStorage.getItem('lastCampaignId');
      if (id) setCampaignId(id);
    } catch (e) {}
  }, []);

  const dismiss = () => {
    try { localStorage.removeItem('lastCampaignId'); } catch (e) {}
    setCampaignId(null);
  };

  if (!campaignId) return null;

  return (
    <div className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 flex items-center justify-between text-sm">
      <span>You have an unfinished campaign. <strong>Resume where you left off?</strong></span>
      <div className="flex items-center gap-3">
        <Link
          to={`/campaign/${campaignId}`}
          onClick={dismiss}
          className="bg-white text-blue-600 font-semibold px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
        >
          Resume
        </Link>
        <button onClick={dismiss} className="text-blue-200 hover:text-white transition-colors text-lg leading-none">&times;</button>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    try {
      const theme = localStorage.getItem('theme');
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <ResumeBanner />
      <Routes>
        <Route path="/" element={<NewCampaign />} />
        <Route path="/campaign/:id" element={<Results />} />
        <Route path="/campaigns" element={<Campaigns />} />
      </Routes>
      <Analytics />
    </div>
  );
}
