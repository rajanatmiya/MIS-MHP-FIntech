import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Flag, AlertTriangle, ArrowRight } from 'lucide-react';

const StatusManagement = () => {
  const { user } = useContext(AuthContext);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3B82F6', order: 0 });
  const [usageCounts, setUsageCounts] = useState({});

  // Delete flow states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingStatus, setDeletingStatus] = useState(null);
  const [replacementStatus, setReplacementStatus] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStatuses();
    fetchUsageCounts();
  }, []);

  const fetchStatuses = async () => {
    try {
      const response = await axios.get(`${API}/statuses`);
      setStatuses(response.data);
    } catch (error) {
      toast.error('Failed to fetch statuses');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageCounts = async () => {
    try {
      const response = await axios.get(`${API}/statuses/usage-count`);
      setUsageCounts(response.data);
    } catch (error) {
      console.error('Failed to fetch usage counts');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStatus) {
        await axios.put(`${API}/statuses/${editingStatus.id}`, formData);
        toast.success('Status updated successfully');
      } else {
        await axios.post(`${API}/statuses`, formData);
        toast.success('Status created successfully');
      }
      setShowDialog(false);
      setEditingStatus(null);
      setFormData({ name: '', description: '', color: '#3B82F6', order: 0 });
      fetchStatuses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (status) => {
    setEditingStatus(status);
    setFormData({ 
      name: status.name, 
      description: status.description || '', 
      color: status.color || '#3B82F6',
      order: status.order || 0
    });
    setShowDialog(true);
  };

  const handleDeleteClick = (status) => {
    setDeletingStatus(status);
    setReplacementStatus('');
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStatus) return;
    setDeleting(true);
    try {
      const count = usageCounts[deletingStatus.name] || 0;
      
      // If there are loans using this status and a replacement is selected, rename first
      if (count > 0 && replacementStatus) {
        await axios.post(`${API}/statuses/rename-in-loans`, {
          old_name: deletingStatus.name,
          new_name: replacementStatus
        });
        toast.success(`Renamed ${count} loans from "${deletingStatus.name}" to "${replacementStatus}"`);
      }
      
      // Delete the status
      await axios.delete(`${API}/statuses/${deletingStatus.id}`);
      toast.success(`Status "${deletingStatus.name}" deleted`);
      
      setShowDeleteDialog(false);
      setDeletingStatus(null);
      setReplacementStatus('');
      fetchStatuses();
      fetchUsageCounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete status');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddNew = () => {
    setEditingStatus(null);
    setFormData({ name: '', description: '', color: '#3B82F6', order: 0 });
    setShowDialog(true);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-600">Only admins can manage statuses.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c587a]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-800">Status Management</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Manage loan application statuses. Deleting a status will let you reassign existing loans.</p>
        </div>
        <Button onClick={handleAddNew} className="bg-[#2c587a] hover:bg-[#234a68] text-xs h-8" size="sm" data-testid="add-status-btn">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Status
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs">All Statuses ({statuses.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {statuses.map(status => {
              const count = usageCounts[status.name] || 0;
              return (
                <div
                  key={status.id}
                  className="border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                  style={{ borderLeftWidth: '3px', borderLeftColor: status.color }}
                  data-testid={`status-card-${status.name}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5" style={{ color: status.color }} />
                      <h3 className="font-semibold text-xs text-slate-800">{status.name}</h3>
                    </div>
                    <div className="flex gap-0.5">
                      <button onClick={() => handleEdit(status)} className="p-1 hover:bg-slate-100 rounded" title="Edit status" data-testid={`edit-status-${status.name}`}>
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                      <button onClick={() => handleDeleteClick(status)} className="p-1 hover:bg-red-50 rounded" title="Delete status" data-testid={`delete-status-${status.name}`}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                  {status.description && (
                    <p className="text-[11px] text-slate-500 mb-1">{status.description}</p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span>Order: {status.order}</span>
                      <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: status.color }}></span>
                    </div>
                    {count > 0 && (
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-medium">
                        {count} loans
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {statuses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">No statuses found. Click "Add Status" to create one.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-sm">{editingStatus ? 'Edit Status' : 'Add New Status'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-[11px]">Status Name *</Label>
              <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Approved, Pending" className="h-8 text-[11px]" />
            </div>
            <div>
              <Label htmlFor="description" className="text-[11px]">Description</Label>
              <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" className="h-8 text-[11px]" />
            </div>
            <div>
              <Label htmlFor="color" className="text-[11px]">Color</Label>
              <div className="flex gap-2 items-center">
                <Input id="color" type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-16 h-8" />
                <Input value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} placeholder="#3B82F6" className="h-8 text-[11px]" />
              </div>
            </div>
            <div>
              <Label htmlFor="order" className="text-[11px]">Display Order</Label>
              <Input id="order" type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} placeholder="0" className="h-8 text-[11px] w-24" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => { setShowDialog(false); setEditingStatus(null); }}>Cancel</Button>
              <Button type="submit" size="sm" className="h-8 text-[11px] bg-[#2c587a] hover:bg-[#234a68]">{editingStatus ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog with Replacement */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md" data-testid="delete-status-dialog">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Delete Status: "{deletingStatus?.name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(usageCounts[deletingStatus?.name] || 0) > 0 ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-[11px] text-amber-800 font-medium">
                    {usageCounts[deletingStatus?.name]} loans are using this status.
                  </p>
                  <p className="text-[10px] text-amber-600 mt-1">
                    Select a replacement status to reassign these loans before deleting.
                  </p>
                </div>
                <div>
                  <Label className="text-[11px] font-medium">Replace with:</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-red-500 line-through flex-shrink-0">{deletingStatus?.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <Select value={replacementStatus} onValueChange={setReplacementStatus}>
                      <SelectTrigger className="h-8 text-[11px]" data-testid="replacement-status-select">
                        <SelectValue placeholder="Select replacement" />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.filter(s => s.name !== deletingStatus?.name).map(s => (
                          <SelectItem key={s.id} value={s.name} className="text-[11px]">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-[11px] text-slate-600">No loans are using this status. Safe to delete.</p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button
                size="sm"
                className="h-8 text-[11px] bg-red-600 hover:bg-red-700"
                onClick={handleDeleteConfirm}
                disabled={deleting || ((usageCounts[deletingStatus?.name] || 0) > 0 && !replacementStatus)}
                data-testid="confirm-delete-status-btn"
              >
                {deleting ? 'Processing...' : (usageCounts[deletingStatus?.name] || 0) > 0 ? 'Replace & Delete' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatusManagement;
