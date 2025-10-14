import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Edit, Trash2, Plus, Shield, Key } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    team_code: '',
    manager_id: undefined
  });
  const { user: currentUser } = useContext(AuthContext);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        const updateData = {
          name: formData.name,
          role: formData.role,
          team_code: formData.team_code || null,
          manager_id: formData.manager_id || null
        };
        await axios.put(`${API}/users/${editingUser.id}`, updateData);
        toast.success('User updated successfully');
      } else {
        const createData = {
          ...formData,
          team_code: formData.team_code || null,
          manager_id: formData.manager_id || null
        };
        await axios.post(`${API}/auth/register`, createData);
        toast.success('User created successfully');
      }
      
      setShowForm(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await axios.post(`${API}/users/${resetPasswordUser.id}/reset-password`, {
        new_password: newPassword
      });
      toast.success(`Password reset successfully for ${resetPasswordUser.name}`);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      team_code: user.team_code || '',
      manager_id: user.manager_id || undefined
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'agent',
      team_code: '',
      manager_id: undefined
    });
  };

  const getRoleBadgeClass = (role) => {
    const roleMap = {
      'admin': 'bg-purple-100 text-purple-800',
      'manager': 'bg-blue-100 text-blue-800',
      'agent': 'bg-green-100 text-green-800'
    };
    return `px-2.5 py-0.5 rounded-full text-xs font-medium ${roleMap[role] || 'bg-gray-100 text-gray-800'}`;
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 mx-auto text-slate-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Admin Access Required</h2>
        <p className="text-slate-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const managers = users.filter(u => u.role === 'manager');

  return (
    <div className="space-y-6 fade-in" data-testid="user-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            User Management
          </h1>
          <p className="text-sm lg:text-base text-slate-600">Manage users, roles, and permissions</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingUser(null);
                resetForm();
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
              data-testid="add-user-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="user-name-input"
                />
              </div>

              {!editingUser && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      data-testid="user-email-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                      data-testid="user-password-input"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger data-testid="user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Full Access</SelectItem>
                    <SelectItem value="manager">Manager - Team Access</SelectItem>
                    <SelectItem value="agent">Agent - Personal Access</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.role === 'manager' || formData.role === 'agent') && (
                <div className="space-y-2">
                  <Label htmlFor="team_code">Team Code</Label>
                  <Input
                    id="team_code"
                    value={formData.team_code}
                    onChange={(e) => setFormData({...formData, team_code: e.target.value})}
                    placeholder="e.g., TEAM-A, TEAM-B"
                    data-testid="user-team-code-input"
                  />
                </div>
              )}

              {formData.role === 'agent' && managers.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="manager">Assign Manager</Label>
                  <Select value={formData.manager_id || undefined} onValueChange={(value) => setFormData({...formData, manager_id: value})}>
                    <SelectTrigger data-testid="user-manager-select">
                      <SelectValue placeholder="Select manager (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map(manager => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name} ({manager.team_code || 'No team'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500">
                  {loading ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Team</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{user.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{user.team_code || '-'}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} title="Edit User">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setResetPasswordUser(user)}
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4 text-green-600" />
                      </Button>
                      {user.id !== currentUser.id && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} title="Delete User">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {users.map(user => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-800">{user.name}</h3>
                        <p className="text-sm text-slate-600">{user.email}</p>
                      </div>
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role.toUpperCase()}
                      </span>
                    </div>
                    
                    {user.team_code && (
                      <div className="text-sm">
                        <span className="text-slate-500">Team:</span>
                        <span className="ml-2 font-medium text-slate-800">{user.team_code}</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(user)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-green-600" 
                        onClick={() => setResetPasswordUser(user)}
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Reset
                      </Button>
                      {user.id !== currentUser.id && (
                        <Button variant="outline" size="sm" className="flex-1 text-red-600" onClick={() => handleDelete(user.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Info */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">Admin</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• View all MIS data</li>
                <li>• Edit all loan applications</li>
                <li>• Manage users & permissions</li>
                <li>• Full system access</li>
              </ul>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Manager</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• View team's data</li>
                <li>• Edit team applications</li>
                <li>• View team analytics</li>
                <li>• Team-level access</li>
              </ul>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2">Agent</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• View own data only</li>
                <li>• Edit own applications</li>
                <li>• Personal analytics</li>
                <li>• Individual access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => {
        if (!open) {
          setResetPasswordUser(null);
          setNewPassword('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password for {resetPasswordUser?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password *</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                required
                minLength={6}
              />
              <p className="text-xs text-slate-500">
                User: {resetPasswordUser?.email}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setResetPasswordUser(null);
                  setNewPassword('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600"
              >
                Reset Password
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;