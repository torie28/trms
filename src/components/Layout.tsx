import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, User, MapPin, Shield, Users } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const roleIcons = {
  taxpayer: User,
  approver: Shield,
  collector: MapPin,
};

const roleLabels = {
  taxpayer: 'Taxpayer (Mlipa Kodi)',
  approver: 'Registry Officer (Afisa wa Usajili)',
  collector: 'Tax Collector (Mtaalamu wa Kodi)',
};

export function Layout({ children, title, subtitle }: LayoutProps) {
  const { user, profile, signOut } = useAuth();
  const RoleIcon = profile ? roleIcons[profile.role] : User;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header: Updated to the vibrant landing page yellow */}
      <header className="bg-[#FFE600] shadow-md border-b border-[#FFE600]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {/* Logo block using dark slate contrasting text */}
              <div className="bg-slate-900 p-2 rounded-xl text-[#FFE600] shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-950 tracking-tight">Taxpayer Relocation Portal</h1>
                <p className="text-xs text-slate-950/80 font-medium">Mfumo wa Uhamisho wa Walipa Kodi</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Profile Pill Badge: Dark slate tint overlay with high contrast dark text */}
              <div className="flex items-center gap-3 bg-slate-950/5 border border-slate-950/10 px-4 py-2 rounded-xl text-sm">
                <RoleIcon className="w-5 h-5 text-slate-950" />
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-950">{profile?.full_name || 'Loading...'}</p>
                  <p className="text-xs text-slate-900/90 font-medium">{profile ? roleLabels[profile.role] : ''}</p>
                </div>
              </div>

              <button
                onClick={signOut}
                className="flex items-center gap-2 text-slate-900 hover:text-slate-950 hover:bg-slate-950/10 px-3 py-2 rounded-lg font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80 z-0"></div>
      
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FFE600] rounded-2xl mb-4 text-slate-950 shadow-lg shadow-[#FFE600]/10">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Taxpayer Relocation Portal</h1>
          <p className="text-[#FFE600]/80 font-medium text-sm mt-2">Mfumo wa Uhamisho wa Walipa Kodi</p>
        </div>
        {children}
      </div>
    </div>
  );
}