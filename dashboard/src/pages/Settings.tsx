import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import {
  User,
  Mail,
  Lock,
  Bell,
  Shield,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.email?.split('@')[0] || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notifications, setNotifications] = useState({
    usageAlerts: true,
    securityAlerts: true,
    productUpdates: false,
    weeklyDigest: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function saveProfile() {
    setSuccess('Profile updated successfully');
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await api.put('/api/user/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password changed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNotifications() {
    setSuccess('Notification preferences saved');
  }

  async function deleteAccount() {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') {
      return;
    }

    try {
      await api.delete('/api/user');
      logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-n2f-text">Settings</h1>
        <p className="text-n2f-text-secondary">Manage your account settings and preferences</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">&times;</button>
        </div>
      )}

      {success && (
        <div className="flex items-center p-4 bg-green-900/20 border border-green-800 rounded-lg text-green-400">
          <Check className="h-5 w-5 mr-2 flex-shrink-0" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-300">&times;</button>
        </div>
      )}

      {/* Profile */}
      <div className="card">
        <div className="flex items-center mb-6">
          <User className="h-5 w-5 text-n2f-text-muted mr-2" />
          <h2 className="text-lg font-semibold text-n2f-text">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-n2f-text-muted" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input pl-10 bg-n2f-elevated opacity-60"
              />
            </div>
            <p className="text-xs text-n2f-text-muted mt-1">Email cannot be changed</p>
          </div>

          <button onClick={saveProfile} disabled={isSaving} className="btn btn-primary">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Lock className="h-5 w-5 text-n2f-text-muted mr-2" />
          <h2 className="text-lg font-semibold text-n2f-text">Change Password</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="Confirm new password"
            />
          </div>

          <button
            onClick={changePassword}
            disabled={isSaving || !currentPassword || !newPassword}
            className="btn btn-primary"
          >
            {isSaving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Bell className="h-5 w-5 text-n2f-text-muted mr-2" />
          <h2 className="text-lg font-semibold text-n2f-text">Notifications</h2>
        </div>

        <div className="space-y-4">
          {[
            { key: 'usageAlerts', label: 'Usage Alerts', desc: 'Get notified when approaching request limits' },
            { key: 'securityAlerts', label: 'Security Alerts', desc: 'Important security notifications' },
            { key: 'productUpdates', label: 'Product Updates', desc: 'New features and improvements' },
            { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Weekly summary of your usage' },
          ].map((item) => (
            <label key={item.key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-n2f-text">{item.label}</p>
                <p className="text-sm text-n2f-text-muted">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={notifications[item.key as keyof typeof notifications]}
                onChange={(e) =>
                  setNotifications({ ...notifications, [item.key]: e.target.checked })
                }
                className="h-4 w-4 text-n2f-accent focus:ring-n2f-accent border-n2f-border bg-n2f-elevated rounded"
              />
            </label>
          ))}

          <button onClick={saveNotifications} disabled={isSaving} className="btn btn-primary">
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Shield className="h-5 w-5 text-n2f-text-muted mr-2" />
          <h2 className="text-lg font-semibold text-n2f-text">Security</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-n2f-border">
            <div>
              <p className="font-medium text-n2f-text">Two-Factor Authentication</p>
              <p className="text-sm text-n2f-text-muted">Add an extra layer of security</p>
            </div>
            <button className="btn btn-secondary text-sm">Enable</button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-n2f-text">Active Sessions</p>
              <p className="text-sm text-n2f-text-muted">Manage your active sessions</p>
            </div>
            <button className="text-n2f-accent hover:text-n2f-accent-light text-sm font-medium">
              View Sessions
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-800">
        <div className="flex items-center mb-6">
          <Trash2 className="h-5 w-5 text-red-400 mr-2" />
          <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-n2f-text">Delete Account</p>
            <p className="text-sm text-n2f-text-muted">
              Permanently delete your account and all data. This cannot be undone.
            </p>
          </div>
          <button onClick={deleteAccount} className="btn btn-danger">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
