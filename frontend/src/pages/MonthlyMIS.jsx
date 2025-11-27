import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, ChevronDown, ChevronRight, Search, Download, Filter, Sparkles, X, TrendingUp, Upload, FileSpreadsheet } from 'lucide-react';

const MonthlyMIS = () => {
  const { user } = useContext(AuthContext);
  const [loans, setLoans] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLoanData, setNewLoanData] = useState({});
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    customer_name: '',
    company_name: '',
    contact_no: '',
    bank: '',
    status: '',
    sanction: '',
    disbursed: '',
    remark: '',
    decline_reason: '',
    scheme: '',
    case_from: '',
    location: '',
    branch: '',
    executive_name: '',
    team_manager: '',
    code: '',
    rate: '',
    pf: '',
    insurance: '',
    tenure: '',
    subvention: '',
    brokerage_subvention: '',
    agent_name: '',
    month: ''
  });
  
  // AI states
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');

  useEffect(() => {
    fetchLoans();
    fetchSchemes();
    fetchStatuses();
  }, []);
  
  const fetchSchemes = async () => {
    try {
      const response = await axios.get(`${API}/schemes`);
      setSchemes(response.data);
    } catch (error) {
      console.error('Failed to fetch schemes');
    }
  };
  
  const fetchStatuses = async () => {
    try {
      const response = await axios.get(`${API}/statuses`);
      setStatuses(response.data);
    } catch (error) {
      console.error('Failed to fetch statuses');
    }
  };

  const fetchLoans = async () => {
    try {
      const response = await axios.get(`${API}/loans`);
      setLoans(response.data);
      
      // Auto-expand first month
      if (response.data.length > 0) {
        const firstMonth = response.data[0].month;
        setExpandedMonths(new Set([firstMonth]));
      }
    } catch (error) {
      toast.error('Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  const groupByMonth = () => {
    const grouped = {};
    loans.forEach(loan => {
      const month = loan.month || 'Unknown';
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(loan);
    });
    return grouped;
  };

  const toggleMonth = (month) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const handleAISearch = async () => {
    if (!aiQuery.trim()) return;
    
    setAiLoading(true);
    try {
      const response = await axios.post(`${API}/ai/search`, {
        query: aiQuery
      });
      
      const aiFilters = response.data.filters;
      setFilters({
        status: aiFilters.status || '',
        bank: aiFilters.bank || '',
        month: aiFilters.month || '',
        agent_name: aiFilters.agent_name || ''
      });
      
      toast.success('AI understood your query! Applied filters.');
      setAiQuery('');
    } catch (error) {
      toast.error('AI search failed. Try again!');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!aiQuestion.trim()) return;
    
    setAiLoading(true);
    try {
      const response = await axios.post(`${API}/ai/analyze`, {
        month: filters.month || null,
        question: aiQuestion
      });
      
      setAiAnalysis(response.data.analysis);
      setShowAIAnalysis(true);
    } catch (error) {
      toast.error('AI analysis failed. Try again!');
    } finally {
      setAiLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      bank: '',
      month: '',
      agent_name: ''
    });
    toast.success('Filters cleared');
  };

  const calculateMonthTotals = (loans) => {
    const totals = {
      sanction: 0,
      disbursed: 0,
      pf: 0,
      insurance: 0,
      subvention: 0,
      brokerage: 0,
      subvention_0: 0
    };

    loans.forEach(loan => {
      // Parse numeric values, removing commas and handling empty strings
      const parseNum = (val) => {
        if (!val) return 0;
        const num = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(num) ? 0 : num;
      };

      totals.sanction += parseNum(loan.sanction);
      totals.disbursed += parseNum(loan.disbursed);
      totals.pf += parseNum(loan.pf);
      totals.insurance += parseNum(loan.insurance);
      totals.subvention += parseNum(loan.subvention);
      totals.brokerage += parseNum(loan.brokerage);
      totals.subvention_0 += parseNum(loan.subvention_0);
    });

    return totals;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const handleCellClick = (loanId, field, currentValue) => {
    setEditingCell({ loanId, field });
    setEditValue(currentValue || '');
  };

  const handleCellSave = async (loanId, field) => {
    try {
      await axios.put(`${API}/loans/${loanId}`, {
        [field]: editValue
      });
      
      // Update local state
      setLoans(loans.map(loan => 
        loan.id === loanId ? { ...loan, [field]: editValue } : loan
      ));
      
      toast.success('Updated successfully');
      setEditingCell(null);
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleCellKeyDown = (e, loanId, field) => {
    if (e.key === 'Enter') {
      handleCellSave(loanId, field);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleAddLoan = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/loans`, newLoanData);
      setLoans([response.data, ...loans]);
      toast.success('Loan added successfully');
      setShowAddForm(false);
      setNewLoanData({});
    } catch (error) {
      toast.error('Failed to add loan');
    }
  };

  const handleImportExcel = async () => {
    if (!importFile) {
      toast.error('Please select an Excel file');
      return;
    }

    setImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await axios.post(`${API}/import/loans-excel`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`Import complete! Imported: ${response.data.imported}, Skipped: ${response.data.skipped}`);
      
      if (response.data.errors && response.data.errors.length > 0) {
        console.log('Import errors:', response.data.errors);
      }

      setShowImportDialog(false);
      setImportFile(null);
      fetchLoans(); // Refresh data
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const filteredLoans = loans.filter(loan => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      loan.customer_name?.toLowerCase().includes(searchLower) ||
      loan.company_name?.toLowerCase().includes(searchLower) ||
      loan.contact_no?.toLowerCase().includes(searchLower) ||
      loan.location?.toLowerCase().includes(searchLower) ||
      loan.agent_name?.toLowerCase().includes(searchLower) ||
      loan.executive_name?.toLowerCase().includes(searchLower) ||
      loan.team_manager?.toLowerCase().includes(searchLower) ||
      loan.status?.toLowerCase().includes(searchLower) ||
      loan.bank?.toLowerCase().includes(searchLower) ||
      loan.scheme?.toLowerCase().includes(searchLower) ||
      loan.decline_reason?.toLowerCase().includes(searchLower) ||
      loan.remark?.toLowerCase().includes(searchLower)
    );
    
    const matchesFilters = Object.keys(filters).every(key => {
      if (!filters[key]) return true;
      const loanValue = loan[key]?.toString().toLowerCase() || '';
      const filterValue = filters[key].toLowerCase();
      return loanValue.includes(filterValue);
    });
    
    return matchesSearch && matchesFilters;
  });

  const groupedLoans = {};
  filteredLoans.forEach(loan => {
    const month = loan.month || 'Unknown';
    if (!groupedLoans[month]) {
      groupedLoans[month] = [];
    }
    groupedLoans[month].push(loan);
  });

  const months = Object.keys(groupedLoans).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderCell = (loan, field, label) => {
    const isEditing = editingCell?.loanId === loan.id && editingCell?.field === field;
    const value = loan[field] || '';

    if (isEditing) {
      // Special handling for scheme field - show dropdown
      if (field === 'scheme') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleCellSave(loan.id, field)}
            onKeyDown={(e) => handleCellKeyDown(e, loan.id, field)}
            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          >
            <option value="">Select scheme</option>
            {schemes.map(scheme => (
              <option key={scheme.id} value={scheme.name}>{scheme.name}</option>
            ))}
          </select>
        );
      }
      
      // Special handling for status field - show dropdown
      if (field === 'status') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleCellSave(loan.id, field)}
            onKeyDown={(e) => handleCellKeyDown(e, loan.id, field)}
            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          >
            <option value="">Select status</option>
            {statuses.map(status => (
              <option key={status.id} value={status.name}>{status.name}</option>
            ))}
          </select>
        );
      }
      
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleCellSave(loan.id, field)}
          onKeyDown={(e) => handleCellKeyDown(e, loan.id, field)}
          className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      );
    }

    return (
      <div
        onClick={() => handleCellClick(loan.id, field, value)}
        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors min-h-[32px] flex items-center"
        title="Click to edit"
      >
        {value || <span className="text-slate-400">-</span>}
      </div>
    );
  };

  return (
    <div className="space-y-4 fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
            MIS Board
          </h1>
          <p className="text-sm text-slate-600">Month-wise loan management • Click any cell to edit</p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'admin' && (
            <>
              <Button
                onClick={() => window.open(`${API}/export/loans`, '_blank')}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
              <Button
                onClick={() => setShowImportDialog(true)}
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </Button>
            </>
          )}
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Quick find... (customer, company, contact, location, executive, status, bank, product)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* AI Natural Language Search */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">AI Search</h3>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder='Try: "Show me all HDFC loans from Mumbai" or "Find approved loans this month"'
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
              className="flex-1"
            />
            <Button
              onClick={handleAISearch}
              disabled={aiLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {aiLoading ? 'Thinking...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters and AI Analysis */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filters.status || filters.bank || filters.month || filters.agent_name) && (
            <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              Active
            </span>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowAIAnalysis(true)}
          className="flex items-center gap-2 text-purple-600"
        >
          <TrendingUp className="w-4 h-4" />
          AI Analysis
        </Button>

        {(filters.status || filters.bank || filters.month || filters.agent_name) && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="text-slate-600"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Customer Name</Label>
                <Input
                  placeholder="Filter by customer"
                  value={filters.customer_name}
                  onChange={(e) => setFilters({...filters, customer_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Company Name</Label>
                <Input
                  placeholder="Filter by company"
                  value={filters.company_name}
                  onChange={(e) => setFilters({...filters, company_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input
                  placeholder="Filter by contact"
                  value={filters.contact_no}
                  onChange={(e) => setFilters({...filters, contact_no: e.target.value})}
                />
              </div>
              <div>
                <Label>Bank</Label>
                <Input
                  placeholder="e.g., HDFC, ICICI"
                  value={filters.bank}
                  onChange={(e) => setFilters({...filters, bank: e.target.value})}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Input
                  placeholder="e.g., Pending, Approved"
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                />
              </div>
              <div>
                <Label>Sanctioned Amount</Label>
                <Input
                  placeholder="Filter by sanction"
                  value={filters.sanction}
                  onChange={(e) => setFilters({...filters, sanction: e.target.value})}
                />
              </div>
              <div>
                <Label>Disbursed Amount</Label>
                <Input
                  placeholder="Filter by disbursed"
                  value={filters.disbursed}
                  onChange={(e) => setFilters({...filters, disbursed: e.target.value})}
                />
              </div>
              <div>
                <Label>Remark</Label>
                <Input
                  placeholder="Filter by remark"
                  value={filters.remark}
                  onChange={(e) => setFilters({...filters, remark: e.target.value})}
                />
              </div>
              <div>
                <Label>Decline Reason</Label>
                <Input
                  placeholder="Filter by decline reason"
                  value={filters.decline_reason}
                  onChange={(e) => setFilters({...filters, decline_reason: e.target.value})}
                />
              </div>
              <div>
                <Label>Scheme</Label>
                <Input
                  placeholder="Filter by scheme"
                  value={filters.scheme}
                  onChange={(e) => setFilters({...filters, scheme: e.target.value})}
                />
              </div>
              <div>
                <Label>Case From</Label>
                <Input
                  placeholder="Filter by case from"
                  value={filters.case_from}
                  onChange={(e) => setFilters({...filters, case_from: e.target.value})}
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  placeholder="Filter by location"
                  value={filters.location}
                  onChange={(e) => setFilters({...filters, location: e.target.value})}
                />
              </div>
              <div>
                <Label>Branch</Label>
                <Input
                  placeholder="Filter by branch"
                  value={filters.branch}
                  onChange={(e) => setFilters({...filters, branch: e.target.value})}
                />
              </div>
              <div>
                <Label>Executive Name</Label>
                <Input
                  placeholder="Filter by executive"
                  value={filters.executive_name}
                  onChange={(e) => setFilters({...filters, executive_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Team Manager</Label>
                <Input
                  placeholder="Filter by manager"
                  value={filters.team_manager}
                  onChange={(e) => setFilters({...filters, team_manager: e.target.value})}
                />
              </div>
              <div>
                <Label>Code</Label>
                <Input
                  placeholder="Filter by code"
                  value={filters.code}
                  onChange={(e) => setFilters({...filters, code: e.target.value})}
                />
              </div>
              <div>
                <Label>Rate</Label>
                <Input
                  placeholder="Filter by rate"
                  value={filters.rate}
                  onChange={(e) => setFilters({...filters, rate: e.target.value})}
                />
              </div>
              <div>
                <Label>PF</Label>
                <Input
                  placeholder="Filter by PF"
                  value={filters.pf}
                  onChange={(e) => setFilters({...filters, pf: e.target.value})}
                />
              </div>
              <div>
                <Label>Insurance</Label>
                <Input
                  placeholder="Filter by insurance"
                  value={filters.insurance}
                  onChange={(e) => setFilters({...filters, insurance: e.target.value})}
                />
              </div>
              <div>
                <Label>Tenure</Label>
                <Input
                  placeholder="Filter by tenure"
                  value={filters.tenure}
                  onChange={(e) => setFilters({...filters, tenure: e.target.value})}
                />
              </div>
              <div>
                <Label>Subvention</Label>
                <Input
                  placeholder="Filter by subvention"
                  value={filters.subvention}
                  onChange={(e) => setFilters({...filters, subvention: e.target.value})}
                />
              </div>
              <div>
                <Label>Brokerage Subvention</Label>
                <Input
                  placeholder="Filter by brokerage"
                  value={filters.brokerage_subvention}
                  onChange={(e) => setFilters({...filters, brokerage_subvention: e.target.value})}
                />
              </div>
              <div>
                <Label>Agent Name</Label>
                <Input
                  placeholder="Filter by agent"
                  value={filters.agent_name}
                  onChange={(e) => setFilters({...filters, agent_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Month</Label>
                <Input
                  placeholder="e.g., Jan'25"
                  value={filters.month}
                  onChange={(e) => setFilters({...filters, month: e.target.value})}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setFilters({
                  customer_name: '', company_name: '', contact_no: '', bank: '', status: '',
                  sanction: '', disbursed: '', remark: '', decline_reason: '', scheme: '',
                  case_from: '', location: '', branch: '', executive_name: '', team_manager: '',
                  code: '', rate: '', pf: '', insurance: '', tenure: '', subvention: '',
                  brokerage_subvention: '', agent_name: '', month: ''
                })}
              >
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month Groups */}
      <div className="space-y-2">
        {months.map(month => {
          const monthLoans = groupedLoans[month];
          const isExpanded = expandedMonths.has(month);
          
          return (
            <Card key={month} className="overflow-hidden">
              {/* Month Header */}
              <div
                onClick={() => toggleMonth(month)}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 cursor-pointer hover:from-purple-100 hover:to-blue-100 transition-colors border-b"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-purple-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-purple-600" />
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-purple-900">{month}</h3>
                    <p className="text-sm text-purple-600">{monthLoans.length} entries</p>
                  </div>
                </div>
              </div>

              {/* Month Content */}
              {isExpanded && (
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Month</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Customer Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Company Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Contact No</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Bank/NBFC</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Sanctioned</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Disbursed</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Remark</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-red-600 uppercase whitespace-nowrap">Decline Reason</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Scheme</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Case From</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Location</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Branch</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Executive Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Team Manager</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Rate</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">PF</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Insurance</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Tenure</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Subvention</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Brokerage Subvention</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Agent Name</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {monthLoans.map(loan => (
                          <tr key={loan.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-sm text-slate-700 whitespace-nowrap">
                              {loan.month}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'customer_name', 'Customer Name')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'company_name', 'Company Name')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'contact_no', 'Contact Number')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'bank', 'Bank/NBFC')}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {renderCell(loan, 'status', 'Status')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'sanction', 'Sanctioned')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'disbursed', 'Disbursed')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'remark', 'Remark')}
                            </td>
                            <td className="px-4 py-2 text-sm text-red-50 bg-red-50">
                              {renderCell(loan, 'decline_reason', 'Decline Reason')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'scheme', 'Scheme')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'case_from', 'Case From')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'location', 'Location')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'branch', 'Branch')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'executive_name', 'Executive Name')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'team_manager', 'Team Manager')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'code', 'Code')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'rate', 'Rate')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'pf', 'PF')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'insurance', 'Insurance')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'tenure', 'Tenure')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'subvention', 'Subvention')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'brokerage_subvention', 'Brokerage Subvention')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'agent_name', 'Agent Name')}
                            </td>
                          </tr>
                        ))}
                        
                        {/* Totals Row */}
                        <tr className="bg-blue-50 font-semibold border-t-2 border-blue-300">
                          <td className="px-4 py-3 text-sm text-blue-900" colSpan="6">
                            TOTAL ({monthLoans.length} entries)
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-900 text-right">
                            ₹{formatNumber(calculateMonthTotals(monthLoans).sanction)}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-900 text-right">
                            ₹{formatNumber(calculateMonthTotals(monthLoans).disbursed)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500" colSpan="8">
                            {/* Empty cells for non-numeric columns */}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-900 text-right">
                            ₹{formatNumber(calculateMonthTotals(monthLoans).pf)}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-900 text-right">
                            ₹{formatNumber(calculateMonthTotals(monthLoans).insurance)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {/* Tenure - no total */}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-900 text-right">
                            ₹{formatNumber(calculateMonthTotals(monthLoans).subvention)}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-900 text-right">
                            ₹{formatNumber(calculateMonthTotals(monthLoans).brokerage)}
                          </td>
                          <td className="px-4 py-3 text-sm text-blue-900 text-right">
                            ₹{formatNumber(calculateMonthTotals(monthLoans).subvention_0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {months.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-slate-600">No entries found. Click "Add Entry" to create your first loan application.</p>
          </CardContent>
        </Card>
      )}

      {/* Add Form Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLoan} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name *</Label>
                  <Input
                    required
                    value={newLoanData.customer_name || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, customer_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Company Name *</Label>
                  <Input
                    required
                    value={newLoanData.company_name || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, company_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Contact Number *</Label>
                  <Input
                    required
                    value={newLoanData.contact_no || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, contact_no: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={newLoanData.location || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, location: e.target.value})}
                    placeholder="City, State"
                  />
                </div>
                <div>
                  <Label>Agent Name *</Label>
                  <Input
                    required
                    value={newLoanData.agent_name || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, agent_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Executive Name</Label>
                  <Input
                    value={newLoanData.executive_name || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, executive_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Team Manager</Label>
                  <Input
                    value={newLoanData.team_manager || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, team_manager: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Status *</Label>
                  <Select
                    required
                    value={newLoanData.status || ''}
                    onValueChange={(value) => setNewLoanData({...newLoanData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status.id} value={status.name}>{status.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Bank *</Label>
                  <Input
                    required
                    value={newLoanData.bank || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, bank: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Month *</Label>
                  <Input
                    required
                    type="month"
                    value={newLoanData.month || ''}
                    onChange={(e) => {
                      // Convert YYYY-MM to "Mon-YY" format
                      if (e.target.value) {
                        const [year, month] = e.target.value.split('-');
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const formattedMonth = `${monthNames[parseInt(month) - 1]}-${year.slice(2)}`;
                        setNewLoanData({...newLoanData, month: formattedMonth});
                      }
                    }}
                    className="cursor-pointer"
                  />
                  {newLoanData.month && (
                    <p className="text-xs text-slate-500 mt-1">Selected: {newLoanData.month}</p>
                  )}
                </div>
                <div>
                  <Label>Sanction Amount</Label>
                  <Input
                    value={newLoanData.sanction || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, sanction: e.target.value})}
                    placeholder="e.g., 500000"
                  />
                </div>
                <div>
                  <Label>Disbursed Amount</Label>
                  <Input
                    value={newLoanData.disbursed || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, disbursed: e.target.value})}
                    placeholder="e.g., 500000"
                  />
                </div>
                <div>
                  <Label>Scheme</Label>
                  <Select
                    value={newLoanData.scheme || ''}
                    onValueChange={(value) => setNewLoanData({...newLoanData, scheme: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select scheme" />
                    </SelectTrigger>
                    <SelectContent>
                      {schemes.map(scheme => (
                        <SelectItem key={scheme.id} value={scheme.name}>{scheme.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rate of Interest (%)</Label>
                  <Input
                    value={newLoanData.rate || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, rate: e.target.value})}
                    placeholder="e.g., 10.5"
                  />
                </div>
                <div>
                  <Label>PF</Label>
                  <Input
                    value={newLoanData.pf || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, pf: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Insurance</Label>
                  <Input
                    value={newLoanData.insurance || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, insurance: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Tenure (Months)</Label>
                  <Input
                    value={newLoanData.tenure || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, tenure: e.target.value})}
                    placeholder="e.g., 24, 36, 60"
                  />
                </div>
                <div>
                  <Label>Subvention</Label>
                  <Input
                    value={newLoanData.subvention || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, subvention: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Brokerage Subvention</Label>
                  <Input
                    value={newLoanData.brokerage_subvention || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, brokerage_subvention: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Case From</Label>
                  <Input
                    value={newLoanData.case_from || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, case_from: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Branch</Label>
                  <Input
                    value={newLoanData.branch || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, branch: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input
                    value={newLoanData.code || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, code: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Remark</Label>
                  <Input
                    value={newLoanData.remark || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, remark: e.target.value})}
                    placeholder="Additional notes"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-red-600">Decline Reason (if rejected)</Label>
                  <Input
                    value={newLoanData.decline_reason || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, decline_reason: e.target.value})}
                    placeholder="Reason for decline/rejection"
                    className="border-red-300 focus:border-red-500"
                  />
                </div>
              </div>
            
            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Add Entry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Dialog */}
      <Dialog open={showAIAnalysis} onOpenChange={setShowAIAnalysis}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Data Analysis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ask a question about your data</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder='e.g., "What are the trends this month?" or "Which executive performed best?"'
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAIAnalysis()}
                />
                <Button
                  onClick={handleAIAnalysis}
                  disabled={aiLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {aiLoading ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
            </div>

            {aiAnalysis && (
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 mb-2">AI Insights:</h4>
                      <div className="text-slate-700 whitespace-pre-wrap">{aiAnalysis}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-xs text-slate-500">
              <p className="font-semibold mb-1">Try asking:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>"What are the top performing banks this month?"</li>
                <li>"Show me conversion rate trends"</li>
                <li>"Which executive has the most disbursals?"</li>
                <li>"What's the average sanction amount?"</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Excel Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Import Loans from Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">📋 Excel Format Requirements:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Required columns:</strong> Customer Name, Status, Bank, Month</p>
                <p><strong>Optional columns:</strong> Company Name, Contact, Location, Executive Name, Sanction, Disbursed, ROI, Tenure, Product Type, Login Date, Remark</p>
                <p className="mt-2 text-xs">💡 Column names are case-insensitive and flexible (e.g., "Customer Name", "customer", "customername" all work)</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Excel File (.xlsx or .xls)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="cursor-pointer"
              />
              {importFile && (
                <p className="text-sm text-green-600">
                  ✓ Selected: {importFile.name}
                </p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Note:</strong> Existing data will not be affected. Only new entries will be added. Empty rows will be skipped.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowImportDialog(false);
                  setImportFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportExcel}
                disabled={importing || !importFile}
                className="bg-green-600 hover:bg-green-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing ? 'Importing...' : 'Import Data'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonthlyMIS;
