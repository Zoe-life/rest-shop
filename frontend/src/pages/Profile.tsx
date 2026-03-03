import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/axios';

interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface ProfileData {
  _id: string;
  email: string;
  displayName?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  address?: Address;
  role: string;
  provider: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

const EMPTY_ADDRESS: Address = { street: '', city: '', state: '', postalCode: '', country: '' };

/**
 * Returns the backend-absolute URL for a stored avatar path.
 *
 * Only paths that match the exact pattern written by the server
 * (uploads/avatar-{timestamp}-{random}.jpg|jpeg|png) are accepted.
 * Any other value — including absolute http(s) URLs, javascript: URIs,
 * data: URIs, or path-traversal sequences — is rejected (returns undefined)
 * to prevent stored XSS and cross-origin tracking pixel injection.
 */
function resolveMediaUrl(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined;
  // Strict allow-list: relative path, no traversal, safe extension only.
  if (!/^uploads\/avatar-\d+-\d+\.(jpg|jpeg|png)$/i.test(filePath)) return undefined;
  const base = (api.defaults.baseURL ?? '').replace(/\/$/, '');
  return `${base}/${filePath}`;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Personal info form
  const [infoForm, setInfoForm] = useState({ displayName: '', phone: '', bio: '' });
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  // Address form
  const [addressForm, setAddressForm] = useState<Address>(EMPTY_ADDRESS);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrSuccess, setAddrSuccess] = useState<string | null>(null);
  const [addrError, setAddrError] = useState<string | null>(null);

  // Avatar upload
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Password change
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
      const p: ProfileData = res.data.user;
      setProfile(p);
      setInfoForm({
        displayName: p.displayName ?? '',
        phone: p.phone ?? '',
        bio: p.bio ?? '',
      });
      setAddressForm({ ...EMPTY_ADDRESS, ...(p.address ?? {}) });
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // --- Avatar ---
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarError(null);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarLoading(true);
    setAvatarError(null);
    try {
      const form = new FormData();
      form.append('avatar', avatarFile);
      const res = await api.post('/user/profile/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(res.data.user);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err: any) {
      setAvatarError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setAvatarLoading(false);
    }
  };

  const cancelAvatarPreview = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarError(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  // --- Personal Info ---
  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError(null);
    setInfoSuccess(null);
    setInfoLoading(true);
    try {
      const res = await api.patch('/user/profile', {
        displayName: infoForm.displayName || undefined,
        phone: infoForm.phone || undefined,
        bio: infoForm.bio || undefined,
      });
      setProfile(res.data.user);
      setInfoSuccess('Personal information updated.');
    } catch (err: any) {
      setInfoError(err.response?.data?.message || 'Failed to update information');
    } finally {
      setInfoLoading(false);
    }
  };

  // --- Address ---
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError(null);
    setAddrSuccess(null);
    setAddrLoading(true);
    try {
      const res = await api.patch('/user/profile', { address: addressForm });
      setProfile(res.data.user);
      setAddrSuccess('Shipping address saved.');
    } catch (err: any) {
      setAddrError(err.response?.data?.message || 'Failed to save address');
    } finally {
      setAddrLoading(false);
    }
  };

  // --- Password ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    if (newPassword !== confirmNewPassword) { setPwError('New passwords do not match'); return; }
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
  const avatarSrc = avatarPreview ?? resolveMediaUrl(profile.avatarUrl);

  const inputClass =
    'w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-500 bg-white dark:bg-navy-700 text-navy-600 dark:text-white';
  const labelClass = 'block text-sm font-medium text-navy-600 dark:text-gray-300 mb-1';

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-navy-600 dark:text-white mb-8">My Profile</h1>

      {/* Account Overview */}
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-5">
          {/* Clickable avatar */}
          <div className="relative flex-shrink-0 group">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="w-20 h-20 rounded-full overflow-hidden bg-saffron-500 flex items-center justify-center cursor-pointer"
              title="Change profile photo"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-3xl font-bold">{avatarInitial}</span>
              )}
            </div>
            {/* Camera overlay */}
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>

          <div className="min-w-0 flex-1">
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
                  Verified
                </span>
              )}
              {profile.twoFactorEnabled && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                  2FA On
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Avatar action row — only shown after a new file is selected */}
        {avatarFile && (
          <div className="mt-4 flex items-center gap-3">
            {avatarError && (
              <p className="text-sm text-red-600 dark:text-red-400 flex-1">{avatarError}</p>
            )}
            <button
              onClick={handleAvatarUpload}
              disabled={avatarLoading}
              className="px-4 py-2 bg-saffron-500 hover:bg-saffron-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {avatarLoading ? 'Uploading…' : 'Save Photo'}
            </button>
            <button
              onClick={cancelAvatarPreview}
              className="px-4 py-2 border border-gray-300 dark:border-navy-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Member since {memberSince}</p>
      </div>

      {/* Personal Information */}
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy-600 dark:text-white mb-4">Personal Information</h2>

        {infoSuccess && (
          <div className="mb-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 px-3 py-2 rounded text-sm">
            {infoSuccess}
          </div>
        )}
        {infoError && (
          <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
            {infoError}
          </div>
        )}

        <form onSubmit={handleInfoSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Display Name</label>
            <input
              type="text"
              value={infoForm.displayName}
              onChange={(e) => setInfoForm({ ...infoForm, displayName: e.target.value })}
              maxLength={100}
              placeholder="How others see your name"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <input
              type="tel"
              value={infoForm.phone}
              onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
              maxLength={20}
              placeholder="+1 555 000 0000"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Bio
              <span className="ml-1 text-xs font-normal text-gray-400">({infoForm.bio.length}/300)</span>
            </label>
            <textarea
              value={infoForm.bio}
              onChange={(e) => setInfoForm({ ...infoForm, bio: e.target.value })}
              maxLength={300}
              rows={3}
              placeholder="Tell us a little about yourself…"
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={infoLoading}
              className="px-5 py-2 bg-saffron-500 hover:bg-saffron-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm"
            >
              {infoLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Shipping Address */}
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy-600 dark:text-white mb-4">Default Shipping Address</h2>

        {addrSuccess && (
          <div className="mb-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 px-3 py-2 rounded text-sm">
            {addrSuccess}
          </div>
        )}
        {addrError && (
          <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
            {addrError}
          </div>
        )}

        <form onSubmit={handleAddressSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Street Address</label>
            <input
              type="text"
              value={addressForm.street}
              onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
              maxLength={200}
              placeholder="123 Main St, Apt 4B"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                value={addressForm.city}
                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                maxLength={100}
                placeholder="Nairobi"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>State / Province</label>
              <input
                type="text"
                value={addressForm.state}
                onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                maxLength={100}
                placeholder="Nairobi County"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Postal Code</label>
              <input
                type="text"
                value={addressForm.postalCode}
                onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                maxLength={20}
                placeholder="00100"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input
                type="text"
                value={addressForm.country}
                onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                maxLength={100}
                placeholder="Kenya"
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={addrLoading}
            className="px-5 py-2 bg-saffron-500 hover:bg-saffron-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm"
          >
            {addrLoading ? 'Saving…' : 'Save Address'}
          </button>
        </form>
      </div>

      {/* Security */}
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-navy-600 dark:text-white mb-1">Security</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Two-factor authentication is currently{' '}
          <span className={profile.twoFactorEnabled ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-500'}>
            {profile.twoFactorEnabled ? 'enabled' : 'disabled'}
          </span>.
        </p>

        {isLocalUser && (
          <>
            <h3 className="text-base font-medium text-navy-600 dark:text-white mb-3">Change Password</h3>

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
                <label className={labelClass}>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className={labelClass}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Min 8 chars, upper, lower, number, symbol"
                />
              </div>
              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Repeat new password"
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
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
