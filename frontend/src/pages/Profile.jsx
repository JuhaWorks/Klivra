import { useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';

// ─── Status options (must match backend enum) ────────────────────────────────
const STATUS_OPTIONS = ['Online', 'Away', 'Do Not Disturb', 'Offline'];

const STATUS_DOT = {
    Online: 'bg-emerald-500',
    Away: 'bg-yellow-400',
    'Do Not Disturb': 'bg-red-500',
    Offline: 'bg-gray-500',
};

const roleColors = {
    Admin: 'from-red-500 to-orange-500',
    Manager: 'from-blue-500 to-cyan-500',
    Developer: 'from-violet-500 to-blue-500',
    Guest: 'from-gray-500 to-gray-600',
};

// ─── Small feedback banner ────────────────────────────────────────────────────
const Banner = ({ type, msg }) =>
    msg ? (
        <p className={`text-[13px] px-4 py-2.5 rounded-xl border ${type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
            {msg}
        </p>
    ) : null;

// ─── Section card wrapper ────────────────────────────────────────────────────
const Card = ({ title, badge, children }) => (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-white">{title}</h2>
            {badge && (
                <span className="text-[10px] text-gray-500 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06] uppercase tracking-wider font-medium">
                    {badge}
                </span>
            )}
        </div>
        <div className="p-6 space-y-4">{children}</div>
    </div>
);

// ─── Shared input ─────────────────────────────────────────────────────────────
const Input = ({ label, ...props }) => (
    <div>
        <label className="block text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1.5">
            {label}
        </label>
        <input
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-gray-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/10 transition-all"
            {...props}
        />
    </div>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
    </svg>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const Profile = () => {
    const { user, uploadAvatar, updateProfile, changePassword } = useAuthStore();

    // ── Avatar state ──────────────────────────────────────────────────────────
    const fileRef = useRef(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [avatarStatus, setAvatarStatus] = useState({ type: '', msg: '' });

    // ── Edit profile state ────────────────────────────────────────────────────
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        status: user?.status || 'Online',
        customMessage: user?.customMessage || '',
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileStatus, setProfileStatus] = useState({ type: '', msg: '' });

    // ── Password state ────────────────────────────────────────────────────────
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwStatus, setPwStatus] = useState({ type: '', msg: '' });
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setAvatarStatus({ type: 'error', msg: 'Only image files are allowed.' });
            return;
        }
        setAvatarPreview(URL.createObjectURL(file));
        setAvatarStatus({ type: '', msg: '' });
    };

    const handleAvatarUpload = async () => {
        const file = fileRef.current?.files[0];
        if (!file) return;
        setAvatarLoading(true);
        setAvatarStatus({ type: '', msg: '' });
        try {
            await uploadAvatar(file);
            setAvatarPreview(null);
            setAvatarStatus({ type: 'success', msg: 'Profile picture updated!' });
        } catch (err) {
            setAvatarStatus({ type: 'error', msg: err.response?.data?.message || 'Upload failed.' });
        } finally {
            setAvatarLoading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileStatus({ type: '', msg: '' });
        try {
            await updateProfile(profileForm);
            setProfileStatus({ type: 'success', msg: 'Profile updated successfully!' });
        } catch (err) {
            setProfileStatus({ type: 'error', msg: err.response?.data?.message || 'Update failed.' });
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        setPwStatus({ type: '', msg: '' });
        if (pwForm.newPassword !== pwForm.confirm) {
            setPwStatus({ type: 'error', msg: 'New passwords do not match.' });
            return;
        }
        if (pwForm.newPassword.length < 6) {
            setPwStatus({ type: 'error', msg: 'New password must be at least 6 characters.' });
            return;
        }
        setPwLoading(true);
        try {
            await changePassword(pwForm.currentPassword, pwForm.newPassword);
            setPwStatus({ type: 'success', msg: 'Password changed successfully!' });
            setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
        } catch (err) {
            setPwStatus({ type: 'error', msg: err.response?.data?.message || 'Password change failed.' });
        } finally {
            setPwLoading(false);
        }
    };

    // ── Eye toggle helper ─────────────────────────────────────────────────────
    const EyeIcon = ({ field }) => (
        <button
            type="button"
            onClick={() => setShowPw(s => ({ ...s, [field]: !s[field] }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Toggle password visibility"
        >
            {showPw[field] ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
            ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )}
        </button>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="p-5 sm:p-7 lg:p-8 max-w-2xl mx-auto space-y-5">
            <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>

            {/* ── Avatar Card ──────────────────────────────────────────────── */}
            <Card title="Profile Picture" badge="optional">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Preview */}
                    <div className="relative flex-shrink-0">
                        <img
                            src={avatarPreview || user?.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                            alt={user?.name}
                            className="w-24 h-24 rounded-2xl border-2 border-white/[0.08] object-cover shadow-xl"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a12] ${STATUS_DOT[user?.status] || 'bg-emerald-500'}`} />
                    </div>

                    <div className="flex-1 w-full space-y-3">
                        <div>
                            <p className="text-[13px] font-bold text-white">{user?.name || 'User'}</p>
                            <p className="text-[12px] text-gray-500">{user?.email}</p>
                            <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${roleColors[user?.role] || roleColors.Guest} uppercase tracking-wider`}>
                                {user?.role || 'Guest'}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="cursor-pointer px-4 py-2 text-[13px] font-semibold rounded-xl bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08] transition-all">
                                Choose Image
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </label>
                            {avatarPreview && (
                                <button
                                    onClick={handleAvatarUpload}
                                    disabled={avatarLoading}
                                    className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-60"
                                >
                                    {avatarLoading ? <Spinner /> : null}
                                    {avatarLoading ? 'Uploading…' : 'Save Photo'}
                                </button>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-600">JPG, PNG or WebP · max 5 MB</p>
                        <Banner {...avatarStatus} />
                    </div>
                </div>
            </Card>

            {/* ── Edit Info Card ───────────────────────────────────────────── */}
            <Card title="Profile Info">
                <form onSubmit={handleProfileSave} className="space-y-4">
                    <Input
                        label="Full Name"
                        type="text"
                        value={profileForm.name}
                        onChange={e => setProfileForm(s => ({ ...s, name: e.target.value }))}
                        placeholder="Your name"
                        maxLength={50}
                    />

                    {/* Status selector */}
                    <div>
                        <label className="block text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1.5">
                            Status
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {STATUS_OPTIONS.map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setProfileForm(f => ({ ...f, status: s }))}
                                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${profileForm.status === s
                                            ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                                            : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.05]'
                                        }`}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[s]}`} />
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1.5">
                            Custom Message <span className="normal-case text-gray-600">({profileForm.customMessage.length}/150)</span>
                        </label>
                        <textarea
                            value={profileForm.customMessage}
                            onChange={e => setProfileForm(s => ({ ...s, customMessage: e.target.value }))}
                            placeholder="e.g. In a meeting until 3pm…"
                            maxLength={150}
                            rows={2}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-gray-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/10 transition-all resize-none"
                        />
                    </div>

                    <Banner {...profileStatus} />

                    <button
                        type="submit"
                        disabled={profileLoading}
                        className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-60 shadow-lg shadow-violet-500/15"
                    >
                        {profileLoading ? <Spinner /> : null}
                        {profileLoading ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            </Card>

            {/* ── Change Password Card ─────────────────────────────────────── */}
            <Card title="Change Password" badge="secure">
                <form onSubmit={handlePasswordSave} className="space-y-4">
                    {[
                        { field: 'current', label: 'Current Password', key: 'currentPassword' },
                        { field: 'new', label: 'New Password', key: 'newPassword' },
                        { field: 'confirm', label: 'Confirm New Password', key: 'confirm' },
                    ].map(({ field, label, key }) => (
                        <div key={key}>
                            <label className="block text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-1.5">
                                {label}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPw[field] ? 'text' : 'password'}
                                    value={pwForm[key]}
                                    onChange={e => setPwForm(s => ({ ...s, [key]: e.target.value }))}
                                    placeholder="••••••••"
                                    autoComplete={field === 'current' ? 'current-password' : 'new-password'}
                                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 pr-10 text-[14px] text-white placeholder-gray-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/10 transition-all"
                                />
                                <EyeIcon field={field} />
                            </div>
                        </div>
                    ))}

                    <Banner {...pwStatus} />

                    <button
                        type="submit"
                        disabled={pwLoading}
                        className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold rounded-xl bg-red-600/80 hover:bg-red-500 text-white transition-all disabled:opacity-60 shadow-lg shadow-red-500/10"
                    >
                        {pwLoading ? <Spinner /> : null}
                        {pwLoading ? 'Updating…' : 'Update Password'}
                    </button>
                </form>
            </Card>
        </div>
    );
};

export default Profile;
