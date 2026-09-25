import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '@/App';
import axios from 'axios';
import { API } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Lock, Shield, Download, Database, Trash2, Clock, Calendar } from 'lucide-react';

// Organization Schedule Component
const OrganizationSchedule = () => {
  const [schedule, setSchedule] = useState({
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    start_time: '09:00',
    end_time: '18:00'
  });
  const [loading, setLoading] = useState(false);

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      const response = await axios.get(`${API}/organization/schedule`);
      setSchedule(response.data);
    } catch (error) {
      console.error('Failed to fetch schedule');
    }
  };

  const handleDayToggle = (day) => {
    setSchedule(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day]
    }));
  };

  const handleSaveSchedule = async () => {
    if (schedule.working_days.length === 0) {
      toast.error('Please select at least one working day');
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API}/organization/schedule`, schedule);
      toast.success('Schedule updated successfully');
    } catch (error) {
      toast.error('Failed to update schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Calendar className="w-5 h-5" />
          Organization Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-sm font-semibold text-blue-900 mb-3 block">Working Days</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {allDays.map(day => (
              <button
                key={day}
                onClick={() => handleDayToggle(day)}
                className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                  schedule.working_days.includes(day)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Start Time
            </Label>
            <Input
              type="time"
              value={schedule.start_time}
              onChange={(e) => setSchedule({ ...schedule, start_time: e.target.value })}
              className="border-blue-300 focus:border-blue-600"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              End Time
            </Label>
            <Input
              type="time"
              value={schedule.end_time}
              onChange={(e) => setSchedule({ ...schedule, end_time: e.target.value })}
              className="border-blue-300 focus:border-blue-600"
            />
          </div>
        </div>

        <Button
          onClick={handleSaveSchedule}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? 'Saving...' : 'Save Schedule'}
        </Button>

        <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 text-sm text-blue-900">
          <p className="font-semibold mb-1">Current Schedule:</p>
          <p>{schedule.working_days.join(', ')}</p>
          <p>{schedule.start_time} - {schedule.end_time}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const Settings = () => {
  const { user } = useContext(AuthContext);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [deleteDate, setDeleteDate] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState('');
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);

  const handleBackupData = async () => {
    setBackupLoading(true);
    try {
      const response = await axios.get(`${API}/backup/full-data`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mhp_fintech_backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Backup downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDeleteByDate = async () => {
    if (!deleteDate) {
      toast.error('Please enter a date');
      return;
    }

    if (!window.confirm(`⚠️ WARNING: This will DELETE ALL entries from ${deleteDate}. This action CANNOT be undone! Are you absolutely sure?`)) {
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await axios.post(`${API}/loans/delete-by-date?date_str=${deleteDate}`);
      toast.success(response.data.message);
      setDeleteDate('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete entries');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteAllConfirm !== 'DELETE_ALL_DATA') {
      toast.error('Please type DELETE_ALL_DATA exactly to confirm');
      return;
    }

    if (!window.confirm('🚨 FINAL WARNING: You are about to DELETE ALL MIS DATA! This will remove EVERYTHING and CANNOT be undone! Are you ABSOLUTELY sure?')) {
      return;
    }

    setDeleteAllLoading(true);
    try {
      const response = await axios.post(`${API}/loans/delete-all?confirm=${deleteAllConfirm}`);
      toast.success(response.data.message);
      setDeleteAllConfirm('');
      
      // Reload page after deletion
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete all data');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        old_password: passwordForm.oldPassword,
        new_password: passwordForm.newPassword
      });
      
      toast.success('Password changed successfully!');
      setPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { text: 'Admin', class: 'bg-purple-100 text-purple-700 border-purple-200' },
      manager: { text: 'Manager', class: 'bg-blue-100 text-blue-700 border-blue-200' },
      agent: { text: 'Agent', class: 'bg-green-100 text-green-700 border-green-200' }
    };
    const badge = badges[role] || badges.agent;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="space-y-3 fade-in" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-sm font-bold text-slate-800">Settings</h1>
        <p className="text-[10px] text-slate-400 mt-0.5">Account and security settings</p>
      </div>

      {/* Profile Information */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="flex items-center gap-1.5 text-xs">
            <User className="w-3.5 h-3.5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] text-slate-400">Full Name</Label>
              <p className="text-[11px] font-medium text-slate-800">{user?.name}</p>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400">Email</Label>
              <p className="text-[11px] font-medium text-slate-800">{user?.email}</p>
            </div>
            <div>
              <Label className="text-[10px] text-slate-400">Role</Label>
              <div className="mt-0.5">{getRoleBadge(user?.role)}</div>
            </div>
            {user?.team_code && (
              <div>
                <Label className="text-[10px] text-slate-400">Team Code</Label>
                <p className="text-[11px] font-medium text-slate-800">{user.team_code}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="flex items-center gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" />
            Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-1.5">
            {user?.role === 'admin' && ['Full System Access — View and edit all data', 'User Management — Create, edit, delete accounts'].map(p => (
              <div key={p} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                <p className="text-[11px] text-slate-700">{p}</p>
              </div>
            ))}
            {user?.role === 'manager' && ['Team Access — View and edit team data', 'Team Analytics — Access team reports'].map(p => (
              <div key={p} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <p className="text-[11px] text-slate-700">{p}</p>
              </div>
            ))}
            {user?.role === 'agent' && ['Personal Access — View and edit own data', 'Personal Analytics — Access own reports'].map(p => (
              <div key={p} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <p className="text-[11px] text-slate-700">{p}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1 pt-3 px-4">
          <CardTitle className="flex items-center gap-1.5 text-xs">
            <Lock className="w-3.5 h-3.5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <form onSubmit={handlePasswordChange} className="space-y-2.5 max-w-sm">
            <div>
              <Label className="text-[11px]">Current Password *</Label>
              <Input type="password" value={passwordForm.oldPassword} onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})} required placeholder="Current password" className="h-8 text-[11px] mt-0.5" data-testid="old-password-input" />
            </div>
            <div>
              <Label className="text-[11px]">New Password *</Label>
              <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} required placeholder="Min 6 characters" className="h-8 text-[11px] mt-0.5" data-testid="new-password-input" />
            </div>
            <div>
              <Label className="text-[11px]">Confirm Password *</Label>
              <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required placeholder="Re-enter password" className="h-8 text-[11px] mt-0.5" data-testid="confirm-password-input" />
            </div>
            <Button type="submit" disabled={loading} size="sm" className="h-7 text-[11px] bg-[#2c587a] hover:bg-[#234a68]" data-testid="change-password-button">
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>



      {/* Organization Schedule - Admin Only */}
      {user?.role === 'admin' && <OrganizationSchedule />}

      {/* Data Backup - Admin Only */}
      {user?.role === 'admin' && (
        <>
          <Card className="shadow-sm border-emerald-200 bg-emerald-50/50">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="flex items-center gap-1.5 text-xs text-emerald-800">
                <Database className="w-3.5 h-3.5" />
                Data Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-[10px] text-slate-600 mb-2">Download all loans, users, and field configs as Excel.</p>
              <Button onClick={handleBackupData} disabled={backupLoading} size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-3 h-3 mr-1" />
                {backupLoading ? 'Downloading...' : 'Download Backup'}
              </Button>
            </CardContent>
          </Card>


          <Card className="shadow-sm border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="flex items-center gap-1.5 text-xs text-blue-800">
                <Calendar className="w-3.5 h-3.5" />
                Normalize Months
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-[10px] text-slate-600 mb-2">Standardize month formats: "November" → "Nov-25", "NOV-2025" → "Nov-25"</p>
              <Button
                onClick={async () => {
                  if (!window.confirm('Normalize all month formats?')) return;
                  try {
                    const response = await axios.post(`${API}/loans/normalize-months`);
                    toast.success(`Normalized ${response.data.updated_count} entries!`);
                  } catch (error) { toast.error('Failed to normalize'); }
                }}
                size="sm" className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700"
              >
                <Calendar className="w-3 h-3 mr-1" /> Normalize
              </Button>
            </CardContent>
          </Card>


          {/* Delete by Date */}
          <Card className="shadow-sm border-red-200 bg-red-50/50">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="flex items-center gap-1.5 text-xs text-red-800">
                <Trash2 className="w-3.5 h-3.5" />
                Delete by Date
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-[10px] text-red-700 font-medium mb-2">Permanently delete all entries created on a specific date.</p>
              <div className="flex gap-1.5">
                <Input value={deleteDate} onChange={(e) => setDeleteDate(e.target.value)} placeholder="DD-MM-YYYY" className="h-8 text-[11px] flex-1" />
                <Button onClick={handleDeleteByDate} disabled={deleteLoading || !deleteDate} variant="destructive" size="sm" className="h-8 text-[11px]">
                  <Trash2 className="w-3 h-3 mr-1" /> {deleteLoading ? '...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Delete ALL */}
          <Card className="shadow-sm border-red-400 bg-red-100/50">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="flex items-center gap-1.5 text-xs text-red-900">
                <Trash2 className="w-3.5 h-3.5" />
                Delete ALL MIS Data
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-[10px] text-red-700 font-semibold mb-2">This will permanently delete ALL loan entries. Cannot be undone.</p>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-red-800">Type <code className="bg-red-200 px-1 py-0.5 rounded text-[10px] font-mono">DELETE_ALL_DATA</code> to confirm:</Label>
                  <Input value={deleteAllConfirm} onChange={(e) => setDeleteAllConfirm(e.target.value)} placeholder="DELETE_ALL_DATA" className="h-8 text-[11px] mt-0.5 border-red-300 font-mono" />
                </div>
                <Button onClick={handleDeleteAllData} disabled={deleteAllLoading || deleteAllConfirm !== 'DELETE_ALL_DATA'} variant="destructive" size="sm" className="h-8 text-[11px] w-full">
                  <Trash2 className="w-3 h-3 mr-1" /> {deleteAllLoading ? 'Deleting...' : 'Delete ALL Data'}
                </Button>
                <p className="text-[9px] text-red-600 text-center">Download backup first!</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Settings;
