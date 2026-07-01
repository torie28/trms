import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { RelocationRequest, Location, BusinessType, Notification } from '../types';
import { Plus, FileText, Bell, Clock, CheckCircle, XCircle, AlertCircle, Loader2, TrendingUp, MapPin } from 'lucide-react';

type View = 'dashboard' | 'submit' | 'requests' | 'notifications';

export function TaxpayerDashboard() {
  const { profile } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [requests, setRequests] = useState<RelocationRequest[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [currentLocationId, setCurrentLocationId] = useState('');
  const [newLocationId, setNewLocationId] = useState('');
  const [businessTypeId, setBusinessTypeId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [profile]);

  async function loadInitialData() {
    if (!profile) return;
    setLoading(true);

    const [requestsRes, locationsRes, businessTypesRes, notificationsRes] = await Promise.all([
      supabase
        .from('relocation_requests')
        .select('*, current_location:locations!relocation_requests_current_location_id_fkey(*), new_location:locations!relocation_requests_new_location_id_fkey(*), business_type:business_types(*)')
        .eq('taxpayer_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('locations').select('*').order('name'),
      supabase.from('business_types').select('*').order('name'),
      supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
    ]);

    if (requestsRes.data) setRequests(requestsRes.data as RelocationRequest[]);
    if (locationsRes.data) setLocations(locationsRes.data as Location[]);
    if (businessTypesRes.data) setBusinessTypes(businessTypesRes.data as BusinessType[]);
    if (notificationsRes.data) setNotifications(notificationsRes.data as Notification[]);

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !currentLocationId || !newLocationId || !businessTypeId || !reason) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('relocation_requests').insert({
        taxpayer_id: profile.id,
        current_location_id: currentLocationId,
        new_location_id: newLocationId,
        business_type_id: businessTypeId,
        reason,
        status: 'PENDING_APPROVAL',
      });

      if (error) throw error;

      setNewLocationId('');
      setBusinessTypeId('');
      setReason('');
      setView('requests');
      loadInitialData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  }

  async function markAsRead(notificationId: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    loadInitialData();
  }

  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingRequests = requests.filter(r => r.status !== 'COMPLETED' && r.status !== 'REJECTED');
  const statusColors: Record<string, string> = {
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
    APPROVED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    AWAITING_VERIFICATION: 'bg-purple-100 text-purple-800 border-purple-200',
    COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  };

  const statusIcons: Record<string, any> = {
    PENDING_APPROVAL: Clock,
    APPROVED: CheckCircle,
    REJECTED: XCircle,
    AWAITING_VERIFICATION: AlertCircle,
    COMPLETED: CheckCircle,
  };

  if (loading) {
    return (
      <Layout title="Loading..." subtitle="Fetching your data">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={view === 'dashboard' ? 'My Dashboard' : view === 'submit' ? 'New Relocation Request' : view === 'requests' ? 'My Requests' : 'Notifications'}
      subtitle={view === 'dashboard' ? 'Manage your taxpayer relocation requests' : undefined}
    >
      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 w-fit">
        {[
          { id: 'dashboard' as View, label: 'Dashboard', icon: TrendingUp },
          { id: 'submit' as View, label: 'New Request', icon: Plus },
          { id: 'requests' as View, label: 'My Requests', icon: FileText },
          { id: 'notifications' as View, label: 'Notifications', icon: Bell, badge: unreadCount },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === tab.id
                ? 'bg-yellow-400 text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${view === tab.id ? 'bg-yellow-500 text-slate-900' : 'bg-red-500 text-white'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Requests</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{requests.length}</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                  <FileText className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Pending</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{pendingRequests.length}</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Completed</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{requests.filter(r => r.status === 'COMPLETED').length}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Requests */}
          {requests.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Recent Requests</h3>
                <button
                  onClick={() => setView('requests')}
                  className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                >
                  View all
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {requests.slice(0, 3).map(request => {
                  const StatusIcon = statusIcons[request.status];
                  return (
                    <div key={request.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{request.tracking_id}</p>
                        <p className="text-sm text-slate-500">
                          To: {request.new_location?.name}
                        </p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs border ${statusColors[request.status]}`}>
                        <StatusIcon className="w-3 h-3" />
                        {request.status.replace('_', ' ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {requests.length === 0 && (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-50 border border-yellow-100 rounded-full mb-4">
                <Plus className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">No Relocation Requests Yet</h3>
              <p className="text-slate-500 mb-4">Start by submitting a request to relocate your tax base</p>
              <button
                onClick={() => setView('submit')}
                className="px-4 py-2 bg-yellow-400 text-slate-900 font-medium rounded-lg hover:bg-yellow-500 transition-colors shadow-sm"
              >
                Submit New Request
              </button>
            </div>
          )}
        </div>
      )}

      {/* Submit Request View */}
      {view === 'submit' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Current Location / Ward
                </label>
                <select
                  value={currentLocationId}
                  onChange={(e) => setCurrentLocationId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none bg-white"
                  required
                >
                  <option value="">Select your current location...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} - {loc.ward}, {loc.region}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Target Location / Ward
                </label>
                <select
                  value={newLocationId}
                  onChange={(e) => setNewLocationId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none bg-white"
                  required
                >
                  <option value="">Select new location...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} - {loc.ward}, {loc.region}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Business Type
                </label>
                <select
                  value={businessTypeId}
                  onChange={(e) => setBusinessTypeId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none bg-white"
                  required
                >
                  <option value="">Select business type...</option>
                  {businessTypes.map(bt => (
                    <option key={bt.id} value={bt.id}>{bt.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Relocation
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none resize-none"
                  rows={4}
                  placeholder="Explain why you need to relocate your business..."
                  required
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-slate-800">
                  <strong>Note:</strong> After submission, your request will be reviewed by the Registry Officer.
                  You will receive a tracking ID and SMS/email notifications at each step.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-yellow-400 text-slate-900 font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Relocation Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Requests View */}
      {view === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
              <p className="text-slate-500">No requests submitted yet.</p>
            </div>
          ) : (
            requests.map(request => {
              const StatusIcon = statusIcons[request.status];
              return (
                <div key={request.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-mono text-lg font-semibold text-yellow-600">{request.tracking_id}</p>
                      <p className="text-sm text-slate-500">{new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${statusColors[request.status]}`}>
                      <StatusIcon className="w-4 h-4" />
                      {request.status.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-slate-500">From</p>
                        <p className="font-medium">{request.current_location?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="text-slate-500">To</p>
                        <p className="font-medium">{request.new_location?.name}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500">Business Type</p>
                      <p className="font-medium">{request.business_type?.name}</p>
                    </div>
                  </div>

                  {request.rejection_reason && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <strong>Rejection Reason:</strong> {request.rejection_reason}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Notifications View */}
      {view === 'notifications' && (
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No notifications yet.</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl shadow-sm border p-4 flex items-start justify-between ${
                  notification.read ? 'border-slate-200' : 'border-yellow-300 bg-yellow-50/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    notification.type === 'success' ? 'bg-green-100' :
                    notification.type === 'warning' ? 'bg-amber-100' :
                    notification.type === 'error' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    <Bell className={`w-4 h-4 ${
                      notification.type === 'success' ? 'text-green-600' :
                      notification.type === 'warning' ? 'text-amber-600' :
                      notification.type === 'error' ? 'text-red-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-slate-800">{notification.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {!notification.read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="text-xs text-yellow-600 hover:text-yellow-700 font-medium"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Layout>
  );
}