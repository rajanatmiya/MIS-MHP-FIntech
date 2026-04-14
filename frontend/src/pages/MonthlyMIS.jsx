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
import { Plus, ChevronDown, ChevronRight, Search, Download, Filter, Sparkles, X, TrendingUp, Upload, FileSpreadsheet, Edit, Trash2, CheckSquare, Square, Columns, ToggleLeft, ToggleRight, Lock, Unlock } from 'lucide-react';

// Month format helpers
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_MAP = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};

// Convert any stored date/month value to "MMM-YYYY" for grouping
// Uses group_month field if present (for carry-forward loans), else derives from date
const toMonthKey = (val, groupMonth) => {
  if (groupMonth) return groupMonth;
  if (!val) return 'Unknown';
  // Already in MMM-YYYY format (e.g., "Apr-2026")
  if (/^[A-Za-z]{3}-\d{4}$/.test(val)) return val;
  const parts = val.split('-');
  // dd-mm-yyyy format
  if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
    const mi = parseInt(parts[1]) - 1;
    return mi >= 0 && mi < 12 ? `${MONTH_NAMES[mi]}-${parts[2]}` : val;
  }
  // yyyy-mm-dd format
  if (parts.length === 3 && parts[0].length === 4) {
    const mi = parseInt(parts[1]) - 1;
    return mi >= 0 && mi < 12 ? `${MONTH_NAMES[mi]}-${parts[0]}` : val;
  }
  // mm-yyyy format (e.g., "04-2026")
  if (parts.length === 2 && parts[0].length === 2 && parts[1].length === 4) {
    const mi = parseInt(parts[0]) - 1;
    return mi >= 0 && mi < 12 ? `${MONTH_NAMES[mi]}-${parts[1]}` : val;
  }
  return val;
};

// Convert stored value to yyyy-mm for native month input
const toInputMonth = (val) => {
  if (!val) return '';
  const mmmMatch = val.match(/^([A-Za-z]{3})-(\d{4})$/);
  if (mmmMatch && MONTH_MAP[mmmMatch[1]]) return `${mmmMatch[2]}-${MONTH_MAP[mmmMatch[1]]}`;
  const parts = val.split('-');
  if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) return `${parts[2]}-${parts[1]}`;
  if (parts.length === 3 && parts[0].length === 4) return `${parts[0]}-${parts[1]}`;
  return '';
};

// Convert yyyy-mm input to MMM-YYYY for storage
const fromInputMonth = (yyyymm) => {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-');
  const mi = parseInt(m) - 1;
  return mi >= 0 && mi < 12 ? `${MONTH_NAMES[mi]}-${y}` : yyyymm;
};

