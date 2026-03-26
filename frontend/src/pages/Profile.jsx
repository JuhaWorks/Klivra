import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/getCroppedImg';
import {
    User,
    Mail,
    Camera,
    Trash2,
    Settings,
    MessageSquare,
    ChevronRight,
    Shield,
    CheckCircle2,
    X,
    ZoomIn,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const STATUSES = ['Online', 'Away', 'Do Not Disturb', 'Offline'];

const STATUS_CONFIG = {
    Online: { dot: 'bg-success', label: 'text-success', ring: 'ring-success/20' },
    Away: { dot: 'bg-warning', label: 'text-warning', ring: 'ring-warning/20' },
    'Do Not Disturb': { dot: 'bg-danger', label: 'text-danger', ring: 'ring-danger/20' },
    Offline: { dot: 'bg-tertiary', label: 'text-tertiary', ring: 'ring-tertiary/20' },
};

const ROLE_CONFIG = {
    Admin: { bg: 'bg-danger/5', text: 'text-danger', border: 'border-danger/20' },
    Manager: { bg: 'bg-theme/5', text: 'text-theme', border: 'border-theme/20' },
    Developer: { bg: 'bg-theme/5', text: 'text-theme', border: 'border-theme/20' },
    Guest: { bg: 'bg-sunken', text: 'text-tertiary', border: 'border-subtle' },
};

function cn(...args) { return twMerge(clsx(args)); }

function SectionLabel({ children }) {
    return (
        <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
            {children}
        </p>
    );
}

function FieldWrapper({ icon: Icon, children, disabled }) {
    return (
        <div className={cn(
            "flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all",
            disabled
                ? "bg-sunken border-subtle opacity-60 cursor-not-allowed"
                : "bg-surface border-subtle focus-within:border-theme focus-within:ring-2 focus-within:ring-theme/20"
        )}>
            {Icon && <Icon className="w-4 h-4 shrink-0 text-tertiary" />}
            {children}
        </div>
    );
}

export default function Profile() {
    const { user, uploadAvatar, updateProfile, removeAvatar } = useAuthStore();
    const fileRef = useRef(null);

    const [preview, setPreview] = useState(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedPx, setCroppedPx] = useState(null);
    const [cropping, setCropping] = useState(false);

    const [form, setForm] = useState({
        name: user?.name || '',
        status: user?.status || 'Online',
        customMessage: user?.customMessage || '',
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    const onFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setPreview(URL.createObjectURL(f));
        setCropping(true);
    };

    const onCropComplete = useCallback((_, px) => setCroppedPx(px), []);

    const saveCrop = async () => {
        try {
            setAvatarLoading(true);
            const blob = await getCroppedImg(preview, croppedPx);
            await uploadAvatar(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
            setPreview(null);
            setCropping(false);
        } catch (err) {
            console.error(err);
        } finally {
            setAvatarLoading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const cancelCrop = () => {
        setPreview(null);
        setCropping(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const setStatus = async (s) => {
        setForm(f => ({ ...f, status: s }));
        const { socket } = useSocketStore.getState();
        if (socket?.connected) socket.emit('setStatus', { status: s });
        useAuthStore.setState(st => ({ user: st.user ? { ...st.user, status: s } : null }));
        try { await useAuthStore.getState().updateStatus(s); }
        catch (e) { console.error(e); }
    };

    const saveProfile = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            await updateProfile(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error(err);
        } finally {
            setProfileLoading(false);
        }
    };

    const role = user?.role || 'Guest';
    const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.Guest;
    const statusConfig = STATUS_CONFIG[form.status] || STATUS_CONFIG.Online;

    return (
        <div className="flex flex-col gap-8 pb-20">
            <div className="w-full space-y-8">

                {/* Page Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-primary tracking-tighter uppercase">
                            Profile <span className="text-theme">Identity.</span>
                        </h1>
                        <p className="mt-1 text-[10px] font-black text-tertiary uppercase tracking-[0.3em]">
                            Manage your account details and preferences.
                        </p>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-default" />

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">

                    {/* Left — Avatar & Identity */}
                    <div className="space-y-4">

                        {/* Avatar Card */}
                        <div className="bg-surface border border-default rounded-2xl p-6 flex flex-col items-center gap-5">

                            {/* Avatar */}
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-2xl overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-700">
                                    <img
                                        src={user?.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                        alt={user?.name}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Status dot */}
                                <div className={cn(
                                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface",
                                    statusConfig.dot
                                )} />
                                {/* Hover overlay */}
                                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera className="w-5 h-5 text-primary" />
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                                </label>
                            </div>

                            {/* Name & email */}
                            <div className="text-center space-y-1">
                                <p className="font-bold text-primary text-base leading-snug">
                                    {user?.name}
                                </p>
                                <p className="text-[11px] font-medium text-tertiary">{user?.email}</p>
                            </div>

                            {/* Role badge */}
                            <div className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border",
                                roleConfig.bg, roleConfig.text, roleConfig.border
                            )}>
                                <Shield className="w-3 h-3" />
                                {role}
                            </div>

                            {/* Avatar actions */}
                            <div className="w-full space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-sunken rounded-lg transition-all"
                                >
                                    <Camera className="w-4 h-4" />
                                    Upload photo
                                </button>
                                {user?.avatar && !user.avatar.includes('149071.png') && (
                                    <button
                                        onClick={removeAvatar}
                                        className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Remove photo
                                    </button>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* Right — Settings Form */}
                    <div className="space-y-6">

                        {/* General Info */}
                        <div className="bg-surface border border-default rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-default flex items-center gap-2">
                                <Settings className="w-4 h-4 text-tertiary" />
                                <span className="text-xs font-black text-tertiary uppercase tracking-widest">General</span>
                            </div>

                            <form onSubmit={saveProfile} className="p-6 space-y-6">

                                {/* Name & Email row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <SectionLabel>Display name</SectionLabel>
                                        <FieldWrapper icon={User}>
                                            <input
                                                type="text"
                                                value={form.name}
                                                onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
                                                placeholder="Your name"
                                                className="w-full bg-transparent text-sm text-primary placeholder-tertiary outline-none"
                                            />
                                        </FieldWrapper>
                                    </div>
                                    <div>
                                        <SectionLabel>Email address</SectionLabel>
                                        <FieldWrapper icon={Mail} disabled>
                                            <input
                                                disabled
                                                value={user?.email}
                                                className="w-full bg-transparent text-sm text-secondary outline-none cursor-not-allowed"
                                            />
                                        </FieldWrapper>
                                        <p className="mt-1.5 text-[11px] text-zinc-400 ml-1">Email cannot be changed.</p>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-zinc-100 dark:border-zinc-800" />

                                {/* Status */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <SectionLabel>Status</SectionLabel>
                                        <span className={cn("text-[11px] font-medium flex items-center gap-1.5", statusConfig.label)}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full inline-block", statusConfig.dot)} />
                                            {form.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                        {STATUSES.map(s => {
                                            const active = form.status === s;
                                            const cfg = STATUS_CONFIG[s];
                                            return (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setStatus(s)}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-tertiary",
                                                        active
                                                            ? "bg-theme text-primary border-theme"
                                                            : "bg-surface border-subtle hover:border-theme hover:text-primary"
                                                    )}
                                                >
                                                    <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                                                    <span className="text-[12px]">{s}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-zinc-100 dark:border-zinc-800" />

                                {/* Status message */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <SectionLabel>Status message</SectionLabel>
                                        <span className="text-[11px] text-zinc-400">{form.customMessage.length} / 150</span>
                                    </div>
                                    <div className={cn(
                                        "flex gap-3 px-4 py-3.5 rounded-xl border transition-all",
                                        "bg-sunken border-subtle",
                                        "focus-within:border-theme focus-within:ring-2 focus-within:ring-theme/20"
                                    )}>
                                        <MessageSquare className="w-4 h-4 shrink-0 text-tertiary mt-0.5" />
                                        <textarea
                                            rows={3}
                                            maxLength={150}
                                            value={form.customMessage}
                                            onChange={e => setForm(s => ({ ...s, customMessage: e.target.value }))}
                                            placeholder="Let your team know what you're up to…"
                                            className="w-full bg-transparent text-sm text-primary placeholder-tertiary outline-none resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Save */}
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <AnimatePresence>
                                        {saved && (
                                            <motion.span
                                                initial={{ opacity: 0, x: 8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="flex items-center gap-1.5 text-sm text-theme font-medium"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Saved
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                    <Button
                                        type="submit"
                                        isLoading={profileLoading}
                                        disabled={profileLoading}
                                        className="px-6 py-2.5 rounded-xl text-sm font-medium bg-theme text-primary hover:opacity-90 transition-opacity"
                                    >
                                        Save changes
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Crop Modal */}
            <AnimatePresence>
                {cropping && preview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 8 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 8 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-elevated dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
                        >
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Crop photo</h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">Adjust and position your profile photo.</p>
                                </div>
                                <button
                                    onClick={cancelCrop}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Crop area */}
                            <div className="relative w-full h-72 bg-zinc-950">
                                <Cropper
                                    image={preview}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>

                            {/* Zoom & actions */}
                            <div className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                                            <ZoomIn className="w-3.5 h-3.5" />
                                            Zoom
                                        </span>
                                        <span className="text-xs text-zinc-400">{parseFloat(zoom).toFixed(1)}×</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.05}
                                        className="w-full accent-zinc-900 dark:accent-zinc-100 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full appearance-none"
                                        onChange={e => setZoom(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={cancelCrop}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        onClick={saveCrop}
                                        isLoading={avatarLoading}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}