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
    <div className="space-y-4 fade-in" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-sm font-bold text-slate-800 mb-0.5">
          Account Settings
        </h1>
        <p className="text-[11px] text-slate-500">Manage your account and security settings</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600 text-sm">Full Name</Label>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">{user?.name}</p>
              </div>
              <div>
                <Label className="text-slate-600 text-[11px]">Email Address</Label>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">{user?.email}</p>
              </div>
              <div>
                <Label className="text-slate-600 text-sm">Role</Label>
                <div className="mt-1">
                  {getRoleBadge(user?.role)}
                </div>
              </div>
              {user?.team_code && (
                <div>
                  <Label className="text-slate-600 text-sm">Team Code</Label>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{user.team_code}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Your Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {user?.role === 'admin' && (
              <>
                <div className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-purple-600"></div>
                  <div>
                    <p className="font-medium text-slate-800">Full System Access</p>
                    <p className="text-sm text-slate-600">View and edit all loan applications and manage users</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-purple-600"></div>
                  <div>
                    <p className="font-medium text-slate-800">User Management</p>
                    <p className="text-sm text-slate-600">Create, edit, and delete user accounts</p>
                  </div>
                </div>
              </>
            )}
            {user?.role === 'manager' && (
              <>
                <div className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-blue-600"></div>
                  <div>
                    <p className="font-medium text-slate-800">Team Access</p>
                    <p className="text-sm text-slate-600">View and edit your team members' loan applications</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-blue-600"></div>
                  <div>
                    <p className="font-medium text-slate-800">Team Analytics</p>
                    <p className="text-sm text-slate-600">Access analytics and reports for your team</p>
                  </div>
                </div>
              </>
            )}
            {user?.role === 'agent' && (
              <>
                <div className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-green-600"></div>
                  <div>
                    <p className="font-medium text-slate-800">Personal Access</p>
                    <p className="text-sm text-slate-600">View and edit your own loan applications</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 w-2 h-2 rounded-full bg-green-600"></div>
                  <div>
                    <p className="font-medium text-slate-800">Personal Analytics</p>
                    <p className="text-sm text-slate-600">Access your personal performance analytics</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Current Password *</Label>
              <Input
                id="oldPassword"
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                required
                placeholder="Enter your current password"
                data-testid="old-password-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password *</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                required
                placeholder="Enter new password (min 6 characters)"
                data-testid="new-password-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                required
                placeholder="Re-enter new password"
                data-testid="confirm-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
              data-testid="change-password-button"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>



      {/* Organization Schedule - Admin Only */}
      {user?.role === 'admin' && <OrganizationSchedule />}

      {/* Data Backup - Admin Only */}
      {user?.role === 'admin' && (
        <>
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Database className="w-5 h-5" />
                Data Backup & Export
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-slate-700">
                  <p className="mb-2">Download a complete backup of all your data including:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>All loan applications</li>
                    <li>User accounts (without passwords)</li>
                    <li>Custom field configurations</li>
                  </ul>
                </div>
                
                <Button
                  onClick={handleBackupData}
                  disabled={backupLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {backupLoading ? 'Downloading...' : 'Download Full Backup'}
                </Button>

                <p className="text-xs text-slate-500">
                  💡 Backup files are in Excel format (.xlsx) and include all data up to the current moment.
                </p>
              </div>
            </CardContent>
          </Card>


          {/* Normalize Months - Admin Only */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Calendar className="w-5 h-5" />
                Normalize Month Formats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-slate-700">
                  <p className="mb-2">Standardize all month formats to a consistent format (Mon-YY):</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>"November" → "Nov-25"</li>
                    <li>"NOV-2025" → "Nov-25"</li>
                    <li>"Nov 25" → "Nov-25"</li>
                  </ul>
                  <p className="mt-2 font-semibold">This will merge duplicate month groups in MIS board.</p>
                </div>
                
                <Button
                  onClick={async () => {
                    if (!window.confirm('Normalize all month formats? This will update all loan entries.')) return;
                    try {
                      const response = await axios.post(`${API}/loans/normalize-months`);
                      toast.success(`Normalized ${response.data.updated_count} entries!`);
                    } catch (error) {
                      toast.error('Failed to normalize months');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Normalize Month Formats
                </Button>

                <p className="text-xs text-slate-500">
                  💡 This will standardize all existing month values to "Mon-YY" format (e.g., Nov-25, Dec-25).
                </p>
              </div>
            </CardContent>
          </Card>


          {/* Delete by Date - Admin Only */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <Trash2 className="w-5 h-5" />
                Delete Entries by Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                  <p className="text-sm text-red-900 font-semibold mb-1">⚠️ DANGER ZONE</p>
                  <p className="text-xs text-red-800">
                    This will permanently delete ALL loan entries created on the specified date. This action CANNOT be undone!
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deleteDate">Enter Date to Delete (e.g., 16-10-2025)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="deleteDate"
                      type="text"
                      value={deleteDate}
                      onChange={(e) => setDeleteDate(e.target.value)}
                      placeholder="DD-MM-YYYY or YYYY-MM-DD"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleDeleteByDate}
                      disabled={deleteLoading || !deleteDate}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleteLoading ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-slate-600">
                  💡 Common use: Delete duplicate imports or wrongly imported entries. Example: "16-10-2025" will delete all entries from October 16, 2025.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delete ALL Data - Admin Only */}
          <Card className="border-red-600 bg-red-100">
            <CardHeader className="bg-red-200 border-b-2 border-red-600">
              <CardTitle className="flex items-center gap-2 text-red-900">
                <Trash2 className="w-6 h-6" />
                🚨 DELETE ALL MIS DATA - NUCLEAR OPTION 🚨
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="bg-red-200 border-2 border-red-600 rounded-lg p-4">
                  <p className="text-base text-red-900 font-bold mb-2">⛔ EXTREME DANGER ZONE ⛔</p>
                  <p className="text-sm text-red-900 font-semibold mb-2">
                    This will PERMANENTLY DELETE ALL YOUR MIS DATA!
                  </p>
                  <ul className="text-xs text-red-800 space-y-1 ml-4 list-disc">
                    <li>All loan entries (all months, all dates)</li>
                    <li>All imported data</li>
                    <li>All manually entered data</li>
                    <li>This action CANNOT be undone!</li>
                    <li>Database will be completely empty!</li>
                  </ul>
                </div>

                <div className="bg-yellow-100 border border-yellow-500 rounded-lg p-3">
                  <p className="text-sm text-yellow-900 font-semibold">💡 USE THIS TO:</p>
                  <p className="text-xs text-yellow-800">
                    Clean database before fresh import • Remove all duplicate/wrong data • Start completely fresh
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="deleteAllConfirm" className="text-red-900 font-semibold">
                    Type <span className="bg-red-600 text-white px-2 py-1 rounded font-mono">DELETE_ALL_DATA</span> to confirm:
                  </Label>
                  <Input
                    id="deleteAllConfirm"
                    type="text"
                    value={deleteAllConfirm}
                    onChange={(e) => setDeleteAllConfirm(e.target.value)}
                    placeholder="Type: DELETE_ALL_DATA"
                    className="border-2 border-red-600 font-mono"
                  />
                  
                  <Button
                    onClick={handleDeleteAllData}
                    disabled={deleteAllLoading || deleteAllConfirm !== 'DELETE_ALL_DATA'}
                    variant="destructive"
                    className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    {deleteAllLoading ? 'DELETING ALL DATA...' : '🚨 DELETE ALL MIS DATA 🚨'}
                  </Button>
                </div>

                <p className="text-xs text-red-700 font-semibold text-center">
                  ⚠️ DOWNLOAD BACKUP BEFORE USING THIS! ⚠️
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Settings;
