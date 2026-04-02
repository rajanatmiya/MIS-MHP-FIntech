import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Building2, UserCheck, Plus, Edit, Trash2, Search, Briefcase, GitBranch, MapPin, Tag, Package } from 'lucide-react';
import { toast } from 'sonner';

const MasterSection = ({ title, icon: Icon, items, onAdd, onEdit, onDelete, isAdmin }) => {
  const [search, setSearch] = useState('');
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-[#2c587a]" />
            <p className="text-xs font-semibold text-slate-700">{title}</p>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{items.length}</span>
          </div>
          {isAdmin && (
            <Button onClick={onAdd} size="sm" className="h-7 text-[11px] px-2.5 bg-[#2c587a] hover:bg-[#234a68]" data-testid={`add-${title.toLowerCase().replace(/\s/g, '-')}-btn`}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          )}
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-[11px] pl-7"
            data-testid={`search-${title.toLowerCase().replace(/\s/g, '-')}`}
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto space-y-0.5">
          {filtered.length > 0 ? filtered.map((item, idx) => (
            <div key={item.id} className={`flex items-center justify-between px-2.5 py-1.5 rounded ${idx % 2 === 0 ? 'bg-slate-50/60' : ''} hover:bg-blue-50/40 transition-colors group`}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] text-slate-400 w-5 text-right">{idx + 1}.</span>
                <span className="text-[11px] text-slate-700 truncate" data-testid={`master-item-${item.id}`}>{item.name}</span>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onEdit(item)} className="p-1 rounded hover:bg-blue-100 transition-colors" data-testid={`edit-master-${item.id}`}>
                    <Edit className="w-3 h-3 text-[#2c587a]" />
                  </button>
                  <button onClick={() => onDelete(item)} className="p-1 rounded hover:bg-red-100 transition-colors" data-testid={`delete-master-${item.id}`}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              )}
            </div>
          )) : (
            <p className="text-[11px] text-slate-400 text-center py-6">No {title.toLowerCase()} found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CATEGORIES = [
  { key: 'banks', endpoint: 'banks', title: 'Bank Names', icon: Building2, placeholder: 'e.g., State Bank of India' },
  { key: 'agents', endpoint: 'agents', title: 'Agent Names', icon: UserCheck, placeholder: 'e.g., Rajesh Kumar' },
  { key: 'companies', endpoint: 'companies', title: 'Company Names', icon: Briefcase, placeholder: 'e.g., Tata Consultancy' },
  { key: 'branches', endpoint: 'branches', title: 'Branches', icon: GitBranch, placeholder: 'e.g., Andheri West' },
  { key: 'locations', endpoint: 'locations', title: 'Locations', icon: MapPin, placeholder: 'e.g., Mumbai, Maharashtra' },
  { key: 'categories', endpoint: 'categories', title: 'Categories', icon: Tag, placeholder: 'e.g., UNSECURED, SECURED, Salaried' },
  { key: 'products', endpoint: 'products', title: 'Products', icon: Package, placeholder: 'e.g., Home Loan, LAP, Working Capital' },
];

const MasterFile = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({ banks: [], agents: [], companies: [], branches: [], locations: [], categories: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [dialogMode, setDialogMode] = useState('add');
  const [editItem, setEditItem] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const results = await Promise.all(
        CATEGORIES.map(c => axios.get(`${API}/master/${c.endpoint}`))
      );
      const newData = {};
      CATEGORIES.forEach((c, i) => { newData[c.key] = results[i].data; });
      setData(newData);
    } catch (error) { toast.error('Failed to fetch master data'); }
    finally { setLoading(false); }
  };

  const openAdd = (cat) => {
    setActiveCategory(cat);
    setDialogMode('add');
    setEditItem(null);
    setInputValue('');
    setShowDialog(true);
  };

  const openEdit = (cat, item) => {
    setActiveCategory(cat);
    setDialogMode('edit');
    setEditItem(item);
    setInputValue(item.name);
    setShowDialog(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeCategory) return;
    try {
      if (dialogMode === 'add') {
        const res = await axios.post(`${API}/master/${activeCategory.endpoint}`, { name: inputValue.trim() });
        setData(prev => ({ ...prev, [activeCategory.key]: [...prev[activeCategory.key], res.data] }));
        toast.success(`${activeCategory.title.replace(/s$/, '')} added`);
      } else {
        await axios.put(`${API}/master/${activeCategory.endpoint}/${editItem.id}`, { name: inputValue.trim() });
        setData(prev => ({
          ...prev,
          [activeCategory.key]: prev[activeCategory.key].map(i => i.id === editItem.id ? { ...i, name: inputValue.trim() } : i)
        }));
        toast.success('Updated');
      }
      setShowDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (cat, item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await axios.delete(`${API}/master/${cat.endpoint}/${item.id}`);
      setData(prev => ({ ...prev, [cat.key]: prev[cat.key].filter(i => i.id !== item.id) }));
      toast.success('Deleted');
    } catch (error) { toast.error('Failed to delete'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c587a]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 fade-in" data-testid="master-file-page">
      <div>
        <h1 className="text-sm font-bold text-slate-800" data-testid="master-file-title">Master File</h1>
        <p className="text-[10px] text-slate-400 mt-0.5">Manage banks, agents, companies, branches, and locations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {CATEGORIES.map(cat => (
          <MasterSection
            key={cat.key}
            title={cat.title}
            icon={cat.icon}
            items={data[cat.key]}
            isAdmin={isAdmin}
            onAdd={() => openAdd(cat)}
            onEdit={(item) => openEdit(cat, item)}
            onDelete={(item) => handleDelete(cat, item)}
          />
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {dialogMode === 'add' ? 'Add' : 'Edit'} {activeCategory?.title.replace(/s$/, '')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <Label className="text-[11px] text-slate-600">Name *</Label>
              <Input
                autoFocus
                required
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={activeCategory?.placeholder || ''}
                className="h-8 text-[11px] mt-0.5"
                data-testid="master-name-input"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowDialog(false)} className="h-7 text-[11px]">Cancel</Button>
              <Button type="submit" size="sm" className="h-7 text-[11px] bg-[#2c587a] hover:bg-[#234a68]" data-testid="master-save-btn">
                {dialogMode === 'add' ? 'Add' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MasterFile;
