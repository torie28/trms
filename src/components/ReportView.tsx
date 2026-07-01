import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { RelocationRequest, TaxpayerFinance, BusinessType } from '../types';
import { FileText, CheckCircle, XCircle, Clock, AlertCircle, DollarSign, TrendingUp, Download, Calendar, MapPin, User } from 'lucide-react';

interface ReportRow {
  tracking_id: string;
  taxpayer_name: string;
  from_location: string;
  to_location: string;
  business_type: string;
  status: string;
  submitted: string;
  completed: string | null;
  outstanding_debt: number;
  projected_tax: number;
}

const statusColors: Record<string, string> = {
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  AWAITING_VERIFICATION: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

const statusIcons: Record<string, any> = {
  PENDING_APPROVAL: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  AWAITING_VERIFICATION: AlertCircle,
  COMPLETED: CheckCircle,
};

export function ReportView() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);

  useEffect(() => {
    if (profile) loadReport();
  }, [profile]);

  async function loadReport() {
    setLoading(true);
    try {
      let query = supabase
        .from('relocation_requests')
        .select(`
          *,
          taxpayer:profiles!relocation_requests_taxpayer_id_fkey(id, full_name),
          current_location:locations!relocation_requests_current_location_id_fkey(name),
          new_location:locations!relocation_requests_new_location_id_fkey(name),
          business_type:business_types(*)
        `)
        .order('created_at', { ascending: false });

      // Scope by role
      if (profile!.role === 'taxpayer') {
        query = query.eq('taxpayer_id', profile!.id);
      } else if (profile!.role === 'collector') {
        query = query.or(
          `new_location_id.eq.${profile!.location_id},assigned_collector_id.eq.${profile!.id}`
        );
      }
      // approver sees everything (no extra filter)

      const [requestsRes, btRes] = await Promise.all([
        query,
        supabase.from('business_types').select('*'),
      ]);

      if (btRes.data) setBusinessTypes(btRes.data as BusinessType[]);

      if (!requestsRes.data) {
        setRows([]);
        return;
      }

      const requests = requestsRes.data as RelocationRequest[];

      // Fetch finances for all taxpayer IDs
      const taxpayerIds = [...new Set(requests.map(r => r.taxpayer_id))];
      const { data: finances } = taxpayerIds.length
        ? await supabase
            .from('taxpayer_finances')
            .select('*')
            .in('user_id', taxpayerIds)
        : { data: [] };

      const financeMap: Record<string, TaxpayerFinance> = {};
      (finances || []).forEach((f: TaxpayerFinance) => {
        financeMap[f.user_id] = f;
      });

      const mapped: ReportRow[] = requests.map((r: any) => {
        const bt: BusinessType | undefined = r.business_type;
        const projectedTax = bt ? bt.base_tax_rate * bt.zone_multiplier : 0;
        const finance = financeMap[r.taxpayer_id];
        return {
          tracking_id: r.tracking_id,
          taxpayer_name: r.taxpayer?.full_name || '—',
          from_location: r.current_location?.name || '—',
          to_location: r.new_location?.name || '—',
          business_type: bt?.name || '—',
          status: r.status,
          submitted: r.created_at,
          completed: r.verified_at || null,
          outstanding_debt: finance?.outstanding_debt ?? 0,
          projected_tax: projectedTax,
        };
      });

      setRows(mapped);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filterStatus === 'ALL' ? rows : rows.filter(r => r.status === filterStatus);

  // Summary stats
  const totalRequests = rows.length;
  const completed = rows.filter(r => r.status === 'COMPLETED').length;
  const rejected = rows.filter(r => r.status === 'REJECTED').length;
  const pending = rows.filter(r => !['COMPLETED', 'REJECTED'].includes(r.status)).length;
  const totalDebt = rows.reduce((sum, r) => sum + r.outstanding_debt, 0);
  const totalProjectedTax = rows
    .filter(r => r.status === 'COMPLETED')
    .reduce((sum, r) => sum + r.projected_tax, 0);

  function downloadCSV() {
    const header = [
      'Tracking ID', 'Taxpayer', 'From', 'To', 'Business Type',
      'Status', 'Submitted', 'Completed', 'Outstanding Debt (TZS)', 'Projected Tax (TZS)',
    ].join(',');

    const dataRows = filtered.map(r =>
      [
        r.tracking_id,
        `"${r.taxpayer_name}"`,
        `"${r.from_location}"`,
        `"${r.to_location}"`,
        `"${r.business_type}"`,
        r.status,
        new Date(r.submitted).toLocaleDateString(),
        r.completed ? new Date(r.completed).toLocaleDateString() : '',
        r.outstanding_debt,
        r.projected_tax,
      ].join(',')
    );

    const csv = [header, ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-relocation-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const roleLabel =
    profile?.role === 'taxpayer'
      ? 'My Relocation Report'
      : profile?.role === 'collector'
      ? 'Zone Tax Report'
      : 'System-Wide Report';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {roleLabel}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Generated on {new Date().toLocaleString()} — {filtered.length} record(s)
          </p>
        </div>
        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Download CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Requests', value: totalRequests, icon: FileText, color: 'blue' },
          { label: 'Completed', value: completed, icon: CheckCircle, color: 'green' },
          { label: 'Pending / Active', value: pending, icon: Clock, color: 'amber' },
          { label: 'Rejected', value: rejected, icon: XCircle, color: 'red' },
          { label: 'Total Debt (TZS)', value: totalDebt.toLocaleString(), icon: DollarSign, color: 'red' },
          { label: 'Projected Tax (TZS)', value: totalProjectedTax.toLocaleString(), icon: TrendingUp, color: 'green' },
        ].map(card => {
          const Icon = card.icon;
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            amber: 'bg-amber-100 text-amber-600',
            red: 'bg-red-100 text-red-600',
          };
          return (
            <div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className={`inline-flex p-2 rounded-lg mb-2 ${colorMap[card.color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-bold text-slate-800">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'AWAITING_VERIFICATION', 'COMPLETED', 'REJECTED'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filterStatus === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
            {s !== 'ALL' && (
              <span className="ml-1 opacity-70">
                ({rows.filter(r => r.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No records match the selected filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tracking ID</th>
                  {profile?.role !== 'taxpayer' && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> Taxpayer</span>
                    </th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> From → To</span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Submitted</span>
                  </th>
                  {profile?.role !== 'taxpayer' && (
                    <>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Debt (TZS)</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Proj. Tax (TZS)</th>
                    </>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(row => {
                  const StatusIcon = statusIcons[row.status];
                  return (
                    <tr key={row.tracking_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-blue-600 font-medium whitespace-nowrap">
                        {row.tracking_id}
                      </td>
                      {profile?.role !== 'taxpayer' && (
                        <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                          {row.taxpayer_name}
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        <span className="text-slate-400">{row.from_location}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <span className="font-medium text-slate-700">{row.to_location}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.business_type}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[row.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {row.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(row.submitted).toLocaleDateString('en-TZ')}
                      </td>
                      {profile?.role !== 'taxpayer' && (
                        <>
                          <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${row.outstanding_debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {row.outstanding_debt.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-blue-600 whitespace-nowrap">
                            {row.projected_tax.toLocaleString()}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {row.completed ? new Date(row.completed).toLocaleDateString('en-TZ') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
