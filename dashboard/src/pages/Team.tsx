import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import { formatRelativeTime, TIER_LABELS } from '../utils/format';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  AlertCircle,
  Crown,
  Check,
} from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
  joinedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Can manage team members and API keys',
  member: 'Can create and manage API keys',
  viewer: 'Can view usage and analytics only',
};

export default function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isTeamFeature = user?.tier && ['pro', 'business', 'enterprise'].includes(user.tier);

  useEffect(() => {
    if (isTeamFeature) {
      loadTeam();
    } else {
      setIsLoading(false);
    }
  }, [isTeamFeature]);

  async function loadTeam() {
    try {
      const data = await api.get<{ members: TeamMember[] }>('/api/team/members');
      setMembers(data.members);
    } catch (error) {
      console.error('Failed to load team:', error);
      // Mock data
      setMembers([
        { id: '1', email: user?.email || 'owner@example.com', name: user?.name, role: 'owner', status: 'active', joinedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '2', email: 'admin@example.com', name: 'Admin User', role: 'admin', status: 'active', joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '3', email: 'developer@example.com', name: null, role: 'member', status: 'pending', joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function inviteMember() {
    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    try {
      await api.post('/api/team/invite', { email: inviteEmail, role: inviteRole });
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setShowInviteModal(false);
      loadTeam();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    }
  }

  async function removeMember(id: string) {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      await api.delete(`/api/team/members/${id}`);
      setMembers(members.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isTeamFeature) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600">Collaborate with your team members</p>
        </div>

        <div className="card text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Team Management</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Invite team members and collaborate on WordPress automation.
            Team management is available on Pro plans and above.
          </p>
          <button className="btn btn-primary">
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-600">Manage your team members and their permissions</p>
        </div>
        <button onClick={() => setShowInviteModal(true)} className="btn btn-primary">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <Check className="h-5 w-5 mr-2 flex-shrink-0" />
          {success}
          <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
            &times;
          </button>
        </div>
      )}

      {/* Team Members */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Member</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Joined</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-primary-700 font-medium">
                          {(member.name || member.email)[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name || 'Pending'}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      {member.role === 'owner' && <Crown className="h-4 w-4 text-yellow-500 mr-1" />}
                      <span className="text-sm text-gray-700">{ROLE_LABELS[member.role]}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        member.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {member.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-500">
                    {formatRelativeTime(member.joinedAt)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permissions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Permissions</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
            <div key={role} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-primary-500 mr-2" />
                <span className="font-medium text-gray-900">{ROLE_LABELS[role]}</span>
              </div>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Team Member</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                  className="input"
                >
                  <option value="admin">Admin - Can manage team and API keys</option>
                  <option value="member">Member - Can create and manage API keys</option>
                  <option value="viewer">Viewer - Can view usage only</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setError('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={inviteMember} className="btn btn-primary flex-1">
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
