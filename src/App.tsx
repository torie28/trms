import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { TaxpayerDashboard } from './pages/TaxpayerDashboard';
import { ApproverDashboard } from './pages/ApproverDashboard';
import { CollectorDashboard } from './pages/CollectorDashboard';
import { Loader2 } from 'lucide-react';

function App() {
  const { user, profile, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Listen to path changes (handles back/forward buttons and navigation clicks)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Simple state-driven history router function
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-white animate-spin mx-auto mb-4" />
          <p className="text-blue-200">Loading...</p>
        </div>
      </div>
    );
  }

  // 1. If the user is on the root path, ALWAYS show the landing page
  if (currentPath === '/' || currentPath === '/landing') {
    return <LandingPage onGetStarted={() => navigateTo('/auth')} />;
  }

  // 2. Protect dashboard/auth paths if no active session exists
  if (!user || !profile) {
    return <AuthPage onGoBack={() => navigateTo('/')} />;
  }

  // 3. User is logged in, serve the correct dashboard based on role
  switch (profile.role) {
    case 'taxpayer':
      return <TaxpayerDashboard />;
    case 'approver':
      return <ApproverDashboard />;
    case 'collector':
      return <CollectorDashboard />;
    default:
      return <AuthPage onGoBack={() => navigateTo('/')} />;
  }
}

export default App;