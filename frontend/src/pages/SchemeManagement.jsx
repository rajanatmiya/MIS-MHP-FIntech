import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, FileText } from 'lucide-react';

const SchemeManagement = () => {
  const { user } = useContext(AuthContext);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    try {
      const response = await axios.get(`${API}/schemes`);
      setSchemes(response.data);
    } catch (error) {
      toast.error('Failed to fetch schemes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingScheme) {
        await axios.put(`${API}/schemes/${editingScheme.id}`, formData);
        toast.success('Scheme updated successfully');
      } else {
        await axios.post(`${API}/schemes`, formData);
        toast.success('Scheme created successfully');
      }
      
      setShowDialog(false);
      setEditingScheme(null);
      setFormData({ name: '', description: '' });
      fetchSchemes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (scheme) => {
    setEditingScheme(scheme);
    setFormData({ name: scheme.name, description: scheme.description || '' });
    setShowDialog(true);
  };

  const handleDelete = async (schemeId) => {
    if (!window.confirm('Are you sure you want to delete this scheme?')) return;
    
    try {
      await axios.delete(`${API}/schemes/${schemeId}`);
      toast.success('Scheme deleted successfully');
      fetchSchemes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete scheme');
    }
  };

  const handleAddNew = () => {
    setEditingScheme(null);
    setFormData({ name: '', description: '' });
    setShowDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Scheme Management</h1>
          <p className="text-slate-600 mt-1">
            {canEdit ? 'Manage loan schemes available in the system' : 'View available loan schemes'}
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Scheme
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Schemes ({schemes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schemes.map(scheme => (
              <div
                key={scheme.id}
                className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-800">{scheme.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(scheme)}
                      className="p-1.5 hover:bg-slate-100 rounded"
                      title="Edit scheme"
                    >
                      <Edit2 className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(scheme.id)}
                      className="p-1.5 hover:bg-red-50 rounded"
                      title="Delete scheme"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                {scheme.description && (
                  <p className="text-sm text-slate-600">{scheme.description}</p>
                )}
              </div>
            ))}
          </div>

          {schemes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">No schemes found. Click "Add Scheme" to create one.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingScheme ? 'Edit Scheme' : 'Add New Scheme'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Scheme Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., GST, Car Loan"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the scheme"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setEditingScheme(null);
                  setFormData({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingScheme ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchemeManagement;
