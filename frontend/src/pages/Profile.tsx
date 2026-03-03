import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/axios';

interface ProfileData {
  _id: string;
  email: string;
  displayName?: string;
  role: string;
  provider: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit display name state
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/user/profile');
      setProfile(res.data.user);
      setDisplayName(res.data.user.displayName || '');
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(null);
    setNameLoading(true);
    try {
      const res = await api.patch('/user/profile', { displayName });
      setProfile(res.data.user);
      setDisplayName(res.data.user.displayName || '');
      setEditingName(false);
      setNameSuccess('Display name updated successfully.');
    } catch (err: any) {
      setNameError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    if (newPassword !== confirmNewPassword) {
      setPwError('New passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/user/profile/password', { currentPassword, newPassword });
      setPwSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPwError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saffron-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error || 'Could not load profile'}
        </div>
      </div>
    );
  }

  const isLocalUser = !profile.provider || profile.provider === 'local';
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const avatarInitial = (profile.displayName || profile.email).charAt(0).toUpperCase();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-navy-600 dark:text-white mb-8">My Profile</h1>

      {/* Avatar + Overview */}
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-saffron-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {avatarInitial}
          </div>
          <div className="min-w-0">
            <p className="text-xl font-semibold text-navy-600 dark:text-white truncate">
              {profile.displayName || profile.email}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{profile.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 capitalize">
                {profile.role}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 capitalize">
                {profile.provider || 'local'}
              </span>
              {profile.emailVerified && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  Email verified
                </span>
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Member since {memberSince}
        </p>
      </div>

      {/* Edit Display Name */}
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-navy-600 dark:text-white">Display Name</h2>
          {!editingName && (
            <button
              onClick={() => { setEditingName(true); setNameSuccess(null); setNameError(null); }}
              className="text-sm text-saffron-500 hover:text-saffron-600 font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {nameSuccess && (
          <div className="mb-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 px-3 py-2 rounded text-sm">
            {nameSuccess}
          </div>
        )}
        {nameError && (
          <div className="mb-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
            {nameError}
          </div>
        )}

        {editingName ? (
          <form onSubmit={handleSaveName} className="space-y-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
              placeholder="Enter your display name"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={nameLoading}
                className="px-4 py-2 bg-saffron-500 hover:bg-saffron-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm"
              >
                {nameLoading ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditingName(false); setDisplayName(profile.displayName || ''); }}
                className="px-4 py-2 border border-gray-300 dark:border-navy-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-sm hover:bg-gray-50 dark:hover:bg-navy-700"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="text-gray-700 dark:text-gray-300">
            {profile.displayName || <span className="italic text-gray-400">Not set</span>}
          </p>
        )}
      </div>

      {/* Change Password (local users only) */}
      {isLocalUser && (
        <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-navy-600 dark:text-white mb-4">Change Password</h2>

          {pwSuccess && (
            <div className="mb-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 px-3 py-2 rounded text-sm">
              {pwSuccess}
            </div>
          )}
          {pwError && (
            <div className="mb-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
              {pwError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white"
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={pwLoading}
              className="px-6 py-2 bg-saffron-500 hover:bg-saffron-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {pwLoading ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
