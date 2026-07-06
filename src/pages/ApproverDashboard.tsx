import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { RelocationRequest, Profile, Location, UserRole } from '../types';
import { Shield, Clock, CheckCircle, XCircle, Loader2, User, MapPin, FileText, Search, Eye, Users, Settings, Building, Plus, Edit3, Trash2, Ban } from 'lucide-react';

type View = 'pending' | 'all' | 'settings' | 'users';

interface CollectorWithLocation extends Profile {
  assigned_location?: Location;
}

export function ApproverDashboard() {
  const { profile, signUp } = useAuth();
  const [view, setView] = useState<View>('pending');
  const [requests, setRequests] = useState<RelocationRequest[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [collectors, setCollectors] = useState<CollectorWithLocation[]>([]);
  const [taxpayers, setTaxpayers] = useState<Profile[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RelocationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedCollectorId, setSelectedCollectorId] = useState('');
  const [selectedCollectorForSettings, setSelectedCollectorForSettings] = useState<CollectorWithLocation | null>(null);
  const [newLocationForCollector, setNewLocationForCollector] = useState('');
  const [savingCollectorLocation, setSavingCollectorLocation] = useState(false);
  const [showCollectorForm, setShowCollectorForm] = useState(false);
  const [collectorForm, setCollectorForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    locationId: '',
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    role: 'collector' as UserRole,
    location_id: '',
  });
  const [savingUser, setSavingUser] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [userFeedback, setUserFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [profile]);

  function enrichRequestsWithProfiles(requests: RelocationRequest[], profiles: Profile[]) {
    const profileMap = new Map(profiles.map(profile => [profile.id, profile]));

    return requests.map(request => ({
      ...request,
      taxpayer: request.taxpayer ?? profileMap.get(request.taxpayer_id),
      assigned_collector: request.assigned_collector ?? (request.assigned_collector_id ? profileMap.get(request.assigned_collector_id) : undefined),
    }));
  }

  async function loadData() {
    if (!profile) return;
    setLoading(true);

    const [requestsRes, profilesRes, locationsRes] = await Promise.all([
      supabase
        .from('relocation_requests')
        .select(`
          *,
          taxpayer:profiles!relocation_requests_taxpayer_id_fkey(id, full_name, phone, role),
          current_location:locations!relocation_requests_current_location_id_fkey(*),
          new_location:locations!relocation_requests_new_location_id_fkey(*),
          business_type:business_types(*),
          assigned_collector:profiles!relocation_requests_assigned_collector_id_fkey(id, full_name, phone, role, location_id)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('locations').select('*').order('name'),
    ]);

    if (requestsRes.data) {
      const requestData = requestsRes.data as RelocationRequest[];
      if (profilesRes.data) {
        const profileData = profilesRes.data as Profile[];
        setRequests(enrichRequestsWithProfiles(requestData, profileData));
      } else {
        setRequests(requestData);
      }
    }

    if (profilesRes.data) {
      const profileData = profilesRes.data as Profile[];
      setUsers(profileData);
      setTaxpayers(profileData.filter(profile => profile.role === 'taxpayer'));
    }

    if (locationsRes.data) {
      const locs = locationsRes.data as Location[];
      setLocations(locs);

      if (profilesRes.data) {
        const profileData = profilesRes.data as Profile[];
        const enrichedCollectors = profileData
          .filter(profile => profile.role === 'collector')
          .map(collector => ({
            ...collector,
            assigned_location: locs.find(l => l.id === collector.location_id),
          }));
        setCollectors(enrichedCollectors);
      }
    }

    setLoading(false);
  }

  async function handleApprove() {
    if (!selectedRequest) return;
    setProcessing(selectedRequest.id);
    try {
      const { error } = await supabase
        .from('relocation_requests')
        .update({
          status: 'AWAITING_VERIFICATION',
          assigned_collector_id: selectedCollectorId || null,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;
      setShowApproveModal(false);
      setSelectedCollectorId('');
      setSelectedRequest(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(requestId: string) {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setProcessing(requestId);
    try {
      const { error } = await supabase
        .from('relocation_requests')
        .update({
          status: 'REJECTED',
          rejection_reason: rejectionReason,
        })
        .eq('id', requestId);

      if (error) throw error;
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      loadRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  }

  async function loadRequests() {
    const [{ data: requestData }, { data: profileData }] = await Promise.all([
      supabase
        .from('relocation_requests')
        .select(`
          *,
          taxpayer:profiles!relocation_requests_taxpayer_id_fkey(id, full_name, phone, role),
          current_location:locations!relocation_requests_current_location_id_fkey(*),
          new_location:locations!relocation_requests_new_location_id_fkey(*),
          business_type:business_types(*),
          assigned_collector:profiles!relocation_requests_assigned_collector_id_fkey(id, full_name, phone, role, location_id)
        `)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name'),
    ]);

    if (requestData) {
      const profiles = (profileData as Profile[]) ?? [];
      setRequests(enrichRequestsWithProfiles(requestData as RelocationRequest[], profiles));
    }
  }

  async function handleUpdateCollectorLocation() {
    if (!selectedCollectorForSettings || !newLocationForCollector) {
      alert('Please select a collector and location');
      return;
    }
    setSavingCollectorLocation(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ location_id: newLocationForCollector })
        .eq('id', selectedCollectorForSettings.id);

      if (error) throw error;

      setSelectedCollectorForSettings(null);
      setNewLocationForCollector('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update collector location');
    } finally {
      setSavingCollectorLocation(false);
    }
  }

  async function handleCreateCollector(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!collectorForm.fullName.trim() || !collectorForm.email.trim() || !collectorForm.password.trim()) {
      alert('Please fill in the collector name, email, and password');
      return;
    }

    setSavingUser(true);
    setUserFeedback(null);

    try {
      await signUp(
        collectorForm.email.trim(),
        collectorForm.password,
        collectorForm.fullName.trim(),
        collectorForm.phone.trim(),
        'collector',
        collectorForm.locationId || undefined
      );

      setCollectorForm({
        fullName: '',
        phone: '',
        email: '',
        password: '',
        locationId: '',
      });
      setShowCollectorForm(false);
      setUserFeedback('Tax collector created successfully.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create collector');
    } finally {
      setSavingUser(false);
    }
  }

  function startEditUser(user: Profile) {
    setEditingUserId(user.id);
    setEditForm({
      full_name: user.full_name,
      phone: user.phone || '',
      role: user.role,
      location_id: user.location_id || '',
    });
  }

  async function handleSaveEditUser() {
    if (!editingUserId) return;

    setSavingEdit(true);
    setUserFeedback(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim(),
          phone: editForm.phone.trim() || null,
          role: editForm.role,
          location_id: editForm.role === 'collector' ? editForm.location_id || null : null,
        })
        .eq('id', editingUserId);

      if (error) throw error;

      setEditingUserId(null);
      setUserFeedback('User updated successfully.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleUserStatus(user: Profile) {
    setTogglingUserId(user.id);
    setUserFeedback(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !(user.is_active ?? true) })
        .eq('id', user.id);

      if (error) throw error;
      setUserFeedback(`${user.full_name} ${user.is_active === false ? 'reactivated' : 'deactivated'} successfully.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    } finally {
      setTogglingUserId(null);
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!window.confirm(`Delete ${userName} from the system?`)) {
      return;
    }

    setDeletingUserId(userId);
    setUserFeedback(null);

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      setUserFeedback(`${userName} deleted successfully.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  }

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.tracking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.taxpayer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (view === 'pending') {
      return matchesSearch && r.status === 'PENDING_APPROVAL';
    }
    return matchesSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING_APPROVAL').length,
    approved: requests.filter(r => r.status === 'AWAITING_VERIFICATION').length,
    completed: requests.filter(r => r.status === 'COMPLETED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  };

  const statusColors: Record<string, string> = {
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
    APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    AWAITING_VERIFICATION: 'bg-purple-100 text-purple-800 border-purple-200',
    COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  };

  if (loading) {
    return (
      <Layout title="Loading..." subtitle="Fetching requests">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#FFE600] animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Registry Officer Dashboard"
      subtitle="Review and validate taxpayer relocation requests"
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFE600]/20 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.approved}</p>
              <p className="text-xs text-slate-500">In Review</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-200">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              <p className="text-xs text-slate-500">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 w-fit">
          <button
            onClick={() => setView('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'pending'
                ? 'bg-[#FFE600] text-slate-950 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setView('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'all'
                ? 'bg-[#FFE600] text-slate-950 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            All Requests
          </button>
          <button
            onClick={() => setView('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'users'
                ? 'bg-[#FFE600] text-slate-950 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>
          <button
            onClick={() => setView('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'settings'
                ? 'bg-[#FFE600] text-slate-950 shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none"
            placeholder="Search by ID or name..."
          />
        </div>
      </div>

      {view === 'users' && (
        <div className="max-w-7xl space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#FFE600]" />
                  User Management
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Collectors are added here. Payers are handled through the registration page.
                </p>
              </div>
              <button
                onClick={() => setShowCollectorForm(prev => !prev)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFE600] text-slate-950 font-semibold rounded-lg hover:bg-[#ebd500] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Collector
              </button>
            </div>

            {userFeedback && (
              <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {userFeedback}
              </div>
            )}

            {showCollectorForm && (
              <form onSubmit={handleCreateCollector} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 p-4 border border-slate-200 rounded-xl bg-slate-50">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={collectorForm.fullName}
                    onChange={(e) => setCollectorForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={collectorForm.phone}
                    onChange={(e) => setCollectorForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={collectorForm.email}
                    onChange={(e) => setCollectorForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none"
                    placeholder="collector@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={collectorForm.password}
                    onChange={(e) => setCollectorForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none"
                    placeholder="Create a temporary password"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Assign Collector to Location</label>
                  <select
                    value={collectorForm.locationId}
                    onChange={(e) => setCollectorForm(prev => ({ ...prev, locationId: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none bg-white"
                  >
                    <option value="">Select a location (optional)</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} - {loc.ward}, {loc.region}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCollectorForm(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingUser}
                    className="px-5 py-2 bg-[#FFE600] text-slate-950 font-bold rounded-lg hover:bg-[#ebd500] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingUser && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Collector
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr className="text-left text-sm text-slate-500">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.filter(user => 
                    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.phone?.includes(searchTerm)
                  ).map(user => (
                  {users.map(user => (
                    <tr key={user.id} className="text-sm text-slate-700">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-800">{user.full_name}</div>
                        <div className="text-xs text-slate-500">{user.phone || 'No phone provided'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="capitalize">{user.role}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${user.is_active === false ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {user.is_active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {editingUserId === user.id ? (
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="text"
                                value={editForm.full_name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                placeholder="Name"
                              />
                              <input
                                type="tel"
                                value={editForm.phone}
                                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                placeholder="Phone"
                              />
                              <select
                                value={editForm.role}
                                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                              >
                                <option value="collector">Collector</option>
                                <option value="taxpayer">Taxpayer</option>
                                <option value="approver">Approver</option>
                              </select>
                              {editForm.role === 'collector' && (
                                <select
                                  value={editForm.location_id}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, location_id: e.target.value }))}
                                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                >
                                  <option value="">Select location</option>
                                  {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                  ))}
                                </select>
                              )}
                              <button
                                onClick={handleSaveEditUser}
                                disabled={savingEdit}
                                className="px-3 py-2 bg-[#FFE600] text-slate-950 rounded-lg text-sm font-semibold"
                              >
                                {savingEdit ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditUser(user)}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(user)}
                                disabled={togglingUserId === user.id}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium disabled:opacity-50"
                              >
                                <Ban className="w-4 h-4" />
                                {user.is_active === false ? 'Activate' : 'Deactivate'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.full_name)}
                                disabled={deletingUserId === user.id}
                                className="inline-flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div className="max-w-4xl">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Building className="w-5 h-5 text-[#FFE600]" />
              Manage Tax Collector Areas of Operation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Tax Collector
                </label>
                <select
                  value={selectedCollectorForSettings?.id || ''}
                  onChange={(e) => {
                    const collector = collectors.find(c => c.id === e.target.value);
                    setSelectedCollectorForSettings(collector || null);
                    setNewLocationForCollector('');
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none bg-white"
                >
                  <option value="">Choose a collector...</option>
                  {collectors.map(collector => (
                    <option key={collector.id} value={collector.id}>
                      {collector.full_name} ({collector.assigned_location?.name || 'Unassigned'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Assign to Location
                </label>
                <select
                  value={newLocationForCollector}
                  onChange={(e) => setNewLocationForCollector(e.target.value)}
                  disabled={!selectedCollectorForSettings}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select a location...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} - {loc.ward}, {loc.region}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedCollectorForSettings && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-slate-700 mb-1">
                  <User className="w-4 h-4" />
                  <span className="font-medium">Current Assignment</span>
                </div>
                <p className="text-slate-800">
                  {selectedCollectorForSettings.assigned_location?.name || 'Unassigned'}
                </p>
              </div>
            )}

            <button
              onClick={handleUpdateCollectorLocation}
              disabled={savingCollectorLocation || !selectedCollectorForSettings || !newLocationForCollector || newLocationForCollector === selectedCollectorForSettings?.location_id}
              className="w-full py-3 px-4 bg-[#FFE600] text-slate-950 font-bold rounded-lg hover:bg-[#ebd500] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingCollectorLocation && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Collector Area of Operation
            </button>
          </div>

          <div className="mt-8">
            <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#FFE600]" />
              All Tax Collectors
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collectors.map(collector => (
                <div key={collector.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-800">{collector.full_name}</p>
                      <p className="text-sm text-slate-500">{collector.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 mt-3 p-2 bg-slate-50 rounded">
                    <MapPin className="w-4 h-4 text-[#FFE600]" />
                    <span className="text-sm">{collector.assigned_location?.name || 'Unassigned'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view !== 'settings' && view !== 'users' && (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
              <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {view === 'pending' ? 'No pending requests to review.' : 'No requests found.'}
              </p>
            </div>
          ) : (
            filteredRequests.map(request => (
              <div key={request.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="font-mono text-lg font-semibold text-slate-900">{request.tracking_id}</p>
                      <p className="text-sm text-slate-500">
                        Submitted {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${statusColors[request.status]}`}>
                      {request.status.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500">Taxpayer</p>
                        <p className="font-medium">{request.taxpayer?.full_name || 'Unknown taxpayer'}</p>
                        {request.taxpayer?.phone && (
                          <p className="text-xs text-slate-400">{request.taxpayer.phone}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">From</p>
                      <p className="font-medium">{request.current_location?.name}</p>
                      <p className="text-xs text-slate-400">{request.current_location?.region}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">To</p>
                      <p className="font-medium">{request.new_location?.name}</p>
                      <p className="text-xs text-slate-400">{request.new_location?.region}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Business Type</p>
                      <p className="font-medium">{request.business_type?.name}</p>
                      <p className="text-xs text-slate-400">
                        Tax: {request.business_type?.base_tax_rate.toLocaleString()} TZS
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Assigned Collector</p>
                      {request.assigned_collector ? (
                        <div className="font-medium">
                          <a
                            href={`#/profile/${request.assigned_collector.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              window.history.pushState({}, '', `/profile/${request.assigned_collector!.id}`);
                              window.dispatchEvent(new PopStateEvent('popstate'));
                            }}
                            className="underline"
                          >
                            {request.assigned_collector.full_name}
                          </a>
                          {request.assigned_collector.phone && (
                            <div className="text-xs text-slate-700">{request.assigned_collector.phone}</div>
                          )}
                        </div>
                      ) : request.assigned_collector_id ? (
                        <div className="text-sm text-slate-500">Assigned (ID: {request.assigned_collector_id})</div>
                      ) : (
                        <div className="text-sm text-slate-500">Unassigned</div>
                      )}
                    </div>
                  </div>
 

                  <div className="bg-slate-50 rounded-lg p-4 mb-4">
                    <p className="text-xs text-slate-500 mb-1">Reason for Relocation</p>
                    <p className="text-slate-700">{request.reason}</p>
                  </div>

                  {(request.status === 'PENDING_APPROVAL' || request.status === 'AWAITING_VERIFICATION') && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setSelectedCollectorId(request.assigned_collector_id || '');
                          setShowApproveModal(true);
                        }}
                        disabled={processing === request.id}
                        className="flex-1 py-2 px-4 bg-[#FFE600] text-slate-950 font-bold rounded-lg hover:bg-[#ebd500] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        {request.status === 'PENDING_APPROVAL' ? 'Approve & Assign Collector' : 'Reassign Collector'}
                      </button>
                      {request.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectModal(true);
                          }}
                          disabled={processing === request.id}
                          className="py-2 px-4 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Reject Request</h3>
                <p className="text-sm text-slate-500">{selectedRequest.tracking_id}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none resize-none"
                rows={3}
                placeholder="Explain why this request is being rejected..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                className="flex-1 py-2 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedRequest.id)}
                disabled={processing === selectedRequest.id || !rejectionReason.trim()}
                className="flex-1 py-2 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing === selectedRequest.id && <Loader2 className="w-4 h-4 animate-spin" />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#FFE600] p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  {selectedRequest.status === 'PENDING_APPROVAL' ? 'Approve & Assign Collector' : 'Reassign Collector'}
                </h3>
                <p className="text-sm text-slate-500">{selectedRequest.tracking_id}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Taxpayer</p>
                  <p className="font-medium">{selectedRequest.taxpayer?.full_name || 'Unknown taxpayer'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Target Location</p>
                  <p className="font-medium">{selectedRequest.new_location?.name}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assign Tax Collector for Follow-up
              </label>
              <select
                value={selectedCollectorId}
                onChange={(e) => setSelectedCollectorId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none bg-white"
              >
                <option value="">Auto-assign to location's collector</option>
                {collectors.map(collector => (
                  <option key={collector.id} value={collector.id}>
                    {collector.full_name} - {collector.assigned_location?.name || 'Unassigned'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                The collector will verify the taxpayer's presence and complete the relocation
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedCollectorId('');
                  setSelectedRequest(null);
                }}
                className="flex-1 py-2 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={processing === selectedRequest.id}
                className="flex-1 py-2 px-4 bg-[#FFE600] text-slate-950 font-bold rounded-lg hover:bg-[#ebd500] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing === selectedRequest.id && <Loader2 className="w-4 h-4 animate-spin" />}
                {selectedRequest.status === 'PENDING_APPROVAL' ? 'Approve & Assign' : 'Update Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}