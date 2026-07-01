import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { RelocationRequest, TaxpayerFinance, BusinessType, Location, Profile } from '../types';
import { MapPin, CheckCircle, Clock, User, DollarSign, Loader2, Search, Eye, FileText, Settings, Building, Users } from 'lucide-react';

type View = 'pending' | 'all' | 'settings';

interface RequestWithFinance extends RelocationRequest {
  finances?: TaxpayerFinance[];
}

export function CollectorDashboard() {
  const { profile, updateProfile } = useAuth();
  const [view, setView] = useState<View>('pending');
  const [requests, setRequests] = useState<RequestWithFinance[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithFinance | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [debtAmount, setDebtAmount] = useState('');
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile]);

  async function loadData() {
    if (!profile) return;
    setLoading(true);

    const [requestsRes, businessTypesRes, locationsRes] = await Promise.all([
      supabase
        .from('relocation_requests')
        .select(`
          *,
          taxpayer:profiles!relocation_requests_taxpayer_id_fkey(id, full_name, phone, role),
          current_location:locations!relocation_requests_current_location_id_fkey(*),
          new_location:locations!relocation_requests_new_location_id_fkey(*),
          business_type:business_types(*),
          assigned_collector:profiles!relocation_requests_assigned_collector_id_fkey(id, full_name, phone, role)
        `)
        .or(`new_location_id.eq.${profile.location_id},assigned_collector_id.eq.${profile.id}`)
        .order('created_at', { ascending: false }),
      supabase.from('business_types').select('*'),
      supabase.from('locations').select('*').order('name'),
    ]);

    if (requestsRes.data) {
      const requestsWithFinances = await Promise.all(
        (requestsRes.data as RelocationRequest[]).map(async (req) => {
          const { data: finances } = await supabase
            .from('taxpayer_finances')
            .select('*')
            .eq('user_id', req.taxpayer_id);
          return { ...req, finances: finances || [] };
        })
      );
      setRequests(requestsWithFinances);
    }

    if (businessTypesRes.data) {
      setBusinessTypes(businessTypesRes.data as BusinessType[]);
    }

    if (locationsRes.data) {
      setLocations(locationsRes.data as Location[]);
      setSelectedLocationId(profile.location_id || '');
    }

    setLoading(false);
  }

  async function handleUpdateLocation() {
    if (!selectedLocationId) {
      alert('Please select a location');
      return;
    }
    setSavingLocation(true);
    try {
      await updateProfile({ location_id: selectedLocationId });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update location');
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleVerify(requestId: string) {
    if (debtAmount === '' || isNaN(parseFloat(debtAmount))) {
      alert('Please enter a valid debt amount');
      return;
    }

    setProcessing(requestId);
    try {
      const { error: updateError } = await supabase
        .from('relocation_requests')
        .update({
          status: 'COMPLETED',
          verified_at: new Date().toISOString(),
          verified_by: profile?.id,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      const request = requests.find(r => r.id === requestId);
      if (request) {
        const existingFinance = request.finances?.[0];
        if (existingFinance) {
          await supabase
            .from('taxpayer_finances')
            .update({
              location_id: request.new_location_id,
              outstanding_debt: parseFloat(debtAmount),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingFinance.id);
        } else {
          await supabase.from('taxpayer_finances').insert({
            user_id: request.taxpayer_id,
            location_id: request.new_location_id,
            outstanding_debt: parseFloat(debtAmount),
          });
        }
      }

      setShowVerifyModal(false);
      setDebtAmount('');
      setSelectedRequest(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete verification');
    } finally {
      setProcessing(null);
    }
  }

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.tracking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.taxpayer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (view === 'pending') {
      return matchesSearch && r.status === 'AWAITING_VERIFICATION';
    }
    return matchesSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'AWAITING_VERIFICATION').length,
    assignedToMe: requests.filter(r => r.assigned_collector_id === profile?.id).length,
    completed: requests.filter(r => r.status === 'COMPLETED').length,
  };

  const statusColors: Record<string, string> = {
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
    APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
    AWAITING_VERIFICATION: 'bg-purple-100 text-purple-800 border-purple-200',
    COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  };

  function calculateProjectedTax(request: RequestWithFinance): number {
    const businessType = businessTypes.find(bt => bt.id === request.business_type_id);
    if (!businessType) return 0;
    return businessType.base_tax_rate * businessType.zone_multiplier;
  }

  function getAssignedLocationName(): string {
    const loc = locations.find(l => l.id === profile?.location_id);
    return loc?.name || 'Not Assigned';
  }

  if (loading) {
    return (
      <Layout title="Loading..." subtitle="Fetching relocation requests">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#FFE600] animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={`Tax Collector Dashboard`}
      subtitle={`Area: ${getAssignedLocationName()}`}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        <div className="bg-white rounded-xl p-4 shadow-sm border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.pending}</p>
              <p className="text-xs text-slate-500">Awaiting</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">{stats.assignedToMe}</p>
              <p className="text-xs text-slate-500">Assigned to Me</p>
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
      </div>

      <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 w-fit">
        <button
          onClick={() => setView('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'pending'
              ? 'bg-[#FFE600] text-slate-950 font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          Awaiting ({stats.pending})
        </button>
        <button
          onClick={() => setView('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'all'
              ? 'bg-[#FFE600] text-slate-950 font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          All Requests
        </button>
        <button
          onClick={() => setView('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'settings'
              ? 'bg-[#FFE600] text-slate-950 font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {view === 'settings' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Building className="w-5 h-5 text-[#FFE600]" />
              Area of Operation
            </h3>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Your Assigned Tax Collection Location
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none bg-white"
              >
                <option value="">Select a location...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name} - {loc.ward}, {loc.region}</option>
                ))}
              </select>
            </div>

            {profile?.location_id && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-slate-700 mb-1">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">Current Assignment</span>
                </div>
                <p className="text-slate-800">
                  {locations.find(l => l.id === profile.location_id)?.name || 'Not assigned'}
                </p>
              </div>
            )}

            <button
              onClick={handleUpdateLocation}
              disabled={savingLocation || !selectedLocationId || selectedLocationId === profile?.location_id}
              className="w-full py-3 px-4 bg-[#FFE600] text-slate-950 font-bold rounded-lg hover:bg-[#ebd500] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingLocation && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Area of Operation
            </button>
          </div>
        </div>
      )}

      {view !== 'settings' && (
        <>
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none"
              placeholder="Search by ID or taxpayer name..."
            />
          </div>

          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
                <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {view === 'pending' ? 'No requests awaiting verification.' : 'No requests found.'}
                </p>
              </div>
            ) : (
              filteredRequests.map(request => (
                <div key={request.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div
                    className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <p className="font-mono text-lg font-semibold text-slate-900">{request.tracking_id}</p>
                        <p className="text-sm text-slate-500">
                          Submitted {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {request.assigned_collector_id === profile?.id && (
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
                            Assigned to You
                          </span>
                        )}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${statusColors[request.status]}`}>
                          {request.status.replace('_', ' ')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-slate-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-500">Taxpayer</p>
                          <p className="font-medium">{request.taxpayer?.full_name}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">From Location</p>
                        <p className="font-medium">{request.current_location?.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Business Type</p>
                        <p className="font-medium">{request.business_type?.name}</p>
                      </div>
                    </div>
                  </div>

                  {expandedRequest === request.id && (
                    <div className="border-t border-slate-200 p-6 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white rounded-lg p-4 border border-slate-200">
                          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Taxpayer Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Name</span>
                              <span className="font-medium">{request.taxpayer?.full_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Phone</span>
                              <span className="font-medium">{request.taxpayer?.phone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-slate-200">
                          <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Financial Assessment
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Outstanding Debt</span>
                              <span className="font-bold text-red-600">
                                {(request.finances?.[0]?.outstanding_debt || 0).toLocaleString()} TZS
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {request.status === 'AWAITING_VERIFICATION' && (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setDebtAmount((request.finances?.[0]?.outstanding_debt || 0).toString());
                            setShowVerifyModal(true);
                          }}
                          className="w-full py-3 px-4 bg-[#FFE600] text-slate-950 font-bold rounded-lg hover:bg-[#ebd500] transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Verify & Receive Taxpayer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showVerifyModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Verify & Receive Taxpayer</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Debt Amount (TZS)</label>
              <input
                type="number"
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FFE600] focus:border-[#FFE600] outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="flex-1 py-2 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerify(selectedRequest.id)}
                className="flex-1 py-2 px-4 bg-[#FFE600] text-slate-950 font-bold rounded-lg hover:bg-[#ebd500]"
              >
                Complete Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}