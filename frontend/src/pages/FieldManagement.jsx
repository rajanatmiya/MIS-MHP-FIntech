import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Settings, Sliders } from 'lucide-react';

const FieldManagement = () => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [formData, setFormData] = useState({ name: '', label: '', field_type: 'text', required: false, options: '', order: 0 });

  useEffect(() => { fetchFields(); }, []);

  const fetchFields = async () => {
    try {
      const response = await axios.get(`${API}/field-configs`);
      setFields(response.data);
    } catch (error) { toast.error('Failed to fetch fields'); }
    finally { setLoading(false); }
  };

  const handleOpenDialog = (field = null) => {
    if (field) {
      setEditingField(field);
      setFormData({ name: field.name, label: field.label, field_type: field.field_type, required: field.required, options: field.options ? field.options.join(', ') : '', order: field.order });
    } else {
      setEditingField(null);
      setFormData({ name: '', label: '', field_type: 'text', required: false, options: '', order: fields.length });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => { setDialogOpen(false); setEditingField(null); setFormData({ name: '', label: '', field_type: 'text', required: false, options: '', order: 0 }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.label) { toast.error('Name and label required'); return; }
    const payload = {
      name: formData.name.toLowerCase().replace(/\s+/g, '_'),
      label: formData.label,
      field_type: formData.field_type,
      required: formData.required,
      options: formData.field_type === 'dropdown' && formData.options ? formData.options.split(',').map(o => o.trim()).filter(Boolean) : null,
      order: formData.order
    };
    try {
      if (editingField) { await axios.put(`${API}/field-configs/${editingField.id}`, payload); toast.success('Field updated'); }
      else { await axios.post(`${API}/field-configs`, payload); toast.success('Field created'); }
      fetchFields(); handleCloseDialog();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save'); }
  };

  const handleDelete = async (fieldId) => {
    if (!window.confirm('Delete this field?')) return;
    try { await axios.delete(`${API}/field-configs/${fieldId}`); toast.success('Field deleted'); fetchFields(); }
    catch (error) { toast.error('Failed to delete'); }
  };

  const getTypeBadge = (type) => {
    const map = { text: 'bg-blue-50 text-blue-700', number: 'bg-emerald-50 text-emerald-700', date: 'bg-purple-50 text-purple-700', dropdown: 'bg-amber-50 text-amber-700' };
    return map[type] || 'bg-slate-50 text-slate-700';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c587a]"></div></div>;
  }

  return (
    <div className="space-y-3 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-800" data-testid="field-mgmt-title">Field Configuration</h1>
          <p className="text-[10px] text-slate-400 mt-0.5">Configure custom fields for loan applications</p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm" className="h-7 text-[11px] px-3 bg-[#2c587a] hover:bg-[#234a68]">
          <Plus className="w-3 h-3 mr-1" /> Add Field
        </Button>
      </div>

      {/* Fields */}
      {fields.length === 0 ? (
        <div className="text-center py-16">
          <Sliders className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium text-slate-500">No custom fields</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Click "Add Field" to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {fields.map((field) => (
            <div key={field.id} className="border border-slate-200 rounded-lg bg-white p-3 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-start justify-between mb-1.5">
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-800 truncate">{field.label}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{field.name}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 ml-2">
                  <button onClick={() => handleOpenDialog(field)} className="p-1 rounded hover:bg-slate-100" title="Edit">
                    <Edit2 className="w-3 h-3 text-slate-500" />
                  </button>
                  <button onClick={() => handleDelete(field.id)} className="p-1 rounded hover:bg-red-50" title="Delete">
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getTypeBadge(field.field_type)}`}>{field.field_type}</span>
                {field.required && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-50 text-red-600 border border-red-200">Required</span>}
              </div>
              {field.field_type === 'dropdown' && field.options && (
                <p className="text-[10px] text-slate-400 mt-1.5 truncate">Options: {field.options.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingField ? 'Edit Field' : 'Add Field'}</DialogTitle>
            <DialogDescription className="text-[11px]">{editingField ? 'Update configuration' : 'Create a new custom field'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div>
              <Label className="text-[11px]">Label *</Label>
              <Input placeholder="e.g., Mobile Number" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} required className="h-8 text-[11px] mt-0.5" />
            </div>
            <div>
              <Label className="text-[11px]">Name *</Label>
              <Input placeholder="e.g., mobile_number" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={!!editingField} required className="h-8 text-[11px] mt-0.5 font-mono" />
              <p className="text-[9px] text-slate-400 mt-0.5">Lowercase, underscores only</p>
            </div>
            <div>
              <Label className="text-[11px]">Type *</Label>
              <Select value={formData.field_type} onValueChange={(v) => setFormData({ ...formData, field_type: v })}>
                <SelectTrigger className="h-8 text-[11px] mt-0.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['text', 'number', 'date', 'dropdown'].map(t => <SelectItem key={t} value={t} className="text-[11px]">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {formData.field_type === 'dropdown' && (
              <div>
                <Label className="text-[11px]">Options *</Label>
                <Input placeholder="Option 1, Option 2, Option 3" value={formData.options} onChange={(e) => setFormData({ ...formData, options: e.target.value })} required className="h-8 text-[11px] mt-0.5" />
                <p className="text-[9px] text-slate-400 mt-0.5">Comma separated</p>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Switch id="required" checked={formData.required} onCheckedChange={(c) => setFormData({ ...formData, required: c })} />
              <Label htmlFor="required" className="text-[11px] cursor-pointer">Required field</Label>
            </div>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" size="sm" onClick={handleCloseDialog} className="h-7 text-[11px]">Cancel</Button>
              <Button type="submit" size="sm" className="h-7 text-[11px] bg-[#2c587a] hover:bg-[#234a68]">{editingField ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FieldManagement;
