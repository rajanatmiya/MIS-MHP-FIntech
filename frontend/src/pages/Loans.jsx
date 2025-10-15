import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Filter } from 'lucide-react';
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

  useEffect(() => {
    fetchLoans();
    fetchUniqueValues();
  }, []);

  useEffect(() => {
    filterLoans();
  }, [loans, searchTerm, statusFilter, bankFilter]);

  const fetchLoans = async () => {
    try {
      const response = await axios.get(`${API}/loans`);
      setLoans(response.data);
      setFilteredLoans(response.data);
    } catch (error) {
      toast.error('Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  const fetchUniqueValues = async () => {
    try {
      const response = await axios.get(`${API}/analytics/unique-values`);
      setUniqueValues(response.data);
    } catch (error) {
      console.error('Failed to fetch unique values');
    }
  };

  const filterLoans = () => {
    let filtered = loans;

    if (searchTerm) {
      filtered = filtered.filter(loan =>
        loan.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.contact_no.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(loan => loan.status === statusFilter);
    }

    if (bankFilter !== 'all') {
      filtered = filtered.filter(loan => loan.bank === bankFilter);
    }

    setFilteredLoans(filtered);
  };

  const handleDelete = async (loanId) => {
    if (!window.confirm('Are you sure you want to delete this loan application?')) return;

    try {
      await axios.delete(`${API}/loans/${loanId}`);
      toast.success('Loan application deleted');
      // Update local state immediately
      setLoans(prevLoans => prevLoans.filter(loan => loan.id !== loanId));
      setFilteredLoans(prevLoans => prevLoans.filter(loan => loan.id !== loanId));
    } catch (error) {
      toast.error('Failed to delete loan application');
      console.error('Delete error:', error);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingLoan(null);
    fetchLoans();
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'Disbursed': 'status-badge status-disbursed',
      'Decline': 'status-badge status-decline',
      'Hold': 'status-badge status-hold',
      'Login Done': 'status-badge status-pending',
      'Sent For Login': 'status-badge status-pending',
      'Pd To Be Done': 'status-badge status-pending',
      'Cam Done': 'status-badge status-pending'
    };
    return statusMap[status] || 'status-badge bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 fade-in" data-testid="loans-page">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Loan Applications
          </h1>
          <p className="text-sm lg:text-base text-slate-600">Manage and track all loan applications</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingLoan(null)}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-md hover:shadow-lg"
              data-testid="add-loan-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLoan ? 'Edit Loan Application' : 'Add New Loan Application'}</DialogTitle>
            </DialogHeader>
            <div aria-describedby="loan-form-description">
              <LoanForm
                loan={editingLoan}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="status-filter">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueValues.statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bankFilter} onValueChange={setBankFilter}>
              <SelectTrigger data-testid="bank-filter">
                <SelectValue placeholder="Filter by Bank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Banks</SelectItem>
                {uniqueValues.banks.map(bank => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold">{filteredLoans.length}</span> of <span className="font-semibold">{loans.length}</span> applications
        </p>
        {(statusFilter !== 'all' || bankFilter !== 'all' || searchTerm) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setBankFilter('all');
            }}
            data-testid="clear-filters-button"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Table - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="loans-table">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Bank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                      No loan applications found
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => (
                    <tr key={loan.id} className="table-row" data-testid={`loan-row-${loan.id}`}>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">{loan.customer_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{loan.company_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{loan.contact_no}</td>
                      <td className="px-6 py-4">
                        <span className={getStatusBadgeClass(loan.status)}>{loan.status}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{loan.bank}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{loan.agent_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{loan.month}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingLoan(loan);
                            setShowForm(true);
                          }}
                          data-testid={`edit-loan-${loan.id}`}
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        {user?.role === 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(loan.id)}
                            data-testid={`delete-loan-${loan.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Card View - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredLoans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              No loan applications found
            </CardContent>
          </Card>
        ) : (
          filteredLoans.map((loan) => (
            <Card key={loan.id} className="card-hover" data-testid={`loan-card-${loan.id}`}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800">{loan.customer_name}</h3>
                      <p className="text-sm text-slate-600">{loan.company_name}</p>
                    </div>
                    <span className={getStatusBadgeClass(loan.status)}>{loan.status}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-slate-500">Contact</p>
                      <p className="font-medium text-slate-800">{loan.contact_no}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Bank</p>
                      <p className="font-medium text-slate-800">{loan.bank}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Agent</p>
                      <p className="font-medium text-slate-800">{loan.agent_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Month</p>
                      <p className="font-medium text-slate-800">{loan.month}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setEditingLoan(loan);
                        setShowForm(true);
                      }}
                      data-testid={`edit-loan-${loan.id}`}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {user?.role === 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(loan.id)}
                        data-testid={`delete-loan-${loan.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Loans;