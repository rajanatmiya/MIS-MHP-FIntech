import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Flag } from 'lucide-react';

const StatusManagement = () => {
  const { user } = useContext(AuthContext);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#3B82F6', order: 0 });

  useEffect(() => {
    fetchStatuses();
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

  const handleDelete = async (statusId) => {
    if (!window.confirm('Are you sure you want to delete this status?')) return;
    
    try {
      await axios.delete(`${API}/statuses/${statusId}`);
      toast.success('Status deleted successfully');
      fetchStatuses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete status');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Status Management</h1>
          <p className="text-slate-600 mt-1">Manage loan application statuses</p>
        </div>
        <Button
          onClick={handleAddNew}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Status
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Statuses ({statuses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statuses.map(status => (
              <div
                key={status.id}
                className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                style={{ borderLeftWidth: '4px', borderLeftColor: status.color }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Flag className="w-5 h-5" style={{ color: status.color }} />
                    <h3 className="font-semibold text-slate-800">{status.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(status)}
                      className="p-1.5 hover:bg-slate-100 rounded"
                      title="Edit status"
                    >
                      <Edit2 className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(status.id)}
                      className="p-1.5 hover:bg-red-50 rounded"
                      title="Delete status"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                {status.description && (
                  <p className="text-sm text-slate-600 mb-2">{status.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Order: {status.order}</span>
                  <span className="w-6 h-6 rounded" style={{ backgroundColor: status.color }}></span>
                </div>
              </div>
            ))}
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
            <DialogTitle>{editingStatus ? 'Edit Status' : 'Add New Status'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Status Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Approved, Pending"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div>
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setEditingStatus(null);
                  setFormData({ name: '', description: '', color: '#3B82F6', order: 0 });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingStatus ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatusManagement;
