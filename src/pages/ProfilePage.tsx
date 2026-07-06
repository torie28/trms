import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Profile, Location } from '../types';
import { Loader2, User, MapPin } from 'lucide-react';

export function ProfilePage({ id }: { id: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('*, location:locations(*)').eq('id', id).single();
      if (data) {
        setProfile(data as Profile);
        // @ts-ignore
        setLocation(data.location || null);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <Layout title="Profile" subtitle="Loading...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#FFE600] animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout title="Profile" subtitle="Not found">
        <div className="p-8 bg-white rounded-xl shadow-sm border border-slate-200">Profile not found</div>
      </Layout>
    );
  }

  return (
    <Layout title={profile.full_name} subtitle={`${profile.role} profile`}>
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-50 rounded">
              <User className="w-6 h-6 text-[#FFE600]" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-800">{profile.full_name}</h3>
              <p className="text-sm text-slate-500">{profile.email}</p>
              <p className="text-sm text-slate-500 mt-2">{profile.phone || 'No phone provided'}</p>
              {location && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                  <MapPin className="w-4 h-4 text-[#FFE600]" />
                  <span>{location.name} — {location.region}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default ProfilePage;
