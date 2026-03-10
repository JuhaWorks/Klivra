import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/getCroppedImg';

const optimizeAvatar = (url) =>
    !url ? 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
        : url.includes('upload/') ? url.replace('upload/', 'upload/w_100,h_100,c_fill,f_webp/')
            : url;

const STATUSES = ['Online', 'Away', 'Do Not Disturb', 'Offline'];
const STATUS_COLOR = { Online: '#10b981', Away: '#f59e0b', 'Do Not Disturb': '#ef4444', Offline: '#6b7280' };
const ROLE_GRADIENT = {
    Admin: 'from-red-500 to-orange-500', Manager: 'from-emerald-500 to-cyan-500',
    Developer: 'from-emerald-500 to-emerald-500', Guest: 'from-gray-500 to-gray-600',
};

const Spinner = () => (
    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
    </svg>
);

const Banner = ({ type, text }) => !text ? null : (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mt-3 border ${type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: type === 'error' ? '#f87171' : '#34d399' }} />
        {text}
    </div>
);

const Label = ({ children }) => (
    <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{children}</label>
);

const Section = ({ title, badge, children }) => (
    <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[13px] font-semibold text-zinc-200">{title}</span>
            {badge && <span className="text-[10px] text-zinc-600 bg-white/[0.04] border border-white/[0.06] px-2.5 py-0.5 rounded-full uppercase tracking-wider">{badge}</span>}
        </div>
        <div className="p-5 space-y-4">{children}</div>
    </div>
);

const inputCls = "w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2 text-[13px] text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 transition-colors";

