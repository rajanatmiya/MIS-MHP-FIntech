import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Check, ChevronRight, ChevronLeft, User, Users, Building2, Tag, Eye } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Basic Info', icon: User },
  { id: 2, title: 'Team', icon: Users },
  { id: 3, title: 'Banks', icon: Building2 },
  { id: 4, title: 'Category & Product', icon: Tag },
  { id: 5, title: 'Review', icon: Eye },
];

const AgentOnboarding = () => {
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);
  const [masterBanks, setMasterBanks] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [masterProducts, setMasterProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'agent',
    team_code: '', manager_id: '',
    assigned_banks: [], assigned_categories: [], assigned_products: []
  });
  const [searchBank, setSearchBank] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, banksRes, catsRes, prodsRes] = await Promise.all([
          axios.get(`${API}/users`),
          axios.get(`${API}/master/banks`),
          axios.get(`${API}/master/categories`),
          axios.get(`${API}/master/products`)
        ]);
        setManagers((usersRes.data || []).filter(u => u.role === 'manager'));
        setMasterBanks(banksRes.data || []);
        setMasterCategories(catsRes.data || []);
        setMasterProducts(prodsRes.data || []);
      } catch { toast.error('Failed to load data'); }
    };
    fetchData();
  }, []);

  const canProceed = () => {
    if (step === 1) return formData.name && formData.email && formData.password;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = { ...formData, manager_id: formData.manager_id || null, team_code: formData.team_code || null };
      await axios.post(`${API}/auth/register`, payload);
      toast.success(`${formData.role === 'manager' ? 'Manager' : 'Agent'} "${formData.name}" onboarded successfully!`);
      setFormData({ name: '', email: '', password: '', role: 'agent', team_code: '', manager_id: '', assigned_banks: [], assigned_categories: [], assigned_products: [] });
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user');
    } finally { setLoading(false); }
  };

  const toggleItem = (field, item) => {
    const list = formData[field] || [];
    const exists = list.includes(item);
    setFormData({ ...formData, [field]: exists ? list.filter(i => i !== item) : [...list, item] });
  };

  const filteredBanks = masterBanks.filter(b => b.name.toLowerCase().includes(searchBank.toLowerCase()));

  return (
    <div className="max-w-3xl mx-auto space-y-4 fade-in" data-testid="agent-onboarding-page">
      <div>
        <h1 className="text-sm font-bold text-slate-800" data-testid="onboarding-title">Onboard New Agent</h1>
        <p className="text-[10px] text-slate-400 mt-0.5">Step-by-step wizard to set up a new team member</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1" data-testid="onboarding-steps">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <React.Fragment key={s.id}>
              <button
                onClick={() => { if (done) setStep(s.id); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  active ? 'bg-[#2c587a] text-white shadow-sm' : done ? 'bg-emerald-50 text-emerald-700 cursor-pointer hover:bg-emerald-100' : 'bg-slate-100 text-slate-400'
                }`}
                data-testid={`step-${s.id}`}
              >
                {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.title}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          {step === 1 && (
            <div className="space-y-3" data-testid="step-1-content">
              <p className="text-xs font-semibold text-slate-700 mb-3">Basic Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">Full Name *</Label>
                  <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-8 text-[11px] mt-0.5" data-testid="onboard-name" placeholder="e.g., Rahul Sharma" />
                </div>
                <div>
                  <Label className="text-[11px]">Email *</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="h-8 text-[11px] mt-0.5" data-testid="onboard-email" placeholder="e.g., rahul@example.com" />
                </div>
                <div>
                  <Label className="text-[11px]">Password *</Label>
                  <Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="h-8 text-[11px] mt-0.5" data-testid="onboard-password" placeholder="Min 6 characters" />
                </div>
                <div>
                  <Label className="text-[11px]">Role</Label>
                  <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5" data-testid="onboard-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent" className="text-[11px]">Agent</SelectItem>
                      <SelectItem value="manager" className="text-[11px]">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3" data-testid="step-2-content">
              <p className="text-xs font-semibold text-slate-700 mb-3">Team Assignment</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">Team Code</Label>
                  <Input value={formData.team_code} onChange={e => setFormData({ ...formData, team_code: e.target.value })} className="h-8 text-[11px] mt-0.5" data-testid="onboard-team" placeholder="e.g., TEAM-A" />
                  <p className="text-[10px] text-slate-400 mt-0.5">Group agents under same team for manager visibility</p>
                </div>
                {formData.role === 'agent' && managers.length > 0 && (
                  <div>
                    <Label className="text-[11px]">Assign Manager</Label>
                    <Select value={formData.manager_id || undefined} onValueChange={v => setFormData({ ...formData, manager_id: v })}>
                      <SelectTrigger className="h-8 text-[11px] mt-0.5" data-testid="onboard-manager"><SelectValue placeholder="Select manager" /></SelectTrigger>
                      <SelectContent>
                        {managers.map(m => <SelectItem key={m.id} value={m.id} className="text-[11px]">{m.name} ({m.team_code || 'No team'})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-400 mt-0.5">Manager will see this agent's data</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3" data-testid="step-3-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Assign Banks</p>
                  <p className="text-[10px] text-slate-400">Agent will only see loans for selected banks. Leave empty for all.</p>
                </div>
                <span className="text-[10px] font-medium text-[#2c587a] bg-[#2c587a]/10 px-2 py-0.5 rounded-full">{formData.assigned_banks.length} selected</span>
              </div>
              <Input value={searchBank} onChange={e => setSearchBank(e.target.value)} placeholder="Search banks..." className="h-8 text-[11px]" data-testid="bank-search" />
              <div className="border border-slate-200 rounded-md p-2 max-h-[200px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-x-2" data-testid="onboard-banks">
                {filteredBanks.map(bank => {
                  const selected = formData.assigned_banks.includes(bank.name);
                  return (
                    <label key={bank.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={selected} onChange={() => toggleItem('assigned_banks', bank.name)} className="w-3 h-3 rounded border-slate-300 text-[#2c587a]" />
                      <span className="text-[11px] text-slate-700 truncate">{bank.name}</span>
                    </label>
                  );
                })}
              </div>
              {formData.assigned_banks.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.assigned_banks.map(b => (
                    <span key={b} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#2c587a]/10 text-[10px] text-[#2c587a] font-medium cursor-pointer hover:bg-red-50 hover:text-red-600" onClick={() => toggleItem('assigned_banks', b)}>
                      {b} &times;
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3" data-testid="step-4-content">
              <p className="text-xs font-semibold text-slate-700 mb-1">Assign Categories & Products</p>
              <p className="text-[10px] text-slate-400 mb-3">Restrict visibility to specific loan categories and products. Leave empty for all.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[11px]">Categories</Label>
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{formData.assigned_categories.length} selected</span>
                  </div>
                  <div className="border border-slate-200 rounded-md p-2 max-h-[180px] overflow-y-auto space-y-1" data-testid="onboard-categories">
                    {masterCategories.map(cat => {
                      const selected = formData.assigned_categories.includes(cat.name);
                      return (
                        <label key={cat.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${selected ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                          <input type="checkbox" checked={selected} onChange={() => toggleItem('assigned_categories', cat.name)} className="w-3 h-3 rounded border-slate-300 text-emerald-600" />
                          <span className="text-[11px] text-slate-700">{cat.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[11px]">Products</Label>
                    <span className="text-[10px] font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">{formData.assigned_products.length} selected</span>
                  </div>
                  <div className="border border-slate-200 rounded-md p-2 max-h-[180px] overflow-y-auto space-y-1" data-testid="onboard-products">
                    {masterProducts.map(prod => {
                      const selected = formData.assigned_products.includes(prod.name);
                      return (
                        <label key={prod.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${selected ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                          <input type="checkbox" checked={selected} onChange={() => toggleItem('assigned_products', prod.name)} className="w-3 h-3 rounded border-slate-300 text-violet-600" />
                          <span className="text-[11px] text-slate-700">{prod.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3" data-testid="step-5-content">
              <p className="text-xs font-semibold text-slate-700 mb-3">Review & Confirm</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">User Details</p>
                  <div className="text-[11px] text-slate-700 space-y-1">
                    <p><span className="text-slate-400">Name:</span> <span className="font-medium">{formData.name}</span></p>
                    <p><span className="text-slate-400">Email:</span> <span className="font-medium">{formData.email}</span></p>
                    <p><span className="text-slate-400">Role:</span> <span className="font-medium capitalize">{formData.role}</span></p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Team</p>
                  <div className="text-[11px] text-slate-700 space-y-1">
                    <p><span className="text-slate-400">Team Code:</span> <span className="font-medium">{formData.team_code || 'None'}</span></p>
                    <p><span className="text-slate-400">Manager:</span> <span className="font-medium">{managers.find(m => m.id === formData.manager_id)?.name || 'None'}</span></p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Access Control</p>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400">Banks ({formData.assigned_banks.length}):</span>
                    {formData.assigned_banks.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {formData.assigned_banks.map(b => <span key={b} className="px-1.5 py-0.5 rounded-full bg-[#2c587a]/10 text-[9px] text-[#2c587a] font-medium">{b}</span>)}
                      </div>
                    ) : <span className="text-[11px] text-slate-500 ml-1">All banks (no restriction)</span>}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Categories ({formData.assigned_categories.length}):</span>
                    {formData.assigned_categories.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {formData.assigned_categories.map(c => <span key={c} className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-[9px] text-emerald-700 font-medium">{c}</span>)}
                      </div>
                    ) : <span className="text-[11px] text-slate-500 ml-1">All categories</span>}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Products ({formData.assigned_products.length}):</span>
                    {formData.assigned_products.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {formData.assigned_products.map(p => <span key={p} className="px-1.5 py-0.5 rounded-full bg-violet-100 text-[9px] text-violet-700 font-medium">{p}</span>)}
                      </div>
                    ) : <span className="text-[11px] text-slate-500 ml-1">All products</span>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} disabled={step === 1} className="h-7 text-[11px] gap-1" data-testid="onboard-prev">
          <ChevronLeft className="w-3 h-3" /> Back
        </Button>
        {step < 5 ? (
          <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="h-7 text-[11px] gap-1 bg-[#2c587a] hover:bg-[#234a68]" data-testid="onboard-next">
            Next <ChevronRight className="w-3 h-3" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleSubmit} disabled={loading} className="h-7 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700" data-testid="onboard-submit">
            {loading ? 'Creating...' : <><Check className="w-3 h-3" /> Create {formData.role === 'manager' ? 'Manager' : 'Agent'}</>}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AgentOnboarding;
