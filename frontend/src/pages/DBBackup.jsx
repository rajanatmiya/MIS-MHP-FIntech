import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { API, AuthContext } from '@/App';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, HardDrive, Users, FileText, Tag, Flag, Building2, UserCheck, Upload, AlertTriangle, CheckCircle2, RefreshCw, ArchiveRestore, Trash2, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const StatRow = ({ icon: Icon, label, count, color }) => (
  <div className="flex items-center justify-between py-1.5 px-2.5 rounded hover:bg-slate-50/60 transition-colors">
    <div className="flex items-center gap-2">
      <div className={`w-6 h-6 rounded flex items-center justify-center ${color}`}>
        <Icon className="w-3 h-3" />
      </div>
      <span className="text-[11px] text-slate-600">{label}</span>
    </div>
    <span className="text-[11px] font-bold text-slate-800">{count.toLocaleString()}</span>
  </div>
);

const DBBackup = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importMode, setImportMode] = useState('merge');
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);
  const [archivedMonths, setArchivedMonths] = useState([]);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => { fetchStats(); fetchArchivedMonths(); }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/backup/stats`);
      setStats(res.data);
    } catch (error) { toast.error('Failed to fetch database stats'); }
    finally { setLoading(false); }
  };

  const fetchArchivedMonths = async () => {
    try {
      const res = await axios.get(`${API}/backup/archived-months`);
      setArchivedMonths(res.data);
    } catch (error) { /* silently fail if no archives */ }
  };

  const handleRestoreMonth = async (archiveId, monthKey) => {
    if (!window.confirm(`Restore all loans from "${monthKey}" back to MIS?`)) return;
    setRestoringId(archiveId);
    try {
      const res = await axios.post(`${API}/backup/restore-month/${archiveId}`);
      toast.success(res.data.message);
      fetchArchivedMonths();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Restore failed');
    } finally { setRestoringId(null); }
  };

  const handleDeleteArchive = async (archiveId, monthKey) => {
    if (!window.confirm(`Permanently delete "${monthKey}" backup?\n\nThis cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/backup/archived-month/${archiveId}`);
      toast.success('Archive permanently deleted');
      fetchArchivedMonths();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Delete failed');
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await axios.get(`${API}/backup/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mhp_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully');
    } catch (error) { toast.error('Failed to download backup'); }
    finally { setDownloading(false); }
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const response = await axios.get(`${API}/backup/full-data`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mhp_backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel backup downloaded successfully');
    } catch (error) { toast.error('Failed to download Excel backup'); }
    finally { setDownloadingExcel(false); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a .json backup file');
      return;
    }
    setImportFile(file);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const preview = {};
        const collections = ["users", "loan_applications", "schemes", "statuses", "master_banks", "master_agents", "master_companies", "master_branches", "master_locations", "master_categories", "master_products", "agent_targets"];
        let total = 0;
        collections.forEach(col => {
          if (data[col] && Array.isArray(data[col])) {
            preview[col] = data[col].length;
            total += data[col].length;
          }
        });
        preview._total = total;
        preview._metadata = data.metadata || null;
        setImportPreview(preview);
        setShowImportDialog(true);
      } catch { toast.error('Invalid JSON file — could not parse'); }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('mode', importMode);
      const res = await axios.post(`${API}/backup/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(res.data);
      toast.success(res.data.message);
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally { setImporting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c587a]"></div>
      </div>
    );
  }

  const collectionIcons = [
    { key: 'users', label: 'Users', icon: Users, color: 'bg-blue-50 text-[#2c587a]' },
    { key: 'loan_applications', label: 'Loan Applications', icon: FileText, color: 'bg-emerald-50 text-emerald-600' },
    { key: 'schemes', label: 'Schemes', icon: Tag, color: 'bg-violet-50 text-violet-600' },
    { key: 'statuses', label: 'Statuses', icon: Flag, color: 'bg-amber-50 text-amber-600' },
    { key: 'master_banks', label: 'Master Banks', icon: Building2, color: 'bg-cyan-50 text-cyan-600' },
    { key: 'master_agents', label: 'Master Agents', icon: UserCheck, color: 'bg-pink-50 text-pink-600' },
    { key: 'master_companies', label: 'Master Companies', icon: Building2, color: 'bg-indigo-50 text-indigo-600' },
    { key: 'master_branches', label: 'Master Branches', icon: Building2, color: 'bg-teal-50 text-teal-600' },
    { key: 'master_locations', label: 'Master Locations', icon: Building2, color: 'bg-orange-50 text-orange-600' },
    { key: 'master_categories', label: 'Master Categories', icon: Tag, color: 'bg-lime-50 text-lime-600' },
    { key: 'master_products', label: 'Master Products', icon: Tag, color: 'bg-rose-50 text-rose-600' },
    { key: 'agent_targets', label: 'Agent Targets', icon: Flag, color: 'bg-purple-50 text-purple-600' },
  ];

  const previewLabels = {
    users: 'Users', loan_applications: 'Loans', schemes: 'Schemes', statuses: 'Statuses',
    master_banks: 'Banks', master_agents: 'Agents', master_companies: 'Companies',
    master_branches: 'Branches', master_locations: 'Locations', master_categories: 'Categories',
    master_products: 'Products', agent_targets: 'Targets'
  };

  return (
    <div className="space-y-3 fade-in" data-testid="db-backup-page">
      <div>
        <h1 className="text-sm font-bold text-slate-800" data-testid="db-backup-title">Database Backup & Restore</h1>
        <p className="text-[10px] text-slate-400 mt-0.5">Export your data or import a backup file</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Export Card */}
        <Card className="shadow-sm" data-testid="backup-download-card">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#2c587a]/10 flex items-center justify-center mx-auto mb-3">
              <Download className="w-6 h-6 text-[#2c587a]" />
            </div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Export Database</p>
            <p className="text-[10px] text-slate-400 mb-3">
              Export as JSON backup or Excel with proper columns
            </p>
            <div className="bg-slate-50 rounded-lg px-3 py-2 mb-3">
              <p className="text-[10px] text-slate-500">Total Records</p>
              <p className="text-lg font-bold text-[#2c587a]" data-testid="total-records">{stats?.total_records?.toLocaleString() || 0}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownloadExcel} disabled={downloadingExcel}
                className="flex-1 h-8 text-[11px] bg-emerald-600 hover:bg-emerald-700" data-testid="download-excel-btn">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
                {downloadingExcel ? 'Preparing...' : 'Excel'}
              </Button>
              <Button onClick={handleDownload} disabled={downloading}
                className="flex-1 h-8 text-[11px] bg-[#2c587a] hover:bg-[#234a68]" data-testid="download-backup-btn">
                <Download className="w-3.5 h-3.5 mr-1" />
                {downloading ? 'Preparing...' : 'JSON'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card className="shadow-sm" data-testid="backup-import-card">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Import Database</p>
            <p className="text-[10px] text-slate-400 mb-3">
              Restore data from a previously exported JSON backup file
            </p>
            <div className="bg-emerald-50/50 rounded-lg px-3 py-2 mb-3">
              <p className="text-[10px] text-emerald-600 font-medium">Supported: .json backup files</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Merge (add new) or Replace (overwrite)</p>
            </div>
            <input type="file" ref={fileInputRef} accept=".json" onChange={handleFileSelect} className="hidden" data-testid="import-file-input" />
            <Button onClick={() => fileInputRef.current?.click()}
              className="w-full h-8 text-[11px] bg-emerald-600 hover:bg-emerald-700" data-testid="import-backup-btn">
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Select Backup File
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card className="shadow-sm sm:col-span-2 lg:col-span-1" data-testid="backup-stats-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#2c587a]" />
                <p className="text-xs font-semibold text-slate-700">Collections</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchStats} className="h-5 text-[9px] px-1.5" data-testid="refresh-stats-btn">
                <RefreshCw className="w-2.5 h-2.5 mr-0.5" /> Refresh
              </Button>
            </div>
            <div className="space-y-0">
              {collectionIcons.map(({ key, label, icon, color }) => (
                <StatRow key={key} icon={icon} label={label} count={stats?.[key] || 0} color={color} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Archived Month Backups */}
      {archivedMonths.length > 0 && (
        <Card className="shadow-sm" data-testid="archived-months-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <ArchiveRestore className="w-3.5 h-3.5 text-amber-600" />
              <p className="text-xs font-semibold text-slate-700">Archived Month Backups</p>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full ml-1">{archivedMonths.length}</span>
            </div>
            <div className="space-y-1.5">
              {archivedMonths.map((archive) => (
                <div key={archive.id} className="flex items-center justify-between py-2 px-3 bg-amber-50/50 border border-amber-100 rounded-lg" data-testid={`archive-${archive.id}`}>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-slate-800">{archive.month_key}</p>
                    <p className="text-[10px] text-slate-400">
                      {archive.loan_count} loans | Deleted by {archive.deleted_by} on {new Date(archive.deleted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreMonth(archive.id, archive.month_key)}
                      disabled={restoringId === archive.id}
                      className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      data-testid={`restore-archive-${archive.id}`}
                    >
                      <ArchiveRestore className="w-3 h-3 mr-0.5" />
                      {restoringId === archive.id ? 'Restoring...' : 'Restore'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteArchive(archive.id, archive.month_key)}
                      className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50"
                      data-testid={`delete-archive-${archive.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-600" /> Import Backup
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* File Info */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[11px] font-medium text-slate-700">{importFile?.name}</p>
              <p className="text-[10px] text-slate-400">{importFile && (importFile.size / 1024).toFixed(1)} KB</p>
              {importPreview?._metadata && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Backed up: {new Date(importPreview._metadata.backup_date).toLocaleString()} by {importPreview._metadata.backed_up_by}
                </p>
              )}
            </div>

            {/* Preview Records */}
            <div>
              <p className="text-[11px] font-semibold text-slate-700 mb-1.5">Records in backup file:</p>
              <div className="space-y-0.5">
                {importPreview && Object.entries(importPreview).filter(([k]) => !k.startsWith('_')).map(([col, count]) => (
                  <div key={col} className="flex items-center justify-between py-1 px-2 rounded bg-slate-50/60">
                    <span className="text-[11px] text-slate-600">{previewLabels[col] || col}</span>
                    <span className="text-[11px] font-bold text-slate-800">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 mt-1 bg-[#2c587a]/5 rounded">
                <span className="text-[11px] font-semibold text-[#2c587a]">Total</span>
                <span className="text-[11px] font-bold text-[#2c587a]">{importPreview?._total?.toLocaleString()}</span>
              </div>
            </div>

            {/* Import Mode */}
            <div>
              <p className="text-[11px] font-semibold text-slate-700 mb-1.5">Import Mode:</p>
              <div className="space-y-1.5">
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${importMode === 'merge' ? 'border-[#2c587a] bg-[#2c587a]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="mode" value="merge" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} className="mt-0.5" data-testid="import-mode-merge" />
                  <div>
                    <p className="text-[11px] font-medium text-slate-700">Merge (Safe)</p>
                    <p className="text-[9px] text-slate-400">Adds new records only. Skips duplicates. Existing data is preserved.</p>
                  </div>
                </label>
                <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${importMode === 'replace' ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="mode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="mt-0.5" data-testid="import-mode-replace" />
                  <div>
                    <p className="text-[11px] font-medium text-red-600">Replace (Destructive)</p>
                    <p className="text-[9px] text-slate-400">Wipes existing data and replaces with backup. Use with caution.</p>
                  </div>
                </label>
              </div>
            </div>

            {importMode === 'replace' && (
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-red-600">Warning: Replace mode will permanently delete all existing data in each collection before importing. This cannot be undone.</p>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-[11px] font-semibold text-emerald-700">{importResult.message}</p>
                </div>
                <div className="space-y-0.5">
                  {importResult.details && Object.entries(importResult.details).map(([col, info]) => (
                    <div key={col} className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-600">{previewLabels[col] || col}</span>
                      <span className="text-emerald-700 font-medium">
                        {info.action === 'replaced' ? `${info.count} replaced` : `${info.inserted} added, ${info.skipped} skipped`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => { setShowImportDialog(false); setImportResult(null); }} className="flex-1 h-7 text-[11px]">
                {importResult ? 'Close' : 'Cancel'}
              </Button>
              {!importResult && (
                <Button size="sm" onClick={handleImport} disabled={importing}
                  className={`flex-1 h-7 text-[11px] ${importMode === 'replace' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  data-testid="confirm-import-btn">
                  {importing ? 'Importing...' : importMode === 'replace' ? 'Replace & Import' : 'Merge & Import'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DBBackup;
