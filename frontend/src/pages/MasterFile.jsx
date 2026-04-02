import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Building2, UserCheck, Plus, Edit, Trash2, Search } from 'lucide-react';
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
        <div className="max-h-[340px] overflow-y-auto space-y-0.5">
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

const MasterFile = () => {
  const { user } = useContext(AuthContext);
  const [banks, setBanks] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [dialogMode, setDialogMode] = useState('add');
  const [editItem, setEditItem] = useState(null);
  const [inputValue, setInputValue] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [banksRes, agentsRes] = await Promise.all([
        axios.get(`${API}/master/banks`),
        axios.get(`${API}/master/agents`)
      ]);
      setBanks(banksRes.data);
      setAgents(agentsRes.data);
    } catch (error) { toast.error('Failed to fetch master data'); }
    finally { setLoading(false); }
  };

  const openAddDialog = (type) => {
    setDialogType(type);
    setDialogMode('add');
    setEditItem(null);
    setInputValue('');
    setShowDialog(true);
  };

  const openEditDialog = (type, item) => {
    setDialogType(type);
    setDialogMode('edit');
    setEditItem(item);
    setInputValue(item.name);
    setShowDialog(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const endpoint = dialogType === 'bank' ? 'banks' : 'agents';
    try {
      if (dialogMode === 'add') {
        const res = await axios.post(`${API}/master/${endpoint}`, { name: inputValue.trim() });
        if (dialogType === 'bank') setBanks([...banks, res.data]);
        else setAgents([...agents, res.data]);
        toast.success(`${dialogType === 'bank' ? 'Bank' : 'Agent'} added`);
      } else {
        await axios.put(`${API}/master/${endpoint}/${editItem.id}`, { name: inputValue.trim() });
        const updater = (list) => list.map(i => i.id === editItem.id ? { ...i, name: inputValue.trim() } : i);
        if (dialogType === 'bank') setBanks(updater(banks));
        else setAgents(updater(agents));
        toast.success(`${dialogType === 'bank' ? 'Bank' : 'Agent'} updated`);
      }
      setShowDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (type, item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    const endpoint = type === 'bank' ? 'banks' : 'agents';
    try {
      await axios.delete(`${API}/master/${endpoint}/${item.id}`);
      if (type === 'bank') setBanks(banks.filter(b => b.id !== item.id));
      else setAgents(agents.filter(a => a.id !== item.id));
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
        <p className="text-[10px] text-slate-400 mt-0.5">Manage bank names, agent names and other master data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <MasterSection
          title="Bank Names"
          icon={Building2}
          items={banks}
          isAdmin={isAdmin}
          onAdd={() => openAddDialog('bank')}
          onEdit={(item) => openEditDialog('bank', item)}
          onDelete={(item) => handleDelete('bank', item)}
        />
        <MasterSection
          title="Agent Names"
          icon={UserCheck}
          items={agents}
          isAdmin={isAdmin}
          onAdd={() => openAddDialog('agent')}
          onEdit={(item) => openEditDialog('agent', item)}
          onDelete={(item) => handleDelete('agent', item)}
        />
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {dialogMode === 'add' ? 'Add' : 'Edit'} {dialogType === 'bank' ? 'Bank Name' : 'Agent Name'}
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
                placeholder={dialogType === 'bank' ? 'e.g., State Bank of India' : 'e.g., Rajesh Kumar'}
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
