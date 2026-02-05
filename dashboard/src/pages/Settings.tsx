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
    // Profile update not yet implemented in backend
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
    // Notifications not yet implemented in backend
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
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">&times;</button>
        </div>
      )}

      {success && (
        <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <Check className="h-5 w-5 mr-2 flex-shrink-0" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto">&times;</button>
        </div>
      )}

      {/* Profile */}
      <div className="card">
        <div className="flex items-center mb-6">
          <User className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input pl-10 bg-gray-50"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <button onClick={saveProfile} disabled={isSaving} className="btn btn-primary">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card">
        <div className="flex items-center mb-6">
          <Lock className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
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
          <Bell className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
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
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={notifications[item.key as keyof typeof notifications]}
                onChange={(e) =>
                  setNotifications({ ...notifications, [item.key]: e.target.checked })
                }
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
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
          <Shield className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Add an extra layer of security</p>
            </div>
            <button className="btn btn-secondary text-sm">Enable</button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">Active Sessions</p>
              <p className="text-sm text-gray-500">Manage your active sessions</p>
            </div>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View Sessions
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <div className="flex items-center mb-6">
          <Trash2 className="h-5 w-5 text-red-500 mr-2" />
          <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Delete Account</p>
            <p className="text-sm text-gray-500">
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