// Get date range for a month key (e.g., "Apr-2026" → {min: "2026-04-01", max: "2026-04-30"})
const getMonthDateRange = (monthKey) => {
  const match = monthKey.match(/^([A-Za-z]{3})-(\d{2,4})$/);
  if (!match) return {};
  const mi = MONTH_NAMES.indexOf(match[1]);
  if (mi === -1) return {};
  let year = match[2];
  if (year.length === 2) year = `20${year}`;
  const mm = String(mi + 1).padStart(2, '0');
  const lastDay = new Date(parseInt(year), mi + 1, 0).getDate();
  return { min: `${year}-${mm}-01`, max: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
};

// Convert MMM-YYYY to default date for new entry (1st of that month)
const getDefaultDateForMonth = (monthKey) => {
  const range = getMonthDateRange(monthKey);
  return range.min || '';
};

// Multi-checkbox filter dropdown component
const MultiCheckFilter = ({ label, options, selected, onChange, testId }) => {
  const [open, setOpen] = useState(false);
  const count = selected.length;
  return (
    <div className="relative" data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 h-7 px-2.5 text-[11px] border rounded-md transition-colors ${
          count > 0 ? 'border-[#2c587a] bg-[#2c587a]/5 text-[#2c587a] font-medium' : 'border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        {label}{count > 0 && <span className="ml-0.5 w-4 h-4 rounded-full bg-[#2c587a] text-white text-[9px] flex items-center justify-center">{count}</span>}
        <ChevronDown className="w-3 h-3 ml-0.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-8 left-0 z-40 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-[240px] overflow-y-auto">
            <button
              onClick={() => { onChange([]); }}
              className="w-full text-left px-3 py-1 text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50/50 transition-colors"
            >
              Clear all
            </button>
            {options.map(opt => {
              const checked = selected.includes(opt.name);
              return (
                <label key={opt.id} className={`flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-slate-50 transition-colors ${checked ? 'bg-blue-50/50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onChange(checked ? selected.filter(s => s !== opt.name) : [...selected, opt.name])}
                    className="w-3 h-3 rounded border-slate-300 text-[#2c587a] focus:ring-[#2c587a]"
                  />
                  <span className="text-[11px] text-slate-700 truncate">{opt.name}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

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
  const [monthInputValue, setMonthInputValue] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editMonthInput, setEditMonthInput] = useState('');
  const [showAddMonthDialog, setShowAddMonthDialog] = useState(false);
  const [newMonthValue, setNewMonthValue] = useState('');
  const [addEntryForMonth, setAddEntryForMonth] = useState(null);
  const [masterBanks, setMasterBanks] = useState([]);
  const [masterAgents, setMasterAgents] = useState([]);
  const [masterCompanies, setMasterCompanies] = useState([]);
  const [masterBranches, setMasterBranches] = useState([]);
  const [masterLocations, setMasterLocations] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  
  // Empty month groups (added via "Add Month" but no entries yet)
  const [emptyMonthGroups, setEmptyMonthGroups] = useState([]);
  
  // Top-level multi-select filter states
  const [filterCategories, setFilterCategories] = useState([]);
  const [filterProducts, setFilterProducts] = useState([]);
  const [filterBanks, setFilterBanks] = useState([]);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkStatus, setShowBulkStatus] = useState(false);
  const [showBulkSelect, setShowBulkSelect] = useState(false);
  
  // Column visibility
  const ALL_COLUMNS = [
    { key: 'month', label: 'Date' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'company_name', label: 'Company' },
    { key: 'contact_no', label: 'Contact' },
    { key: 'bank', label: 'Bank' },
    { key: 'category', label: 'Category' },
    { key: 'product', label: 'Product' },
    { key: 'status', label: 'Status' },
    { key: 'sanction', label: 'Sanction' },
    { key: 'disbursed', label: 'Disbursed' },
    { key: 'remark', label: 'Remark' },
    { key: 'decline_reason', label: 'Decline' },
    { key: 'scheme', label: 'Scheme' },
    { key: 'case_from', label: 'Case From' },
    { key: 'location', label: 'Location' },
    { key: 'branch', label: 'Branch' },
    { key: 'executive_name', label: 'Executive' },
    { key: 'team_manager', label: 'Manager' },
    { key: 'code', label: 'Code' },
    { key: 'rate', label: 'Rate' },
    { key: 'pf', label: 'PF' },
    { key: 'insurance', label: 'Insurance' },
    { key: 'tenure', label: 'Tenure' },
    { key: 'subvention', label: 'Subvention' },
    { key: 'brokerage_subvention', label: 'Brokerage' },
    { key: 'agent_name', label: 'Agent' },
  ];
  const [visibleColumns, setVisibleColumns] = useState(() => ALL_COLUMNS.map(c => c.key));
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  
  // Show/hide quick filters
  const [showQuickFilters, setShowQuickFilters] = useState(true);
  
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
    fetchMasterData();
  }, []);
  
  const fetchMasterData = async () => {
    try {
      const [banksRes, agentsRes, companiesRes, branchesRes, locationsRes, categoriesRes, productsRes] = await Promise.all([
        axios.get(`${API}/master/banks`),
        axios.get(`${API}/master/agents`),
        axios.get(`${API}/master/companies`),
        axios.get(`${API}/master/branches`),
        axios.get(`${API}/master/locations`),
        axios.get(`${API}/master/categories`),
        axios.get(`${API}/master/products`)
      ]);
      setMasterBanks(banksRes.data);
      setMasterAgents(agentsRes.data);
      setMasterCompanies(companiesRes.data);
      setMasterBranches(branchesRes.data);
      setMasterLocations(locationsRes.data);
      setMasterCategories(categoriesRes.data);
      setMasterProducts(productsRes.data);
    } catch (error) { console.error('Failed to fetch master data'); }
  };
  
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
      const response = await axios.get(`${API}/loans?limit=2000`);
      const data = response.data.loans || response.data;
      setLoans(data);
      
      // Auto-expand first month
      if (data.length > 0) {
        const firstMonth = data[0].month;
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
      const month = toMonthKey(loan.month, loan.group_month);
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
      const submitData = {...newLoanData};
      if (addEntryForMonth) {
        submitData.group_month = addEntryForMonth;
      }
      const response = await axios.post(`${API}/loans`, submitData);
      setLoans([response.data, ...loans]);
      toast.success('Loan added successfully');
      setShowAddForm(false);
      setNewLoanData({});
      setMonthInputValue('');
      setAddEntryForMonth(null);
    } catch (error) {
      toast.error('Failed to add loan');
    }
  };

  const handleEditOpen = (loan) => {
    setEditingLoan(loan);
    setEditFormData({ ...loan });
    const m = loan.month || '';
    const parts = m.split('-');
    if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
      setEditMonthInput(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      setEditMonthInput('');
    }
    setShowEditForm(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/loans/${editingLoan.id}`, editFormData);
      setLoans(loans.map(l => l.id === editingLoan.id ? { ...l, ...editFormData } : l));
      toast.success('Loan updated successfully');
      setShowEditForm(false);
      setEditingLoan(null);
    } catch (error) {
      toast.error('Failed to update loan');
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await axios.delete(`${API}/loans/${loanId}`);
      setLoans(loans.filter(l => l.id !== loanId));
      toast.success('Entry deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleToggleEntryStatus = async (loan) => {
    const newStatus = loan.entry_status === 'Closed' ? 'Open' : 'Closed';
    try {
      await axios.patch(`${API}/loans/${loan.id}/entry-status`, { entry_status: newStatus });
      setLoans(loans.map(l => l.id === loan.id ? { ...l, entry_status: newStatus } : l));
      toast.success(`Entry marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update entry status');
    }
  };

  const handleDeleteMonth = async (monthKey) => {
    if (!window.confirm(`Delete all entries in "${monthKey}" and archive to DB Backup?\n\nThis will move all loans from this month to your backup page.`)) return;
    try {
      const response = await axios.post(`${API}/loans/delete-month`, { month_key: monthKey });
      toast.success(response.data.message);
      setEmptyMonthGroups(emptyMonthGroups.filter(m => m !== monthKey));
      fetchLoans();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete month');
    }
  };

  const handleExportMonth = async (monthKey) => {
    try {
      const response = await axios.get(`${API}/backup/export-month/${encodeURIComponent(monthKey)}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `loans_${monthKey}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${monthKey} loans`);
    } catch (error) {
      toast.error('Failed to export month data');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await axios.get(`${API}/export/loans`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `loans_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel exported successfully');
    } catch (error) {
      toast.error('Failed to export. Please try again.');
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

      toast.success(`Import complete! Imported: ${response.data.imported}, Skipped: ${response.data.skipped}${response.data.duplicates ? `, Duplicates: ${response.data.duplicates}` : ''}`);
      
      if (response.data.duplicates > 0) {
        toast.info(`${response.data.duplicates} duplicate(s) detected and skipped`);
      }
      
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
    // Top-level multi-select filters
    if (filterCategories.length > 0 && !filterCategories.includes(loan.category)) return false;
    if (filterProducts.length > 0 && !filterProducts.includes(loan.product)) return false;
    if (filterBanks.length > 0 && !filterBanks.includes(loan.bank)) return false;
    
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
      loan.category?.toLowerCase().includes(searchLower) ||
      loan.product?.toLowerCase().includes(searchLower) ||
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
    const month = toMonthKey(loan.month, loan.group_month);
    if (!groupedLoans[month]) {
      groupedLoans[month] = [];
    }
    groupedLoans[month].push(loan);
  });

  // Include empty month groups added via "Add Month"
  emptyMonthGroups.forEach(m => {
    if (!groupedLoans[m]) groupedLoans[m] = [];
  });

  const months = Object.keys(groupedLoans).sort((a, b) => {
    // Sort descending by year-month
    const getSort = (v) => {
      const match = v.match(/^([A-Za-z]{3})-(\d{2,4})$/);
      if (!match) return '0000-00';
      let yr = match[2]; if (yr.length === 2) yr = `20${yr}`;
      const mi = MONTH_NAMES.indexOf(match[1]);
      return `${yr}-${String(mi).padStart(2, '0')}`;
    };
    return getSort(b).localeCompare(getSort(a));
  });

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
      // Date picker for month field
      if (field === 'month') {
        let dateInputVal = editValue;
        if (editValue && /^\d{2}-\d{2}-\d{4}$/.test(editValue)) {
          const [d, m, y] = editValue.split('-');
          dateInputVal = `${y}-${m}-${d}`;
        }
        return (
          <input
            type="date"
            value={dateInputVal}
            onChange={(e) => {
              if (e.target.value) {
                const [year, month, day] = e.target.value.split('-');
                setEditValue(`${day}-${month}-${year}`);
              } else {
                setEditValue('');
              }
            }}
            onBlur={() => handleCellSave(loan.id, field)}
            onKeyDown={(e) => handleCellKeyDown(e, loan.id, field)}
            className="w-full px-1.5 py-0.5 text-[11px] border border-[#2c587a] rounded focus:outline-none focus:ring-1 focus:ring-[#2c587a]"
            autoFocus
          />
        );
      }

      if (field === 'scheme') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleCellSave(loan.id, field)}
            onKeyDown={(e) => handleCellKeyDown(e, loan.id, field)}
            className="w-full px-1.5 py-0.5 text-[11px] border border-[#2c587a] rounded focus:outline-none focus:ring-1 focus:ring-[#2c587a]"
            autoFocus
          >
            <option value="">Select</option>
            {schemes.map(scheme => (
              <option key={scheme.id} value={scheme.name}>{scheme.name}</option>
            ))}
          </select>
        );
      }
      
      if (field === 'status') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleCellSave(loan.id, field)}
            onKeyDown={(e) => handleCellKeyDown(e, loan.id, field)}
            className="w-full px-1.5 py-0.5 text-[11px] border border-[#2c587a] rounded focus:outline-none focus:ring-1 focus:ring-[#2c587a]"
            autoFocus
          >
            <option value="">Select</option>
            {statuses.map(status => (
              <option key={status.id} value={status.name}>{status.name}</option>
            ))}
          </select>
        );
      }

      if (field === 'category') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleCellSave(loan.id, field)}
            onKeyDown={(e) => handleCellKeyDown(e, loan.id, field)}
            className="w-full px-1.5 py-0.5 text-[11px] border border-[#2c587a] rounded focus:outline-none focus:ring-1 focus:ring-[#2c587a]"
            autoFocus
          >
            <option value="">Select</option>
            {masterCategories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        );
      }

      if (field === 'product') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => handleCellSave(loan.id, field)}
            onKeyDown={(e) => handleCellKeyDown(e, loan.id, field)}
            className="w-full px-1.5 py-0.5 text-[11px] border border-[#2c587a] rounded focus:outline-none focus:ring-1 focus:ring-[#2c587a]"
            autoFocus
          >
            <option value="">Select</option>
            {masterProducts.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
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
          className="w-full px-1.5 py-0.5 text-[11px] border border-[#2c587a] rounded focus:outline-none focus:ring-1 focus:ring-[#2c587a]"
          autoFocus
        />
      );
    }

    return (
      <div
        onClick={() => handleCellClick(loan.id, field, value)}
        className="cursor-pointer hover:bg-blue-50/60 px-1.5 py-0.5 rounded transition-colors min-h-[24px] flex items-center text-[11px]"
        title="Click to edit"
      >
        {value || <span className="text-slate-300 italic">—</span>}
      </div>
    );
  };

  const activeFilterCount = Object.values(filters).filter(v => v).length;

  return (
    <div className="space-y-3 fade-in pb-16" data-testid="mis-board-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-sm font-bold text-slate-800" data-testid="mis-board-title">MIS Board</h1>
          <p className="text-[10px] text-slate-400 mt-0.5">Click any cell to edit inline</p>
        </div>
        <div className="flex items-center gap-1.5">
          {user?.role === 'admin' && (
            <>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                className="h-7 text-[11px] px-2.5 border-slate-200 text-slate-600 hover:bg-slate-50"
                data-testid="export-excel-btn"
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
              <Button
                onClick={() => setShowImportDialog(true)}
                variant="outline"
                size="sm"
                className="h-7 text-[11px] px-2.5 border-slate-200 text-slate-600 hover:bg-slate-50"
                data-testid="import-excel-btn"
              >
                <Upload className="w-3 h-3 mr-1" />
                Import
              </Button>
            </>
          )}
          <Button
            onClick={() => { setNewMonthValue(''); setShowAddMonthDialog(true); }}
            size="sm"
            className="h-7 text-[11px] px-3 bg-[#2c587a] hover:bg-[#234a68]"
            data-testid="add-month-btn"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Month
          </Button>
        </div>
      </div>

      {/* Search + Quick Actions Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search customer, company, contact, bank, agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-[11px] bg-white"
            data-testid="search-input"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowColumnPicker(!showColumnPicker)}
          className={`h-8 text-[11px] px-2.5 shrink-0 ${showColumnPicker ? 'bg-[#2c587a] text-white border-[#2c587a]' : 'border-slate-200'}`}
          data-testid="columns-toggle"
        >
          <Columns className="w-3 h-3 mr-1" />
          Columns
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowQuickFilters(!showQuickFilters)}
          className={`h-8 text-[11px] px-2.5 shrink-0 ${showQuickFilters ? 'bg-[#2c587a] text-white border-[#2c587a]' : 'border-slate-200'}`}
          data-testid="quick-filters-toggle"
        >
          <Filter className="w-3 h-3 mr-1" />
          Filters
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setShowBulkSelect(!showBulkSelect); if (showBulkSelect) setSelectedIds(new Set()); }}
          className={`h-8 text-[11px] px-2.5 shrink-0 ${showBulkSelect ? 'bg-[#2c587a] text-white border-[#2c587a]' : 'border-slate-200'}`}
          data-testid="bulk-select-toggle"
        >
          <CheckSquare className="w-3 h-3 mr-1" />
          Select
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`h-8 text-[11px] px-2.5 shrink-0 ${showFilters ? 'bg-[#2c587a] text-white border-[#2c587a]' : 'border-slate-200'}`}
          data-testid="filters-toggle"
        >
          <Filter className="w-3 h-3 mr-1" />
          Advanced
          {activeFilterCount > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{activeFilterCount}</span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAIAnalysis(true)}
          className="h-8 text-[11px] px-2.5 shrink-0 border-slate-200 text-[#2c587a]"
          data-testid="ai-analysis-btn"
        >
          <Sparkles className="w-3 h-3 mr-1" />
          AI
        </Button>
      </div>

      {/* Column Picker */}
      {showColumnPicker && (
        <Card className="border-slate-200 shadow-sm" data-testid="column-picker">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-700">Show/Hide Columns</p>
              <div className="flex gap-1">
                <button onClick={() => setVisibleColumns(ALL_COLUMNS.map(c => c.key))} className="text-[10px] text-[#2c587a] hover:underline">All</button>
                <span className="text-slate-300">|</span>
                <button onClick={() => setVisibleColumns(['month','customer_name','bank','status','sanction','disbursed','agent_name'])} className="text-[10px] text-[#2c587a] hover:underline">Minimal</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_COLUMNS.map(col => (
                <label key={col.key} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] cursor-pointer border transition-colors ${visibleColumns.includes(col.key) ? 'bg-[#2c587a]/10 text-[#2c587a] border-[#2c587a]/30' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col.key)}
                    onChange={() => setVisibleColumns(prev => prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key])}
                    className="w-2.5 h-2.5"
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category / Product / Bank Multi-Checkbox Filters */}
      {showQuickFilters && (
      <div className="flex flex-wrap items-center gap-2" data-testid="quick-filters">
        <MultiCheckFilter label="Category" options={masterCategories} selected={filterCategories} onChange={setFilterCategories} testId="filter-category" />
        <MultiCheckFilter label="Product" options={masterProducts} selected={filterProducts} onChange={setFilterProducts} testId="filter-product" />
        <MultiCheckFilter label="Bank" options={masterBanks} selected={filterBanks} onChange={setFilterBanks} testId="filter-bank" />
        {(filterCategories.length > 0 || filterProducts.length > 0 || filterBanks.length > 0) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterCategories([]); setFilterProducts([]); setFilterBanks([]); }}
            className="h-7 text-[10px] px-2 text-slate-500 hover:text-red-500" data-testid="clear-quick-filters">
            <X className="w-3 h-3 mr-0.5" /> Clear all
          </Button>
        )}
        {(filterCategories.length > 0 || filterProducts.length > 0 || filterBanks.length > 0) && (
          <div className="flex flex-wrap gap-1 ml-1">
            {filterCategories.map(c => <span key={c} className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-[9px] text-emerald-700 font-medium cursor-pointer hover:bg-red-100 hover:text-red-600" onClick={() => setFilterCategories(filterCategories.filter(x => x !== c))}>{c} &times;</span>)}
            {filterProducts.map(p => <span key={p} className="px-1.5 py-0.5 rounded-full bg-violet-100 text-[9px] text-violet-700 font-medium cursor-pointer hover:bg-red-100 hover:text-red-600" onClick={() => setFilterProducts(filterProducts.filter(x => x !== p))}>{p} &times;</span>)}
            {filterBanks.map(b => <span key={b} className="px-1.5 py-0.5 rounded-full bg-[#2c587a]/10 text-[9px] text-[#2c587a] font-medium cursor-pointer hover:bg-red-100 hover:text-red-600" onClick={() => setFilterBanks(filterBanks.filter(x => x !== b))}>{b} &times;</span>)}
          </div>
        )}
      </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-[#2c587a] rounded-lg text-white" data-testid="bulk-action-bar">
          <div className="flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">{selectedIds.size} selected</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => setShowBulkStatus(!showBulkStatus)} className="h-6 text-[10px] px-2 gap-1 bg-white/20 hover:bg-white/30 text-white border-0" data-testid="bulk-status-btn">
                Update Status <ChevronDown className="w-3 h-3" />
              </Button>
              {showBulkStatus && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowBulkStatus(false)} />
                  <div className="absolute top-7 right-0 z-40 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-[200px] overflow-y-auto">
                    {statuses.map(s => (
                      <button key={s.id} onClick={async () => {
                        try {
                          await axios.post(`${API}/loans/bulk-status`, { ids: [...selectedIds], status: s.name });
                          toast.success(`${selectedIds.size} loans updated to "${s.name}"`);
                          setSelectedIds(new Set());
                          setShowBulkStatus(false);
                          fetchLoans();
                        } catch { toast.error('Bulk status update failed'); }
                      }} className="w-full text-left px-3 py-1.5 text-[11px] text-slate-700 hover:bg-blue-50 transition-colors">
                        {s.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {user?.role === 'admin' && (
              <Button variant="secondary" size="sm" onClick={async () => {
                if (!window.confirm(`Delete ${selectedIds.size} selected loans?`)) return;
                try {
                  await axios.post(`${API}/loans/bulk-delete`, { ids: [...selectedIds] });
                  toast.success(`${selectedIds.size} loans deleted`);
                  setSelectedIds(new Set());
                  fetchLoans();
                } catch { toast.error('Bulk delete failed'); }
              }} className="h-6 text-[10px] px-2 gap-1 bg-red-500/80 hover:bg-red-600 text-white border-0" data-testid="bulk-delete-btn">
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())} className="h-6 text-[10px] px-2 bg-white/20 hover:bg-white/30 text-white border-0" data-testid="bulk-deselect-btn">
              <X className="w-3 h-3" /> Deselect
            </Button>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {[
                { key: 'customer_name', label: 'Customer' },
                { key: 'company_name', label: 'Company' },
                { key: 'contact_no', label: 'Contact' },
                { key: 'bank', label: 'Bank' },
                { key: 'status', label: 'Status' },
                { key: 'scheme', label: 'Scheme' },
                { key: 'agent_name', label: 'Agent' },
                { key: 'month', label: 'Date' },
                { key: 'location', label: 'Location' },
                { key: 'branch', label: 'Branch' },
                { key: 'executive_name', label: 'Executive' },
                { key: 'team_manager', label: 'Manager' },
                { key: 'sanction', label: 'Sanction' },
                { key: 'disbursed', label: 'Disbursed' },
                { key: 'case_from', label: 'Case From' },
                { key: 'code', label: 'Code' },
                { key: 'rate', label: 'Rate' },
                { key: 'decline_reason', label: 'Decline' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] text-slate-500 mb-0.5 block">{f.label}</label>
                  <Input
                    placeholder={f.label}
                    value={filters[f.key] || ''}
                    onChange={(e) => setFilters({...filters, [f.key]: e.target.value})}
                    className="h-7 text-[11px]"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-end">
              <Button 
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-slate-500 hover:text-red-600"
                onClick={() => setFilters({
                  customer_name: '', company_name: '', contact_no: '', bank: '', status: '',
                  sanction: '', disbursed: '', remark: '', decline_reason: '', scheme: '',
                  case_from: '', location: '', branch: '', executive_name: '', team_manager: '',
                  code: '', rate: '', pf: '', insurance: '', tenure: '', subvention: '',
                  brokerage_subvention: '', agent_name: '', month: ''
                })}
                data-testid="clear-filters-btn"
              >
                <X className="w-3 h-3 mr-0.5" />
                Clear all
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
          const totals = calculateMonthTotals(monthLoans);
          
          return (
            <div key={month} className="border border-slate-200 rounded-lg bg-white shadow-sm">
              {/* Month Header */}
              <div
                className="flex items-center justify-between px-3 py-2 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                data-testid={`month-header-${month}`}
                onClick={() => toggleMonth(month)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#2c587a]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#2c587a]" />
                  )}
                  <span className="font-semibold text-xs text-slate-800">{month}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded-full">{monthLoans.length} entries</span>
                  {monthLoans.filter(l => l.entry_status === 'Closed').length > 0 && (
                    <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                      {monthLoans.filter(l => l.entry_status === 'Closed').length} closed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  {!isExpanded && (
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span>Sanctioned: <strong className="text-slate-700">₹{formatNumber(totals.sanction)}</strong></span>
                      <span>Disbursed: <strong className="text-emerald-700">₹{formatNumber(totals.disbursed)}</strong></span>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExportMonth(month); }}
                    className="flex items-center gap-0.5 h-6 px-2 text-[10px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                    data-testid={`export-month-${month}`}
                    title={`Export ${month}`}
                  >
                    <Download className="w-3 h-3" /> Export
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setAddEntryForMonth(month); setMonthInputValue(getDefaultDateForMonth(month)); setNewLoanData({ month: (() => { const r = getMonthDateRange(month); if (r.min) { const [y,m,d] = r.min.split('-'); return `${d}-${m}-${y}`; } return ''; })() }); setShowAddForm(true); }}
                    className="flex items-center gap-0.5 h-6 px-2 text-[10px] font-medium text-[#2c587a] bg-[#2c587a]/10 hover:bg-[#2c587a]/20 rounded transition-colors"
                    data-testid={`add-entry-${month}`}
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteMonth(month); }}
                      className="flex items-center gap-0.5 h-6 px-2 text-[10px] font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                      data-testid={`delete-month-${month}`}
                      title={`Delete & archive ${month}`}
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-[#2c587a]/5">
                        {showBulkSelect && (
                        <th className="px-2 py-1.5 w-8">
                          <input
                            type="checkbox"
                            checked={monthLoans.length > 0 && monthLoans.every(l => selectedIds.has(l.id))}
                            onChange={(e) => {
                              const newSet = new Set(selectedIds);
                              monthLoans.forEach(l => { e.target.checked ? newSet.add(l.id) : newSet.delete(l.id); });
                              setSelectedIds(newSet);
                            }}
                            className="w-3 h-3 rounded border-slate-300 text-[#2c587a] focus:ring-[#2c587a]"
                            data-testid={`select-all-${month}`}
                          />
                        </th>
                        )}
                        {ALL_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(c => (
                          <th key={c.key} className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{c.label}</th>
                        ))}
                        <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthLoans.map(loan => (
                        <tr key={loan.id} className={`transition-colors ${loan.entry_status === 'Closed' ? 'bg-slate-100/80 opacity-60' : ''} ${selectedIds.has(loan.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50/50'}`}>
                          {showBulkSelect && (
                          <td className="px-2 py-1">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(loan.id)}
                              onChange={() => {
                                const newSet = new Set(selectedIds);
                                newSet.has(loan.id) ? newSet.delete(loan.id) : newSet.add(loan.id);
                                setSelectedIds(newSet);
                              }}
                              className="w-3 h-3 rounded border-slate-300 text-[#2c587a] focus:ring-[#2c587a]"
                              data-testid={`select-row-${loan.id}`}
                            />
                          </td>
                          )}
                          {ALL_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(({ key: field }) => (
                            <td key={field} className={`px-2 py-1 whitespace-nowrap ${field === 'decline_reason' ? 'bg-red-50/40' : ''} ${loan.entry_status === 'Closed' ? 'line-through text-slate-400' : ''}`}>
                              {renderCell(loan, field, field)}
                            </td>
                          ))}
                          <td className="px-2 py-1 whitespace-nowrap sticky right-0 bg-white">
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleToggleEntryStatus(loan)}
                                className={`p-1 rounded transition-colors ${loan.entry_status === 'Closed' ? 'bg-red-50 hover:bg-red-100' : 'bg-emerald-50 hover:bg-emerald-100'}`}
                                title={loan.entry_status === 'Closed' ? 'Entry Closed – Click to Open' : 'Entry Open – Click to Close'}
                                data-testid={`entry-status-toggle-${loan.id}`}
                              >
                                {loan.entry_status === 'Closed' ? (
                                  <Lock className="w-3.5 h-3.5 text-red-500" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEditOpen(loan)}
                                className="p-1 rounded hover:bg-blue-50 transition-colors"
                                title="Edit"
                                data-testid={`mis-edit-${loan.id}`}
                              >
                                <Edit className="w-3.5 h-3.5 text-[#2c587a]" />
                              </button>
                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => handleDeleteLoan(loan.id)}
                                  className="p-1 rounded hover:bg-red-50 transition-colors"
                                  title="Delete"
                                  data-testid={`mis-delete-${loan.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      
                      {/* Totals Row */}
                      <tr className="bg-[#2c587a]/5 border-t border-[#2c587a]/20">
                        <td className="px-2 py-1.5"></td>
                        <td className="px-2 py-1.5 text-[10px] font-bold text-[#2c587a]" colSpan="8">
                          TOTAL ({monthLoans.length})
                        </td>
                        <td className="px-2 py-1.5 text-[10px] font-bold text-[#2c587a] text-right">₹{formatNumber(totals.sanction)}</td>
                        <td className="px-2 py-1.5 text-[10px] font-bold text-emerald-700 text-right">₹{formatNumber(totals.disbursed)}</td>
                        <td colSpan="10" className="px-2 py-1.5"></td>
                        <td className="px-2 py-1.5 text-[10px] font-bold text-[#2c587a] text-right">₹{formatNumber(totals.pf)}</td>
                        <td className="px-2 py-1.5 text-[10px] font-bold text-[#2c587a] text-right">₹{formatNumber(totals.insurance)}</td>
                        <td className="px-2 py-1.5"></td>
                        <td className="px-2 py-1.5 text-[10px] font-bold text-[#2c587a] text-right">₹{formatNumber(totals.subvention)}</td>
                        <td className="px-2 py-1.5 text-[10px] font-bold text-[#2c587a] text-right">₹{formatNumber(totals.brokerage)}</td>
                        <td className="px-2 py-1.5"></td>
                        <td className="px-2 py-1.5"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {months.length === 0 && (
        <div className="text-center py-16 text-slate-400" data-testid="empty-state">
          <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium">No entries found</p>
          <p className="text-[10px] mt-0.5">Click "Add Entry" to create your first loan application</p>
        </div>
      )}

      {/* Add Form Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Add New Entry{addEntryForMonth ? ` — ${addEntryForMonth}` : ''}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLoan} className="space-y-3">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {[
                { key: 'customer_name', label: 'Customer Name *', required: true },
                { key: 'contact_no', label: 'Contact Number *', required: true },
                { key: 'executive_name', label: 'Executive Name' },
                { key: 'team_manager', label: 'Team Manager' },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-[11px] text-slate-600">{f.label}</Label>
                  <Input
                    required={f.required}
                    value={newLoanData[f.key] || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, [f.key]: e.target.value})}
                    placeholder={f.placeholder || ''}
                    className="h-8 text-[11px] mt-0.5"
                  />
                </div>
              ))}
              <div>
                <Label className="text-[11px] text-slate-600">Company Name *</Label>
                {masterCompanies.length > 0 ? (
                  <Select value={newLoanData.company_name || ''} onValueChange={(value) => setNewLoanData({...newLoanData, company_name: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>{masterCompanies.map(c => <SelectItem key={c.id} value={c.name} className="text-[11px]">{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input required value={newLoanData.company_name || ''} onChange={(e) => setNewLoanData({...newLoanData, company_name: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Location</Label>
                {masterLocations.length > 0 ? (
                  <Select value={newLoanData.location || ''} onValueChange={(value) => setNewLoanData({...newLoanData, location: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>{masterLocations.map(l => <SelectItem key={l.id} value={l.name} className="text-[11px]">{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={newLoanData.location || ''} onChange={(e) => setNewLoanData({...newLoanData, location: e.target.value})} placeholder="City, State" className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Agent Name *</Label>
                {masterAgents.length > 0 ? (
                  <Select value={newLoanData.agent_name || ''} onValueChange={(value) => setNewLoanData({...newLoanData, agent_name: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>{masterAgents.map(a => <SelectItem key={a.id} value={a.name} className="text-[11px]">{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input required value={newLoanData.agent_name || ''} onChange={(e) => setNewLoanData({...newLoanData, agent_name: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Status *</Label>
                <Select value={newLoanData.status || ''} onValueChange={(value) => setNewLoanData({...newLoanData, status: value})}>
                  <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.name} className="text-[11px]">{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Bank *</Label>
                {masterBanks.length > 0 ? (
                  <Select value={newLoanData.bank || ''} onValueChange={(value) => setNewLoanData({...newLoanData, bank: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>{masterBanks.map(b => <SelectItem key={b.id} value={b.name} className="text-[11px]">{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input required value={newLoanData.bank || ''} onChange={(e) => setNewLoanData({...newLoanData, bank: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Category</Label>
                {masterCategories.length > 0 ? (
                  <Select value={newLoanData.category || ''} onValueChange={(value) => setNewLoanData({...newLoanData, category: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5" data-testid="add-category-select"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{masterCategories.map(c => <SelectItem key={c.id} value={c.name} className="text-[11px]">{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={newLoanData.category || ''} onChange={(e) => setNewLoanData({...newLoanData, category: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Product</Label>
                {masterProducts.length > 0 ? (
                  <Select value={newLoanData.product || ''} onValueChange={(value) => setNewLoanData({...newLoanData, product: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5" data-testid="add-product-select"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>{masterProducts.map(p => <SelectItem key={p.id} value={p.name} className="text-[11px]">{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={newLoanData.product || ''} onChange={(e) => setNewLoanData({...newLoanData, product: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Date *{addEntryForMonth && <span className="text-[10px] text-[#2c587a] ml-1">({addEntryForMonth})</span>}</Label>
                <Input
                  required
                  type="date"
                  value={monthInputValue}
                  onChange={(e) => {
                    setMonthInputValue(e.target.value);
                    if (e.target.value) {
                      const [year, month, day] = e.target.value.split('-');
                      setNewLoanData({...newLoanData, month: `${day}-${month}-${year}`});
                    } else {
                      setNewLoanData({...newLoanData, month: ''});
                    }
                  }}
                  className="h-8 text-[11px] mt-0.5 cursor-pointer"
                />
                {newLoanData.month && <p className="text-[10px] text-slate-400 mt-0.5">{newLoanData.month}</p>}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Sanction Amt</Label>
                <Input value={newLoanData.sanction || ''} onChange={(e) => setNewLoanData({...newLoanData, sanction: e.target.value})} placeholder="e.g., 500000" className="h-8 text-[11px] mt-0.5" />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Disbursed Amt</Label>
                <Input value={newLoanData.disbursed || ''} onChange={(e) => setNewLoanData({...newLoanData, disbursed: e.target.value})} placeholder="e.g., 500000" className="h-8 text-[11px] mt-0.5" />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Scheme</Label>
                <Select value={newLoanData.scheme || ''} onValueChange={(value) => setNewLoanData({...newLoanData, scheme: value})}>
                  <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{schemes.map(s => <SelectItem key={s.id} value={s.name} className="text-[11px]">{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {[
                { key: 'rate', label: 'Rate (%)', placeholder: '10.5' },
                { key: 'pf', label: 'PF' },
                { key: 'insurance', label: 'Insurance' },
                { key: 'tenure', label: 'Tenure (Months)', placeholder: '24, 36, 60' },
                { key: 'subvention', label: 'Subvention' },
                { key: 'brokerage_subvention', label: 'Brokerage' },
                { key: 'case_from', label: 'Case From' },
                { key: 'code', label: 'Code' },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-[11px] text-slate-600">{f.label}</Label>
                  <Input
                    value={newLoanData[f.key] || ''}
                    onChange={(e) => setNewLoanData({...newLoanData, [f.key]: e.target.value})}
                    placeholder={f.placeholder || ''}
                    className="h-8 text-[11px] mt-0.5"
                  />
                </div>
              ))}
              <div>
                <Label className="text-[11px] text-slate-600">Branch</Label>
                {masterBranches.length > 0 ? (
                  <Select value={newLoanData.branch || ''} onValueChange={(value) => setNewLoanData({...newLoanData, branch: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>{masterBranches.map(b => <SelectItem key={b.id} value={b.name} className="text-[11px]">{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={newLoanData.branch || ''} onChange={(e) => setNewLoanData({...newLoanData, branch: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-[11px] text-slate-600">Remark</Label>
                <Input value={newLoanData.remark || ''} onChange={(e) => setNewLoanData({...newLoanData, remark: e.target.value})} placeholder="Notes" className="h-8 text-[11px] mt-0.5" />
              </div>
              <div className="col-span-2">
                <Label className="text-[11px] text-red-500">Decline Reason</Label>
                <Input value={newLoanData.decline_reason || ''} onChange={(e) => setNewLoanData({...newLoanData, decline_reason: e.target.value})} placeholder="If rejected" className="h-8 text-[11px] mt-0.5 border-red-200 focus:border-red-400" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddForm(false); setAddEntryForMonth(null); }} className="h-7 text-[11px]">Cancel</Button>
              <Button type="submit" size="sm" className="h-7 text-[11px] bg-[#2c587a] hover:bg-[#234a68]">Add Entry</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Form Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {[
                { key: 'customer_name', label: 'Customer Name *', required: true },
                { key: 'contact_no', label: 'Contact Number *', required: true },
                { key: 'executive_name', label: 'Executive Name' },
                { key: 'team_manager', label: 'Team Manager' },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-[11px] text-slate-600">{f.label}</Label>
                  <Input
                    required={f.required}
                    value={editFormData[f.key] || ''}
                    onChange={(e) => setEditFormData({...editFormData, [f.key]: e.target.value})}
                    className="h-8 text-[11px] mt-0.5"
                  />
                </div>
              ))}
              <div>
                <Label className="text-[11px] text-slate-600">Company Name *</Label>
                {masterCompanies.length > 0 ? (
                  <Select value={editFormData.company_name || ''} onValueChange={(value) => setEditFormData({...editFormData, company_name: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>{masterCompanies.map(c => <SelectItem key={c.id} value={c.name} className="text-[11px]">{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input required value={editFormData.company_name || ''} onChange={(e) => setEditFormData({...editFormData, company_name: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Location</Label>
                {masterLocations.length > 0 ? (
                  <Select value={editFormData.location || ''} onValueChange={(value) => setEditFormData({...editFormData, location: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>{masterLocations.map(l => <SelectItem key={l.id} value={l.name} className="text-[11px]">{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={editFormData.location || ''} onChange={(e) => setEditFormData({...editFormData, location: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Agent Name *</Label>
                {masterAgents.length > 0 ? (
                  <Select value={editFormData.agent_name || ''} onValueChange={(value) => setEditFormData({...editFormData, agent_name: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>{masterAgents.map(a => <SelectItem key={a.id} value={a.name} className="text-[11px]">{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input required value={editFormData.agent_name || ''} onChange={(e) => setEditFormData({...editFormData, agent_name: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Status *</Label>
                <Select value={editFormData.status || ''} onValueChange={(value) => setEditFormData({...editFormData, status: value})}>
                  <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.name} className="text-[11px]">{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Bank *</Label>
                {masterBanks.length > 0 ? (
                  <Select value={editFormData.bank || ''} onValueChange={(value) => setEditFormData({...editFormData, bank: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>{masterBanks.map(b => <SelectItem key={b.id} value={b.name} className="text-[11px]">{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input required value={editFormData.bank || ''} onChange={(e) => setEditFormData({...editFormData, bank: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Category</Label>
                {masterCategories.length > 0 ? (
                  <Select value={editFormData.category || ''} onValueChange={(value) => setEditFormData({...editFormData, category: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5" data-testid="edit-category-select"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{masterCategories.map(c => <SelectItem key={c.id} value={c.name} className="text-[11px]">{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={editFormData.category || ''} onChange={(e) => setEditFormData({...editFormData, category: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Product</Label>
                {masterProducts.length > 0 ? (
                  <Select value={editFormData.product || ''} onValueChange={(value) => setEditFormData({...editFormData, product: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5" data-testid="edit-product-select"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>{masterProducts.map(p => <SelectItem key={p.id} value={p.name} className="text-[11px]">{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={editFormData.product || ''} onChange={(e) => setEditFormData({...editFormData, product: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Date *</Label>
                <Input
                  required
                  type="date"
                  value={editMonthInput}
                  onChange={(e) => {
                    setEditMonthInput(e.target.value);
                    if (e.target.value) {
                      const [year, month, day] = e.target.value.split('-');
                      setEditFormData({...editFormData, month: `${day}-${month}-${year}`});
                    } else {
                      setEditFormData({...editFormData, month: ''});
                    }
                  }}
                  className="h-8 text-[11px] mt-0.5 cursor-pointer"
                />
                {editFormData.month && <p className="text-[10px] text-slate-400 mt-0.5">{editFormData.month}</p>}
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Sanction Amt</Label>
                <Input value={editFormData.sanction || ''} onChange={(e) => setEditFormData({...editFormData, sanction: e.target.value})} className="h-8 text-[11px] mt-0.5" />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Disbursed Amt</Label>
                <Input value={editFormData.disbursed || ''} onChange={(e) => setEditFormData({...editFormData, disbursed: e.target.value})} className="h-8 text-[11px] mt-0.5" />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Scheme</Label>
                <Select value={editFormData.scheme || ''} onValueChange={(value) => setEditFormData({...editFormData, scheme: value})}>
                  <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{schemes.map(s => <SelectItem key={s.id} value={s.name} className="text-[11px]">{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {[
                { key: 'rate', label: 'Rate (%)' },
                { key: 'pf', label: 'PF' },
                { key: 'insurance', label: 'Insurance' },
                { key: 'tenure', label: 'Tenure (Months)' },
                { key: 'subvention', label: 'Subvention' },
                { key: 'brokerage_subvention', label: 'Brokerage' },
                { key: 'case_from', label: 'Case From' },
                { key: 'code', label: 'Code' },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-[11px] text-slate-600">{f.label}</Label>
                  <Input
                    value={editFormData[f.key] || ''}
                    onChange={(e) => setEditFormData({...editFormData, [f.key]: e.target.value})}
                    className="h-8 text-[11px] mt-0.5"
                  />
                </div>
              ))}
              <div>
                <Label className="text-[11px] text-slate-600">Branch</Label>
                {masterBranches.length > 0 ? (
                  <Select value={editFormData.branch || ''} onValueChange={(value) => setEditFormData({...editFormData, branch: value})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>{masterBranches.map(b => <SelectItem key={b.id} value={b.name} className="text-[11px]">{b.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={editFormData.branch || ''} onChange={(e) => setEditFormData({...editFormData, branch: e.target.value})} className="h-8 text-[11px] mt-0.5" />
                )}
              </div>
              <div className="col-span-2">
                <Label className="text-[11px] text-slate-600">Remark</Label>
                <Input value={editFormData.remark || ''} onChange={(e) => setEditFormData({...editFormData, remark: e.target.value})} className="h-8 text-[11px] mt-0.5" />
              </div>
              <div className="col-span-2">
                <Label className="text-[11px] text-red-500">Decline Reason</Label>
                <Input value={editFormData.decline_reason || ''} onChange={(e) => setEditFormData({...editFormData, decline_reason: e.target.value})} className="h-8 text-[11px] mt-0.5 border-red-200 focus:border-red-400" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEditForm(false)} className="h-7 text-[11px]">Cancel</Button>
              <Button type="submit" size="sm" className="h-7 text-[11px] bg-[#2c587a] hover:bg-[#234a68]">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Analysis Dialog */}
      <Dialog open={showAIAnalysis} onOpenChange={setShowAIAnalysis}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#2c587a]" />
              AI Data Analysis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-1.5">
              <Input
                placeholder='e.g., "What are the trends?" or "Top performing banks?"'
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAIAnalysis()}
                className="h-8 text-[11px]"
              />
              <Button onClick={handleAIAnalysis} disabled={aiLoading} size="sm" className="h-8 text-[11px] bg-[#2c587a] hover:bg-[#234a68] shrink-0">
                {aiLoading ? '...' : 'Ask'}
              </Button>
            </div>
            {aiAnalysis && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-[11px] text-slate-700 whitespace-pre-wrap">{aiAnalysis}</div>
              </div>
            )}
            <div className="text-[10px] text-slate-400">
              <p className="font-medium mb-1">Try asking:</p>
              <ul className="space-y-0.5 ml-3 list-disc">
                <li>Top performing banks this month?</li>
                <li>Conversion rate trends</li>
                <li>Average sanction amount?</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Import from Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] text-slate-600">
              <p><strong>Required:</strong> Customer Name, Status, Bank, Month</p>
              <p className="mt-0.5"><strong>Optional:</strong> Company, Contact, Location, Executive, Sanction, Disbursed, etc.</p>
            </div>
            <div>
              <Label className="text-[11px]">Excel File (.xlsx/.xls)</Label>
              <Input type="file" accept=".xlsx,.xls" onChange={(e) => setImportFile(e.target.files[0])} className="h-8 text-[11px] mt-0.5 cursor-pointer" />
              {importFile && <p className="text-[10px] text-emerald-600 mt-0.5">Selected: {importFile.name}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowImportDialog(false); setImportFile(null); }} className="h-7 text-[11px]">Cancel</Button>
              <Button onClick={handleImportExcel} disabled={importing || !importFile} size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700">
                <Upload className="w-3 h-3 mr-1" />
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Month Dialog */}
      <Dialog open={showAddMonthDialog} onOpenChange={setShowAddMonthDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Month Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-[11px] text-slate-600">Select Month</Label>
              <Input
                type="month"
                value={newMonthValue}
                onChange={(e) => setNewMonthValue(e.target.value)}
                className="h-8 text-[11px] mt-1"
                data-testid="add-month-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddMonthDialog(false)} className="h-7 text-[11px]">Cancel</Button>
              <Button
                size="sm"
                className="h-7 text-[11px] bg-[#2c587a] hover:bg-[#234a68]"
                data-testid="add-month-confirm"
                onClick={async () => {
                  if (!newMonthValue) { toast.error('Please select a month'); return; }
                  const monthKey = fromInputMonth(newMonthValue);
                  if (!emptyMonthGroups.includes(monthKey) && !Object.keys(groupedLoans).includes(monthKey)) {
                    setEmptyMonthGroups([...emptyMonthGroups, monthKey]);
                    setExpandedMonths(prev => new Set([...prev, monthKey]));
                    toast.success(`${monthKey} added`);
                    // Auto carry-forward non-Disbursed loans from previous month
                    try {
                      const res = await axios.post(`${API}/loans/carry-forward`, { to_month_key: monthKey });
                      if (res.data.carried_count > 0) {
                        toast.success(`${res.data.carried_count} loans carried forward from ${res.data.from_month}`);
                        fetchLoans();
                      } else {
                        toast.info(res.data.message);
                      }
                    } catch (err) {
                      toast.error(err.response?.data?.detail || 'Carry forward failed');
                    }
                  } else {
                    setExpandedMonths(prev => new Set([...prev, monthKey]));
                    toast.info(`${monthKey} already exists`);
                  }
                  setShowAddMonthDialog(false);
                }}
              >
                Add Month
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonthlyMIS;