export default function Profile() {
    const { user, uploadAvatar, updateProfile, removeAvatar } = useAuthStore();
    const fileRef = useRef(null);

    const [preview, setPreview] = useState(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [avatarMsg, setAvatarMsg] = useState({ type: '', text: '' });
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedPx, setCroppedPx] = useState(null);
    const [cropping, setCropping] = useState(false);

    const [form, setForm] = useState({
        name: user?.name || '', status: user?.status || 'Online', customMessage: user?.customMessage || '',
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

    const onFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) return setAvatarMsg({ type: 'error', text: 'Images only.' });
        setPreview(URL.createObjectURL(f));
        setCropping(true);
        setAvatarMsg({ type: '', text: '' });
    };

    const onCropComplete = useCallback((_, px) => setCroppedPx(px), []);

    const saveCrop = async () => {
        try {
            setAvatarLoading(true);
            const blob = await getCroppedImg(preview, croppedPx);
            await uploadAvatar(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
            setPreview(null); setCropping(false);
            setAvatarMsg({ type: 'success', text: 'Profile picture updated.' });
        } catch (err) {
            setAvatarMsg({ type: 'error', text: err?.response?.data?.message || 'Upload failed.' });
        } finally {
            setAvatarLoading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const cancelCrop = () => { setPreview(null); setCropping(false); if (fileRef.current) fileRef.current.value = ''; };

    const removeAv = async () => {
        setAvatarLoading(true); setAvatarMsg({ type: '', text: '' });
        try { await removeAvatar(); setAvatarMsg({ type: 'success', text: 'Picture removed.' }); }
        catch (err) { setAvatarMsg({ type: 'error', text: err.response?.data?.message || 'Remove failed.' }); }
        finally { setAvatarLoading(false); }
    };

    const setStatus = async (s) => {
        setForm(f => ({ ...f, status: s }));
        const { socket } = useSocketStore.getState();
        if (socket?.connected) socket.emit('setStatus', { status: s });
        useAuthStore.setState(st => ({ user: st.user ? { ...st.user, status: s } : null }));
        try { await useAuthStore.getState().updateStatus(s); } catch (e) { console.error(e); }
    };

    const saveProfile = async (e) => {
        e.preventDefault(); setProfileLoading(true); setProfileMsg({ type: '', text: '' });
        try { await updateProfile(form); setProfileMsg({ type: 'success', text: 'Profile updated.' }); }
        catch (err) { setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Update failed.' }); }
        finally { setProfileLoading(false); }
    };

    return (
        <div className="p-6 max-w-xl mx-auto space-y-3">
            <div className="mb-5">
                <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Profile Settings</h1>
                <p className="text-xs text-zinc-500 mt-1">Manage your account appearance and preferences</p>
            </div>

            {/* Crop Modal */}
            {cropping && preview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
                    <div className="bg-[#111118] border border-white/[0.08] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="px-5 py-3.5 border-b border-white/[0.07] flex items-center justify-between">
                            <span className="text-sm font-semibold text-zinc-100">Crop Picture</span>
                            <button onClick={cancelCrop} className="text-zinc-500 hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="relative w-full h-64 bg-black">
                            <Cropper image={preview} crop={crop} zoom={zoom} aspect={1} cropShape="round"
                                showGrid={false} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
                        </div>
                        <div className="p-4 space-y-3">
                            <div>
                                <div className="flex justify-between text-[11px] text-zinc-500 mb-1.5">
                                    <span className="uppercase tracking-wider font-semibold">Zoom</span>
                                    <span>{parseFloat(zoom).toFixed(1)}×</span>
                                </div>
                                <input type="range" value={zoom} min={1} max={3} step={0.1} className="w-full accent-emerald-500"
                                    onChange={e => setZoom(e.target.value)} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={cancelCrop} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-400">Cancel</button>
                                <button onClick={saveCrop} disabled={avatarLoading}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60">
                                    {avatarLoading && <Spinner />}{avatarLoading ? 'Saving…' : 'Apply Crop'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Avatar */}
            <Section title="Profile Picture">
                <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                        <img src={preview || optimizeAvatar(user?.avatar)} alt={user?.name}
                            className="w-16 h-16 rounded-xl border border-white/[0.08] object-cover" />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0c0c14]"
                            style={{ background: STATUS_COLOR[user?.status] || STATUS_COLOR.Online }} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-zinc-100">{user?.name || 'User'}</p>
                        <p className="text-xs text-zinc-500">{user?.email}</p>
                        <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${ROLE_GRADIENT[user?.role] || ROLE_GRADIENT.Guest} uppercase tracking-wider`}>
                            {user?.role || 'Guest'}
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <label className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.08] cursor-pointer transition-colors">
                        Upload Photo
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                    </label>
                    {user?.avatar && !user.avatar.includes('149071.png') && (
                        <button type="button" onClick={removeAv} disabled={avatarLoading}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors disabled:opacity-60">
                            {avatarLoading ? 'Removing…' : 'Remove'}
                        </button>
                    )}
                </div>
                <p className="text-[11px] text-zinc-600"></p>
                <Banner {...avatarMsg} />
            </Section>

            {/* Profile Info */}
            <Section title="Profile Info">
                <form onSubmit={saveProfile} className="space-y-4">
                    <div>
                        <Label>Full Name</Label>
                        <input className={inputCls} type="text" value={form.name} placeholder="Your full name" maxLength={50}
                            onChange={e => setForm(s => ({ ...s, name: e.target.value }))} />
                    </div>

                    <hr className="border-white/[0.05]" />

                    <div>
                        <Label>Status</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {STATUSES.map(s => (
                                <button key={s} type="button" onClick={() => setStatus(s)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all"
                                    style={{
                                        border: `1px solid ${form.status === s ? STATUS_COLOR[s] + '33' : 'rgba(255,255,255,0.06)'}`,
                                        background: form.status === s ? STATUS_COLOR[s] + '12' : 'rgba(255,255,255,0.02)',
                                        color: form.status === s ? STATUS_COLOR[s] : '#71717a',
                                    }}>
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLOR[s] }} />
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <hr className="border-white/[0.05]" />

                    <div>
                        <Label>
                            Custom Message{' '}
                            <span className="normal-case text-zinc-600 font-normal">({form.customMessage.length}/150)</span>
                        </Label>
                        <textarea className={`${inputCls} resize-none`} value={form.customMessage} rows={2} maxLength={150}
                            placeholder="e.g. In a meeting until 3pm…"
                            onChange={e => setForm(s => ({ ...s, customMessage: e.target.value }))} />
                    </div>

                    <Banner {...profileMsg} />

                    <button type="submit" disabled={profileLoading}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60 shadow-lg shadow-emerald-500/20">
                        {profileLoading && <Spinner />}{profileLoading ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            </Section>
        </div>
    );
}