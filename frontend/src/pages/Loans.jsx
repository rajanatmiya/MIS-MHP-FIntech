import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, FileText, X } from 'lucide-react';
import LoanForm from '@/components/LoanForm';

const Loans = () => {
  const [loans, setLoans] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bankFilter, setBankFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [uniqueValues, setUniqueValues] = useState({ banks: [], statuses: [] });
  const { user } = useContext(AuthContext);

  useEffect(() => { fetchLoans(); fetchUniqueValues(); }, []);
  useEffect(() => { filterLoans(); }, [loans, searchTerm, statusFilter, bankFilter]);

  const fetchLoans = async () => {
    try {
      const response = await axios.get(`${API}/loans?limit=2000`);
      const data = response.data.loans || response.data;
      setLoans(data);
      setFilteredLoans(data);
    } catch (error) { toast.error('Failed to fetch loans'); }
    finally { setLoading(false); }
  };

  const fetchUniqueValues = async () => {
    try {
      const response = await axios.get(`${API}/analytics/unique-values`);
      setUniqueValues(response.data);
    } catch (error) { console.error('Failed to fetch unique values'); }
  };

  const filterLoans = () => {
    let filtered = loans;
    if (searchTerm) {
      filtered = filtered.filter(loan =>
        loan.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.contact_no?.includes(searchTerm)
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(loan => loan.status === statusFilter);
    if (bankFilter !== 'all') filtered = filtered.filter(loan => loan.bank === bankFilter);
    setFilteredLoans(filtered);
  };

  const handleDelete = async (loanId) => {
    if (!window.confirm('Delete this loan application?')) return;
    try {
      await axios.delete(`${API}/loans/${loanId}`);
      toast.success('Loan deleted');
      setLoans(prev => prev.filter(l => l.id !== loanId));
      setFilteredLoans(prev => prev.filter(l => l.id !== loanId));
    } catch (error) { toast.error('Failed to delete'); }
  };

  const handleFormSuccess = () => { setShowForm(false); setEditingLoan(null); fetchLoans(); };

  const getStatusStyle = (status) => {
    const map = {
      'Disbursed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Decline': 'bg-red-50 text-red-700 border-red-200',
      'Hold': 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const hasActiveFilters = statusFilter !== 'all' || bankFilter !== 'all' || searchTerm;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c587a]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 fade-in" data-testid="loans-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-800" data-testid="loans-title">Loan Applications</h1>
          <p className="text-[10px] text-slate-400 mt-0.5">Manage and track all applications</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingLoan(null)}
              size="sm"
              className="h-7 text-[11px] px-3 bg-[#2c587a] hover:bg-[#234a68]"
              data-testid="add-loan-button"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">{editingLoan ? 'Edit Loan' : 'New Loan Application'}</DialogTitle>
            </DialogHeader>
            <div aria-describedby="loan-form-description">
              <LoanForm loan={editingLoan} onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search customer, company, contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-[11px]"
            data-testid="search-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-[11px]" data-testid="status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[11px]">All Statuses</SelectItem>
            {uniqueValues.statuses?.map(s => <SelectItem key={s} value={s} className="text-[11px]">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={bankFilter} onValueChange={setBankFilter}>
          <SelectTrigger className="w-32 h-8 text-[11px]" data-testid="bank-filter">
            <SelectValue placeholder="Bank" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[11px]">All Banks</SelectItem>
            {uniqueValues.banks?.map(b => <SelectItem key={b} value={b} className="text-[11px]">{b}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-[10px] text-slate-400 hover:text-red-500 px-2 shrink-0"
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); setBankFilter('all'); }}
            data-testid="clear-filters-button"
          >
            <X className="w-3 h-3 mr-0.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Count */}
      <p className="text-[10px] text-slate-400">
        Showing <strong className="text-slate-600">{filteredLoans.length}</strong> of {loans.length} applications
      </p>

      {/* Desktop Table */}
      <div className="hidden md:block border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]" data-testid="loans-table">
            <thead>
              <tr className="bg-[#2c587a]/5 border-b border-slate-200">
                {['Customer', 'Company', 'Contact', 'Status', 'Bank', 'Agent', 'Date', 'Sanction', 'Disbursed', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-3 py-12 text-center">
                    <FileText className="w-8 h-8 mx-auto mb-1.5 text-slate-300" />
                    <p className="text-[11px] text-slate-400">No loan applications found</p>
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors" data-testid={`loan-row-${loan.id}`}>
                    <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{loan.customer_name}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{loan.company_name}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{loan.contact_no}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusStyle(loan.status)}`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{loan.bank}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{loan.agent_name}</td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{loan.month}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium whitespace-nowrap">{loan.sanction ? `₹${loan.sanction}` : '—'}</td>
                    <td className="px-3 py-2 text-emerald-700 font-medium whitespace-nowrap">{loan.disbursed ? `₹${loan.disbursed}` : '—'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          className="p-1 rounded hover:bg-blue-50 transition-colors"
                          onClick={() => { setEditingLoan(loan); setShowForm(true); }}
                          data-testid={`edit-loan-${loan.id}`}
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#2c587a]" />
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            className="p-1 rounded hover:bg-red-50 transition-colors"
                            onClick={() => handleDelete(loan.id)}
                            data-testid={`delete-loan-${loan.id}`}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {filteredLoans.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-8 h-8 mx-auto mb-1.5 text-slate-300" />
            <p className="text-[11px] text-slate-400">No loan applications found</p>
          </div>
        ) : (
          filteredLoans.map((loan) => (
            <div key={loan.id} className="border border-slate-200 rounded-lg bg-white p-3 shadow-sm" data-testid={`loan-card-${loan.id}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-800 truncate">{loan.customer_name}</h3>
                  <p className="text-[10px] text-slate-500 truncate">{loan.company_name}</p>
                </div>
                <span className={`shrink-0 ml-2 px-1.5 py-0.5 rounded text-[9px] font-medium border ${getStatusStyle(loan.status)}`}>
                  {loan.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mb-2">
                <div><span className="text-slate-400">Contact</span> <span className="text-slate-700 font-medium ml-1">{loan.contact_no}</span></div>
                <div><span className="text-slate-400">Bank</span> <span className="text-slate-700 font-medium ml-1">{loan.bank}</span></div>
                <div><span className="text-slate-400">Agent</span> <span className="text-slate-700 font-medium ml-1">{loan.agent_name}</span></div>
                <div><span className="text-slate-400">Date</span> <span className="text-slate-700 font-medium ml-1">{loan.month}</span></div>
                {loan.sanction && <div><span className="text-slate-400">Sanction</span> <span className="text-slate-700 font-medium ml-1">₹{loan.sanction}</span></div>}
                {loan.disbursed && <div><span className="text-slate-400">Disbursed</span> <span className="text-emerald-700 font-medium ml-1">₹{loan.disbursed}</span></div>}
              </div>
              <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                <button
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-slate-200 text-[10px] font-medium text-[#2c587a] hover:bg-slate-50 transition-colors"
                  onClick={() => { setEditingLoan(loan); setShowForm(true); }}
                  data-testid={`edit-loan-${loan.id}`}
                >
                  <Edit className="w-3 h-3" /> Edit
                </button>
                {user?.role === 'admin' && (
                  <button
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-red-200 text-[10px] font-medium text-red-500 hover:bg-red-50 transition-colors"
                    onClick={() => handleDelete(loan.id)}
                    data-testid={`delete-loan-${loan.id}`}
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Loans;
