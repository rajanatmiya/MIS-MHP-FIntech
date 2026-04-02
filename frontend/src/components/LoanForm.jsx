import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  'Decline',
  'Disbursed',
  'Hold',
  'Login Done',
  'Sent For Login',
  'Pd To Be Done',
  "Won't Do",
  'Drop',
  'Cam Done'
];

const SCHEME_OPTIONS = ['Salaried PL', 'BIL', 'OD', 'Banking'];
const CASE_TYPE_OPTIONS = ['In House', 'Out House'];

const LoanForm = ({ loan, onSuccess, onCancel }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [uniqueValues, setUniqueValues] = useState({ banks: [], agents: [] });
  const [masterBanks, setMasterBanks] = useState([]);
  const [masterAgents, setMasterAgents] = useState([]);
  const [masterCompanies, setMasterCompanies] = useState([]);
  const [masterBranches, setMasterBranches] = useState([]);
  const [masterLocations, setMasterLocations] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [formData, setFormData] = useState({
    agent_name: '',
    customer_name: '',
    company_name: '',
    contact_no: '',
    status: '',
    bank: '',
    sanction: '',
    disbursed: '',
    remark: '',
    scheme: '',
    case_type: '',
    from_location: '',
    branch: '',
    executive_name: '',
    team_manager_code: '',
    category: '',
    product: '',
    month: ''
  });

  useEffect(() => {
    fetchUniqueValues();
    if (loan) {
      setFormData({
        agent_name: loan.agent_name || '',
        customer_name: loan.customer_name || '',
        company_name: loan.company_name || '',
        contact_no: loan.contact_no || '',
        status: loan.status || '',
        bank: loan.bank || '',
        sanction: loan.sanction || '',
        disbursed: loan.disbursed || '',
        remark: loan.remark || '',
        scheme: loan.scheme || '',
        case_type: loan.case_type || '',
        from_location: loan.from_location || '',
        branch: loan.branch || '',
        executive_name: loan.executive_name || '',
        team_manager_code: loan.team_manager_code || '',
        category: loan.category || '',
        product: loan.product || '',
        month: loan.month || ''
      });
    }
  }, [loan]);

  const fetchUniqueValues = async () => {
    try {
      const [uniqueRes, banksRes, agentsRes, statusesRes, schemesRes, companiesRes, branchesRes, locationsRes, categoriesRes, productsRes] = await Promise.all([
        axios.get(`${API}/analytics/unique-values`),
        axios.get(`${API}/master/banks`),
        axios.get(`${API}/master/agents`),
        axios.get(`${API}/statuses`),
        axios.get(`${API}/schemes`),
        axios.get(`${API}/master/companies`),
        axios.get(`${API}/master/branches`),
        axios.get(`${API}/master/locations`),
        axios.get(`${API}/master/categories`),
        axios.get(`${API}/master/products`)
      ]);
      setUniqueValues(uniqueRes.data);
      setMasterBanks(banksRes.data);
      setMasterAgents(agentsRes.data);
      setStatuses(statusesRes.data);
      setSchemes(schemesRes.data);
      setMasterCompanies(companiesRes.data);
      setMasterBranches(branchesRes.data);
      setMasterLocations(locationsRes.data);
      setMasterCategories(categoriesRes.data);
      setMasterProducts(productsRes.data);
    } catch (error) {
      console.error('Failed to fetch form data');
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (loan) {
        await axios.put(`${API}/loans/${loan.id}`, formData);
        toast.success('Loan application updated successfully');
      } else {
        await axios.post(`${API}/loans`, formData);
        toast.success('Loan application created successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save loan application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="loan-form">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agent Name */}
        <div className="space-y-2">
          <Label htmlFor="agent_name">Agent Name *</Label>
          {masterAgents.length > 0 ? (
            <Select value={formData.agent_name} onValueChange={(value) => handleChange('agent_name', value)} required>
              <SelectTrigger data-testid="agent-name-input">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {masterAgents.map(a => (
                  <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="agent_name"
              value={formData.agent_name}
              onChange={(e) => handleChange('agent_name', e.target.value)}
              required
              data-testid="agent-name-input"
            />
          )}
        </div>

        {/* Customer Name */}
        <div className="space-y-2">
          <Label htmlFor="customer_name">Customer Name *</Label>
          <Input
            id="customer_name"
            value={formData.customer_name}
            onChange={(e) => handleChange('customer_name', e.target.value)}
            required
            data-testid="customer-name-input"
          />
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="company_name">Company Name *</Label>
          {masterCompanies.length > 0 ? (
            <Select value={formData.company_name} onValueChange={(value) => handleChange('company_name', value)} required>
              <SelectTrigger data-testid="company-name-input">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {masterCompanies.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              required
              data-testid="company-name-input"
            />
          )}
        </div>

        {/* Contact No */}
        <div className="space-y-2">
          <Label htmlFor="contact_no">Contact Number *</Label>
          <Input
            id="contact_no"
            value={formData.contact_no}
            onChange={(e) => handleChange('contact_no', e.target.value)}
            required
            data-testid="contact-no-input"
          />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select value={formData.status} onValueChange={(value) => handleChange('status', value)} required>
            <SelectTrigger data-testid="status-select">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.length > 0 ? statuses.map(s => (
                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
              )) : STATUS_OPTIONS.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bank */}
        <div className="space-y-2">
          <Label htmlFor="bank">Bank *</Label>
          {masterBanks.length > 0 ? (
            <Select value={formData.bank} onValueChange={(value) => handleChange('bank', value)} required>
              <SelectTrigger data-testid="bank-input">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {masterBanks.map(b => (
                  <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="bank"
              value={formData.bank}
              onChange={(e) => handleChange('bank', e.target.value)}
              required
              data-testid="bank-input"
            />
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          {masterCategories.length > 0 ? (
            <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
              <SelectTrigger data-testid="category-select">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {masterCategories.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              data-testid="category-select"
            />
          )}
        </div>

        {/* Product */}
        <div className="space-y-2">
          <Label htmlFor="product">Product</Label>
          {masterProducts.length > 0 ? (
            <Select value={formData.product} onValueChange={(value) => handleChange('product', value)}>
              <SelectTrigger data-testid="product-select">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {masterProducts.map(p => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="product"
              value={formData.product}
              onChange={(e) => handleChange('product', e.target.value)}
              data-testid="product-select"
            />
          )}
        </div>

        {/* Sanction */}
        <div className="space-y-2">
          <Label htmlFor="sanction">Sanction</Label>
          <Input
            id="sanction"
            value={formData.sanction}
            onChange={(e) => handleChange('sanction', e.target.value)}
            data-testid="sanction-input"
          />
        </div>

        {/* Disbursed */}
        <div className="space-y-2">
          <Label htmlFor="disbursed">Disbursed</Label>
          <Input
            id="disbursed"
            value={formData.disbursed}
            onChange={(e) => handleChange('disbursed', e.target.value)}
            data-testid="disbursed-input"
          />
        </div>

        {/* Scheme */}
        <div className="space-y-2">
          <Label htmlFor="scheme">Scheme</Label>
          <Select value={formData.scheme} onValueChange={(value) => handleChange('scheme', value)}>
            <SelectTrigger data-testid="scheme-select">
              <SelectValue placeholder="Select scheme" />
            </SelectTrigger>
            <SelectContent>
              {schemes.length > 0 ? schemes.map(s => (
                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
              )) : SCHEME_OPTIONS.map(scheme => (
                <SelectItem key={scheme} value={scheme}>{scheme}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Case Type */}
        <div className="space-y-2">
          <Label htmlFor="case_type">Case Type</Label>
          <Select value={formData.case_type} onValueChange={(value) => handleChange('case_type', value)}>
            <SelectTrigger data-testid="case-type-select">
              <SelectValue placeholder="Select case type" />
            </SelectTrigger>
            <SelectContent>
              {CASE_TYPE_OPTIONS.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* From Location */}
        <div className="space-y-2">
          <Label htmlFor="from_location">From Location</Label>
          {masterLocations.length > 0 ? (
            <Select value={formData.from_location} onValueChange={(value) => handleChange('from_location', value)}>
              <SelectTrigger data-testid="from-location-input">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {masterLocations.map(l => (
                  <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="from_location"
              value={formData.from_location}
              onChange={(e) => handleChange('from_location', e.target.value)}
              data-testid="from-location-input"
            />
          )}
        </div>

        {/* Branch */}
        <div className="space-y-2">
          <Label htmlFor="branch">Branch</Label>
          {masterBranches.length > 0 ? (
            <Select value={formData.branch} onValueChange={(value) => handleChange('branch', value)}>
              <SelectTrigger data-testid="branch-input">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {masterBranches.map(b => (
                  <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="branch"
              value={formData.branch}
              onChange={(e) => handleChange('branch', e.target.value)}
              data-testid="branch-input"
            />
          )}
        </div>

        {/* Executive Name */}
        <div className="space-y-2">
          <Label htmlFor="executive_name">Executive Name</Label>
          <Input
            id="executive_name"
            value={formData.executive_name}
            onChange={(e) => handleChange('executive_name', e.target.value)}
            data-testid="executive-name-input"
          />
        </div>

        {/* Team Manager Code */}
        <div className="space-y-2">
          <Label htmlFor="team_manager_code">Team Manager Code</Label>
          <Input
            id="team_manager_code"
            value={formData.team_manager_code}
            onChange={(e) => handleChange('team_manager_code', e.target.value)}
            data-testid="team-manager-code-input"
          />
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="month">Date *</Label>
          <Input
            id="month"
            type="date"
            value={(() => {
              // Convert dd-mm-yyyy to yyyy-mm-dd for native date input
              const v = formData.month;
              if (!v) return '';
              const parts = v.split('-');
              if (parts.length === 3 && parts[0].length === 2) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
              return v;
            })()}
            onChange={(e) => {
              // Convert yyyy-mm-dd from input to dd-mm-yyyy for storage
              const val = e.target.value;
              if (!val) { handleChange('month', ''); return; }
              const [y, m, d] = val.split('-');
              handleChange('month', `${d}-${m}-${y}`);
            }}
            required
            data-testid="month-input"
          />
        </div>
      </div>

      {/* Remark */}
      <div className="space-y-2">
        <Label htmlFor="remark">Remark</Label>
        <Textarea
          id="remark"
          value={formData.remark}
          onChange={(e) => handleChange('remark', e.target.value)}
          rows={3}
          data-testid="remark-input"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="cancel-button">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
          data-testid="submit-loan-button"
        >
          {loading ? 'Saving...' : loan ? 'Update Loan' : 'Create Loan'}
        </Button>
      </div>
    </form>
  );
};

export default LoanForm;