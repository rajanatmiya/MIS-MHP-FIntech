import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Users, Edit, Trash2, Plus, Shield, Key, Power, X } from 'lucide-react';

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
    manager_id: undefined,
    assigned_banks: []
  });
  const [masterBanks, setMasterBanks] = useState([]);
  const { user: currentUser } = useContext(AuthContext);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
      fetchMasterBanks();
    }
  }, [currentUser]);

  const fetchMasterBanks = async () => {
    try {
      const res = await axios.get(`${API}/master/banks`);
      setMasterBanks(res.data);
    } catch (error) { console.error('Failed to fetch banks'); }
  };

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
          manager_id: formData.manager_id || null,
          assigned_banks: formData.assigned_banks || []
        };
        await axios.put(`${API}/users/${editingUser.id}`, updateData);
        toast.success('User updated successfully');
      } else {
        const createData = {
          ...formData,
          team_code: formData.team_code || null,
          manager_id: formData.manager_id || null,
          assigned_banks: formData.assigned_banks || []
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


  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const response = await axios.patch(`${API}/users/${userId}/toggle-status`);
      toast.success(response.data.message);
      fetchUsers(); // Refresh the list
    } catch (error) {
      toast.error('Failed to toggle user status');
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
      manager_id: user.manager_id || undefined,
      assigned_banks: user.assigned_banks || []
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
      manager_id: undefined,
      assigned_banks: []
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
        <h2 className="text-sm font-bold text-slate-800 mb-1">Admin Access Required</h2>
        <p className="text-xs text-slate-500">You don't have permission to access this page.</p>
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
    <div className="space-y-3 fade-in" data-testid="user-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-slate-800">User Management</h1>
          <p className="text-[10px] text-slate-400 mt-0.5">Manage users, roles, and permissions</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingUser(null); resetForm(); }} size="sm" className="h-7 text-[11px] px-3 bg-[#2c587a] hover:bg-[#234a68]" data-testid="add-user-button">
              <Plus className="w-3 h-3 mr-1" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div>
                <Label className="text-[11px]">Full Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="h-8 text-[11px] mt-0.5" data-testid="user-name-input" />
              </div>
              {!editingUser && (
                <>
                  <div>
                    <Label className="text-[11px]">Email *</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="h-8 text-[11px] mt-0.5" data-testid="user-email-input" />
                  </div>
                  <div>
                    <Label className="text-[11px]">Password *</Label>
                    <Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required className="h-8 text-[11px] mt-0.5" data-testid="user-password-input" />
                  </div>
                </>
              )}
              <div>
                <Label className="text-[11px]">Role *</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                  <SelectTrigger className="h-8 text-[11px] mt-0.5" data-testid="user-role-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin" className="text-[11px]">Admin</SelectItem>
                    <SelectItem value="manager" className="text-[11px]">Manager</SelectItem>
                    <SelectItem value="agent" className="text-[11px]">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(formData.role === 'manager' || formData.role === 'agent') && (
                <div>
                  <Label className="text-[11px]">Team Code</Label>
                  <Input value={formData.team_code} onChange={(e) => setFormData({...formData, team_code: e.target.value})} placeholder="e.g., TEAM-A" className="h-8 text-[11px] mt-0.5" data-testid="user-team-code-input" />
                </div>
              )}
              {formData.role === 'agent' && managers.length > 0 && (
                <div>
                  <Label className="text-[11px]">Assign Manager</Label>
                  <Select value={formData.manager_id || undefined} onValueChange={(v) => setFormData({...formData, manager_id: v})}>
                    <SelectTrigger className="h-8 text-[11px] mt-0.5" data-testid="user-manager-select"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      {managers.map(m => <SelectItem key={m.id} value={m.id} className="text-[11px]">{m.name} ({m.team_code || 'No team'})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(formData.role === 'agent' || formData.role === 'manager') && masterBanks.length > 0 && (
                <div>
                  <Label className="text-[11px]">Assigned Banks</Label>
                  <p className="text-[10px] text-slate-400 mb-1">User will only see MIS data for selected banks</p>
                  <div className="border border-slate-200 rounded-md p-2 max-h-[140px] overflow-y-auto space-y-1" data-testid="assigned-banks-container">
                    {masterBanks.map(bank => {
                      const selected = (formData.assigned_banks || []).includes(bank.name);
                      return (
                        <label key={bank.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-blue-50/40 transition-colors ${selected ? 'bg-blue-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              const banks = formData.assigned_banks || [];
                              const updated = selected ? banks.filter(b => b !== bank.name) : [...banks, bank.name];
                              setFormData({...formData, assigned_banks: updated});
                            }}
                            className="w-3 h-3 rounded border-slate-300 text-[#2c587a] focus:ring-[#2c587a]"
                            data-testid={`bank-checkbox-${bank.id}`}
                          />
                          <span className="text-[11px] text-slate-700">{bank.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {(formData.assigned_banks || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {formData.assigned_banks.map(b => (
                        <span key={b} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#2c587a]/10 text-[10px] text-[#2c587a] font-medium">
                          {b}
                          <button type="button" onClick={() => setFormData({...formData, assigned_banks: formData.assigned_banks.filter(x => x !== b)})} className="hover:text-red-500">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {(formData.assigned_banks || []).length === 0 && (
                    <p className="text-[10px] text-amber-500 mt-1">No banks selected — user will see all banks</p>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1 h-7 text-[11px]">Cancel</Button>
                <Button type="submit" disabled={loading} size="sm" className="flex-1 h-7 text-[11px] bg-[#2c587a] hover:bg-[#234a68]">{loading ? '...' : editingUser ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users Table */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">All Users ({users.length})</p>
        </div>
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 bg-[#2c587a]/5">
                {['Name', 'Email', 'Role', 'Team', 'Assigned Banks', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${!u.active ? 'opacity-40' : ''}`}>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{u.name}</td>
                  <td className="px-3 py-1.5 text-slate-500">{u.email}</td>
                  <td className="px-3 py-1.5">
                    <span className={getRoleBadgeClass(u.role)}>{u.role}</span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-500">{u.team_code || '—'}</td>
                  <td className="px-3 py-1.5">
                    {u.assigned_banks && u.assigned_banks.length > 0 ? (
                      <div className="flex flex-wrap gap-0.5">
                        {u.assigned_banks.map(b => (
                          <span key={b} className="px-1.5 py-0.5 rounded-full bg-[#2c587a]/10 text-[9px] text-[#2c587a] font-medium">{b}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">All</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Switch checked={u.active !== false} onCheckedChange={() => handleToggleStatus(u.id, u.active)} disabled={u.id === currentUser.id} className="scale-75" />
                      <span className={`text-[10px] font-medium ${u.active !== false ? 'text-emerald-600' : 'text-red-500'}`}>{u.active !== false ? 'Active' : 'Off'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button onClick={() => handleEdit(u)} className="p-1 rounded hover:bg-blue-50" title="Edit"><Edit className="w-3.5 h-3.5 text-[#2c587a]" /></button>
                      <button onClick={() => setResetPasswordUser(u)} className="p-1 rounded hover:bg-emerald-50" title="Reset Password"><Key className="w-3.5 h-3.5 text-emerald-600" /></button>
                      {u.id !== currentUser.id && <button onClick={() => handleDelete(u.id)} className="p-1 rounded hover:bg-red-50" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile */}
        <div className="md:hidden divide-y divide-slate-100">
          {users.map(u => (
            <div key={u.id} className={`p-3 ${!u.active ? 'opacity-40' : ''}`}>
              <div className="flex items-start justify-between mb-1.5">
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-slate-800 truncate">{u.name}</h3>
                  <p className="text-[10px] text-slate-500">{u.email}</p>
                </div>
                <span className={getRoleBadgeClass(u.role)}>{u.role}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => handleEdit(u)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-slate-200 text-[10px] font-medium text-[#2c587a] hover:bg-slate-50"><Edit className="w-3 h-3" /> Edit</button>
                <button onClick={() => setResetPasswordUser(u)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-slate-200 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50"><Key className="w-3 h-3" /> Reset</button>
                {u.id !== currentUser.id && <button onClick={() => handleDelete(u.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-red-200 text-[10px] font-medium text-red-500 hover:bg-red-50"><Trash2 className="w-3 h-3" /> Delete</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {[
          { role: 'Admin', color: 'purple', items: ['View all MIS data', 'Manage users', 'Full system access'] },
          { role: 'Manager', color: 'blue', items: ['View team data', 'Edit team apps', 'Team analytics'] },
          { role: 'Agent', color: 'green', items: ['View own data', 'Edit own apps', 'Personal analytics'] },
        ].map(r => (
          <div key={r.role} className={`p-3 bg-${r.color}-50 rounded-lg border border-${r.color}-200`}>
            <h3 className={`text-xs font-semibold text-${r.color}-900 mb-1.5`}>{r.role}</h3>
            <ul className={`text-[10px] text-${r.color}-800 space-y-0.5`}>
              {r.items.map(i => <li key={i}>• {i}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => { if (!open) { setResetPasswordUser(null); setNewPassword(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Reset Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-2.5">
            <div>
              <Label className="text-[11px]">New Password *</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} className="h-8 text-[11px] mt-0.5" />
              <p className="text-[10px] text-slate-400 mt-0.5">User: {resetPasswordUser?.email}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setResetPasswordUser(null); setNewPassword(''); }} className="flex-1 h-7 text-[11px]">Cancel</Button>
              <Button type="submit" size="sm" className="flex-1 h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700">Reset</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;