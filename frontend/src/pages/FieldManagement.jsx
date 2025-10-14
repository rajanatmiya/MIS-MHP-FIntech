import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, GripVertical, Settings } from 'lucide-react';

const FieldManagement = () => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    field_type: 'text',
    required: false,
    options: '',
    order: 0
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const response = await axios.get(`${API}/field-configs`);
      setFields(response.data);
    } catch (error) {
      toast.error('Failed to fetch custom fields');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (field = null) => {
    if (field) {
      setEditingField(field);
      setFormData({
        name: field.name,
        label: field.label,
        field_type: field.field_type,
        required: field.required,
        options: field.options ? field.options.join(', ') : '',
        order: field.order
      });
    } else {
      setEditingField(null);
      setFormData({
        name: '',
        label: '',
        field_type: 'text',
        required: false,
        options: '',
        order: fields.length
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingField(null);
    setFormData({
      name: '',
      label: '',
      field_type: 'text',
      required: false,
      options: '',
      order: 0
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.label) {
      toast.error('Field name and label are required');
      return;
    }

    // Convert name to lowercase with underscores
    const fieldName = formData.name.toLowerCase().replace(/\s+/g, '_');

    const payload = {
      name: fieldName,
      label: formData.label,
      field_type: formData.field_type,
      required: formData.required,
      options: formData.field_type === 'dropdown' && formData.options
        ? formData.options.split(',').map(opt => opt.trim()).filter(opt => opt)
        : null,
      order: formData.order
    };

    try {
      if (editingField) {
        await axios.put(`${API}/field-configs/${editingField.id}`, payload);
        toast.success('Field updated successfully');
      } else {
        await axios.post(`${API}/field-configs`, payload);
        toast.success('Field created successfully');
      }
      fetchFields();
      handleCloseDialog();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save field');
    }
  };

  const handleDelete = async (fieldId) => {
    if (!window.confirm('Are you sure you want to delete this field? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`${API}/field-configs/${fieldId}`);
      toast.success('Field deleted successfully');
      fetchFields();
    } catch (error) {
      toast.error('Failed to delete field');
    }
  };

  const getFieldTypeIcon = (type) => {
    const icons = {
      text: '📝',
      number: '🔢',
      date: '📅',
      dropdown: '📋'
    };
    return icons[type] || '📝';
  };

  const getFieldTypeBadge = (type) => {
    const colors = {
      text: 'bg-blue-100 text-blue-700',
      number: 'bg-green-100 text-green-700',
      date: 'bg-purple-100 text-purple-700',
      dropdown: 'bg-orange-100 text-orange-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Field Management
          </h1>
          <p className="text-sm lg:text-base text-slate-600">
            Configure custom fields for loan applications
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Field
        </Button>
      </div>

      {/* Fields List */}
      {fields.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Custom Fields</h3>
            <p className="text-slate-600 text-center mb-4">
              Start by adding custom fields to loan applications
            </p>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Field
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((field) => (
            <Card key={field.id} className="card-hover">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getFieldTypeIcon(field.field_type)}</span>
                    <div>
                      <CardTitle className="text-lg">{field.label}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        {field.name}
                      </p>
                    </div>
                  </div>
                  <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={getFieldTypeBadge(field.field_type)}>
                    {field.field_type}
                  </Badge>
                  {field.required && (
                    <Badge variant="outline" className="text-red-600 border-red-300">
                      Required
                    </Badge>
                  )}
                </div>
                
                {field.field_type === 'dropdown' && field.options && (
                  <div className="bg-slate-50 p-2 rounded text-xs">
                    <p className="text-slate-600 font-medium mb-1">Options:</p>
                    <p className="text-slate-700">{field.options.join(', ')}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(field)}
                    className="flex-1"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(field.id)}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Edit Field' : 'Add New Field'}
            </DialogTitle>
            <DialogDescription>
              {editingField
                ? 'Update the field configuration'
                : 'Create a new custom field for loan applications'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Field Label *</Label>
              <Input
                id="label"
                placeholder="e.g., Mobile Number"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Field Name *</Label>
              <Input
                id="name"
                placeholder="e.g., mobile_number"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={editingField !== null}
                required
              />
              <p className="text-xs text-slate-500">
                Internal name (lowercase, underscores only). Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field_type">Field Type *</Label>
              <Select
                value={formData.field_type}
                onValueChange={(value) => setFormData({ ...formData, field_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.field_type === 'dropdown' && (
              <div className="space-y-2">
                <Label htmlFor="options">Dropdown Options *</Label>
                <Input
                  id="options"
                  placeholder="e.g., Option 1, Option 2, Option 3"
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-500">
                  Separate options with commas
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
              />
              <Label htmlFor="required" className="cursor-pointer">
                Required field
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
              >
                {editingField ? 'Update Field' : 'Create Field'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FieldManagement;
