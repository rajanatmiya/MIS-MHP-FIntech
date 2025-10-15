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
    status: '',
    bank: '',
    month: '',
    agent_name: ''
  });
  
  // AI states
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');

  useEffect(() => {
    fetchLoans();
  }, []);

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

  const filteredLoans = loans.filter(loan => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      loan.customer_name?.toLowerCase().includes(searchLower) ||
      loan.company_name?.toLowerCase().includes(searchLower) ||
      loan.contact_no?.toLowerCase().includes(searchLower) ||
      loan.location?.toLowerCase().includes(searchLower) ||
      loan.agent_name?.toLowerCase().includes(searchLower) ||
      loan.status?.toLowerCase().includes(searchLower) ||
      loan.bank?.toLowerCase().includes(searchLower) ||
      loan.product_type?.toLowerCase().includes(searchLower)
    );
    
    const matchesFilters = (
      (!filters.status || loan.status === filters.status) &&
      (!filters.bank || loan.bank === filters.bank) &&
      (!filters.month || loan.month === filters.month) &&
      (!filters.agent_name || loan.agent_name === filters.agent_name)
    );
    
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
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Entry
        </Button>
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
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(val) => setFilters({...filters, status: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Disbursed">Disbursed</SelectItem>
                    <SelectItem value="Declined">Declined</SelectItem>
                    <SelectItem value="Hold">Hold</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label>Month</Label>
                <Input
                  placeholder="e.g., Jan'25"
                  value={filters.month}
                  onChange={(e) => setFilters({...filters, month: e.target.value})}
                />
              </div>
              <div>
                <Label>Executive Name</Label>
                <Input
                  placeholder="Agent name"
                  value={filters.agent_name}
                  onChange={(e) => setFilters({...filters, agent_name: e.target.value})}
                />
              </div>
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Customer Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Company Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Contact</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Location</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Executive Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Bank</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Sanction</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Disbursed</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">ROI (%)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Tenure</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Product Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Login Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase whitespace-nowrap">Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {monthLoans.map(loan => (
                          <tr key={loan.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-sm text-slate-700 whitespace-nowrap">
                              {new Date(loan.created_at).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'customer_name', 'Customer Name')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'company_name', 'Company Name')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'contact_no', 'Contact')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'location', 'Location')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'agent_name', 'Executive Name')}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {renderCell(loan, 'status', 'Status')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'bank', 'Bank')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'sanction', 'Sanction')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'disbursed', 'Disbursed')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'rate_of_interest', 'ROI')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'tenure', 'Tenure')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'product_type', 'Product Type')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'login_date', 'Login Date')}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-800">
                              {renderCell(loan, 'remark', 'Remark')}
                            </td>
                          </tr>
                        ))}
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
                <Label>Executive Name *</Label>
                <Input
                  required
                  value={newLoanData.agent_name || ''}
                  onChange={(e) => setNewLoanData({...newLoanData, agent_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Status *</Label>
                <Input
                  required
                  value={newLoanData.status || ''}
                  onChange={(e) => setNewLoanData({...newLoanData, status: e.target.value})}
                  placeholder="e.g., Pending, Approved, Disbursed"
                />
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
                  value={newLoanData.month || ''}
                  onChange={(e) => setNewLoanData({...newLoanData, month: e.target.value})}
                  placeholder="e.g., Jan'25, Feb'25"
                />
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
                <Label>Rate of Interest (%)</Label>
                <Input
                  value={newLoanData.rate_of_interest || ''}
                  onChange={(e) => setNewLoanData({...newLoanData, rate_of_interest: e.target.value})}
                  placeholder="e.g., 10.5"
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
                <Label>Product Type</Label>
                <Input
                  value={newLoanData.product_type || ''}
                  onChange={(e) => setNewLoanData({...newLoanData, product_type: e.target.value})}
                  placeholder="e.g., Personal Loan, Business Loan"
                />
              </div>
              <div>
                <Label>Login Date</Label>
                <Input
                  type="date"
                  value={newLoanData.login_date || ''}
                  onChange={(e) => setNewLoanData({...newLoanData, login_date: e.target.value})}
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
            </div>
            <div className="flex gap-2 justify-end">
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
    </div>
  );
};

export default MonthlyMIS;
