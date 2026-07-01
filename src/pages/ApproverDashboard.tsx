import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { RelocationRequest, Profile, Location } from '../types';
import { Shield, Clock, CheckCircle, XCircle, Loader2, User, MapPin, FileText, Search, Eye, Users } from 'lucide-react';

type View = 'pending' | 'all';

interface CollectorWithLocation extends Profile {
  assigned_location?: Location;
}

export function ApproverDashboard() {
  const { profile } = useAuth();
  const [view, setView] = useState<View>('pending');
  const [requests, setRequests] = useState<RelocationRequest[]>([]);
  const [collectors, setCollectors] = useState<CollectorWithLocation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RelocationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedCollectorId, setSelectedCollectorId] = useState('');

  useEffect(() => {
    loadData();
  }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);

    const [requestsRes, collectorsRes, locationsRes] = await Promise.all([
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
      supabase
        .from('profiles')
        .select('id, full_name, phone, role, location_id')
        .eq('role', 'collector'),
      supabase.from('locations').select('*').order('name'),
    ]);

    if (requestsRes.data) setRequests(requestsRes.data as RelocationRequest[]);

    if (collectorsRes.data && locationsRes.data) {
      const locs = locationsRes.data as Location[];
      setLocations(locs);
      const enrichedCollectors = (collectorsRes.data as Profile[]).map(collector => ({
        ...collector,
        assigned_location: locs.find(l => l.id === collector.location_id),
      }));
      setCollectors(enrichedCollectors);
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
    const { data } = await supabase
      .from('relocation_requests')
      .select(`
        *,
        taxpayer:profiles!relocation_requests_taxpayer_id_fkey(id, full_name, phone, role),
        current_location:locations!relocation_requests_current_location_id_fkey(*),
        new_location:locations!relocation_requests_new_location_id_fkey(*),
        business_type:business_types(*),
        assigned_collector:profiles!relocation_requests_assigned_collector_id_fkey(id, full_name, phone, role, location_id)
      `)
      .order('created_at', { ascending: false });
    if (data) setRequests(data as RelocationRequest[]);
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

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Taxpayer</p>
                      <p className="font-medium">{request.taxpayer?.full_name}</p>
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
                </div>

                {request.assigned_collector && (
                  <div className="bg-[#FFE600]/10 border border-[#FFE600]/20 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-900" />
                    <div className="text-sm">
                      <span className="text-slate-900 font-medium">Assigned Collector:</span>{' '}
                      <span className="text-slate-950 font-bold">{request.assigned_collector.full_name}</span>
                    </div>
                  </div>
                )}

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
                  <p className="font-medium">{selectedRequest.taxpayer?.full_name}</p>
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