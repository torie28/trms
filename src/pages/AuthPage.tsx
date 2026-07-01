import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, MapPin, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Location } from '../types';

type AuthMode = 'signin' | 'signup';
type SelectedRole = 'taxpayer' | 'approver' | 'collector';

interface AuthPageProps {
  onGoBack?: () => void;
}

export function AuthPage({ onGoBack }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<SelectedRole>('taxpayer');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAuth();

  useEffect(() => {
    async function loadLocations() {
      const { data } = await supabase.from('locations').select('*').order('name');
      if (data) setLocations(data as Location[]);
    }
    loadLocations();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        const locationId = role === 'collector' ? selectedLocationId : undefined;
        await signUp(email, password, fullName, phone, role, locationId);
        setMode('signin');
        setError('Account created! Please sign in.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const roles = [
    { id: 'taxpayer', label: 'Taxpayer', icon: User, swahili: 'Mlipa Kodi', desc: 'Submit and track relocation requests' },
    { id: 'approver', label: 'Registry Officer', icon: Shield, swahili: 'Afisa wa Usajili', desc: 'Review and approve requests' },
    { id: 'collector', label: 'Tax Collector', icon: MapPin, swahili: 'Mtaalamu wa Kodi', desc: 'Verify taxpayers and complete relocations' },
  ];

  return (
    <div className="relative min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden bg-slate-950">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 mix-blend-luminosity"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')"
        }}
      />
      
      {/* Soft dark radial mask */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/70 to-slate-950" />

      {/* Absolute Positioned Back Button at Top Left */}
      {onGoBack && (
        <div className="absolute top-6 left-6 z-20">
          <button
            onClick={onGoBack}
            type="button"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-black bg-white/10 hover:bg-[#FFE600] px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        {/* Main Transparent Card Panel */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10">
          {/* Tab Headers */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setMode('signin')}
              type="button"
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                mode === 'signin'
                  ? 'bg-[#FFE600] text-slate-950'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              type="button"
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                mode === 'signup'
                  ? 'bg-[#FFE600] text-slate-950'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none transition-shadow"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number (optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none transition-shadow"
                    placeholder="+255 xxx xxx xxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Select Your Role</label>
                  <div className="grid gap-3">
                    {roles.map((r) => {
                      const Icon = r.icon;
                      const isSelected = role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id as SelectedRole)}
                          className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-[#FFE600] bg-[#FFE600]/10 text-white'
                              : 'border-white/10 bg-white/5 hover:border-white/25 text-slate-300'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#FFE600] text-slate-950' : 'bg-white/10 text-slate-400'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-white">{r.label}</div>
                            <div className="text-xs text-slate-300">{r.swahili}</div>
                            {/* <div className="text-xs text-slate-400 mt-1">{r.desc}</div> */}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {role === 'collector' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Assigned Tax Collection Location
                    </label>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-900 border border-white/15 rounded-lg text-white focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none"
                      required
                    >
                      <option value="" className="bg-slate-900 text-slate-400">Select your assigned location...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id} className="bg-slate-900 text-white">
                          {loc.name} - {loc.ward}, {loc.region}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1">Select the tax office where you work as a collector</p>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none transition-shadow"
                placeholder="hildaraphael08@gmail.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/15 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none transition-shadow"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className={`text-sm p-3 rounded-lg ${error.includes('created') ? 'bg-green-950/50 text-green-400 border border-green-500/20' : 'bg-red-950/50 text-red-400 border border-red-500/20'}`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#FFE600] hover:bg-[#ebd500] text-slate-950 font-bold rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-950" />}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            <p className="text-xs text-center text-slate-400">
              © Hilda Raphael
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}