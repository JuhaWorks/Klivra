import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Shield, Bell, Palette, AlertCircle,
    Settings as SettingsIcon, ChevronRight, Globe,
    Smartphone, History, Activity, CreditCard
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../store/useTheme';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Import real components
import GeneralTab from '../components/settings/GeneralTab';
import SecurityTab from '../components/settings/SecurityTab';
import NotificationsTab from '../components/settings/NotificationsTab';
import DangerZoneTab from '../components/settings/DangerZoneTab';
import GlassSurface from '../components/ui/GlassSurface';

const TABS = [
    { id: 'general', label: 'General', icon: User, color: '#10b981' },
    { id: 'security', label: 'Security', icon: Shield, color: '#6366f1' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: '#f59e0b' },
    { id: 'appearance', label: 'Appearance', icon: Palette, color: '#ec4899' },
    { id: 'status', label: 'Account Status', icon: Activity, color: '#f43f5e' },
];

const TabButton = ({ tab, active, onClick }) => {
    const Icon = tab.icon;
    return (
        <button
            onClick={() => onClick(tab.id)}
            className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group overflow-hidden ${active
                    ? 'shadow-sm border border-strong'
                    : 'hover:border-default border border-transparent'
                }`}
        >
            <div className={`absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${active ? 'opacity-100' : ''}`}>
                <GlassSurface width="100%" height="100%" borderRadius={12} displace={0.5} distortionScale={-40} backgroundOpacity={active ? 0.12 : 0.04} opacity={0.9} />
            </div>

            <div className="relative z-10 flex items-center gap-3 w-full">
                <div className={twMerge(clsx(
                    "p-2 rounded-lg transition-all duration-300",
                    active
                        ? "bg-theme text-primary shadow-lg shadow-theme/20"
                        : "bg-surface group-hover:bg-sunken text-tertiary group-hover:text-primary"
                ))}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <span className={twMerge(clsx(
                    "text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                    active ? "text-primary" : "text-tertiary group-hover:text-primary"
                ))}>
                    {tab.label}
                </span>
                {active && (
                    <motion.div
                        layoutId="active-pill"
                        className="ml-auto w-1 h-1 rounded-full bg-primary"
                    />
                )}
            </div>
        </button>
    );
};

export default function Settings() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="flex flex-col gap-8 pb-20">
            {/* Header / Breadcrumb area */}
            <div className="border-b border-default -mx-6 lg:-mx-12 px-6 lg:px-12 relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <GlassSurface width="100%" height="100%" borderRadius={0} displace={0.5} distortionScale={-40} backgroundOpacity={0.06} opacity={0.93} />
                </div>

                <div className="max-w-screen-2xl mx-auto py-8 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-theme flex items-center justify-center shadow-lg shadow-theme/10">
                            <SettingsIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-primary tracking-tight leading-none uppercase tracking-[0.2em]">Settings</h1>
                            <p className="text-[10px] font-medium text-tertiary mt-1 uppercase tracking-widest">Workspace Orchestration</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full">
                <div className="flex flex-col lg:flex-row gap-16">
                    {/* Sidebar */}
                    <aside className="w-full lg:w-64 shrink-0 space-y-8">
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black text-tertiary uppercase tracking-[0.3em] px-4 mb-4">Configuration</p>
                            {TABS.map(tab => (
                                <TabButton
                                    key={tab.id}
                                    tab={tab}
                                    active={activeTab === tab.id}
                                    onClick={setActiveTab}
                                />
                            ))}
                        </div>

                        {/* Additional Info */}
                        <div className="px-4 py-6 rounded-3xl border border-default relative overflow-hidden lg:mb-0 mb-8">
                            <div className="absolute inset-0 z-0">
                                <GlassSurface width="100%" height="100%" borderRadius={24} displace={0.5} distortionScale={-40} backgroundOpacity={0.06} opacity={0.93} />
                            </div>

                            <div className="flex items-center gap-2 mb-3 relative z-10">
                                <Globe className="w-3.5 h-3.5 text-tertiary" />
                                <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Platform Status</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[11px] font-medium text-secondary">System Operational</span>
                            </div>
                        </div>
                    </aside>

                    {/* Content Area */}
                    <main className="flex-1">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            >
                                {activeTab === 'general' && <GeneralTab />}
                                {activeTab === 'security' && <SecurityTab />}
                                {activeTab === 'notifications' && <NotificationsTab />}
                                {activeTab === 'appearance' && (
                                    <div className="space-y-12">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-default">
                                            <div className="space-y-1">
                                                <h2 className="text-2xl font-black text-primary tracking-tighter uppercase">Appearance <span className="text-theme">Design.</span></h2>
                                                <p className="text-[10px] font-black text-tertiary uppercase tracking-[0.3em]">Personalize your workspace aesthetics</p>
                                            </div>
                                            <div className="flex items-center gap-2 px-4 py-2 bg-theme-bg border border-theme rounded-2xl shadow-theme">
                                                <Palette className="w-4 h-4 text-theme" />
                                                <span className="text-[9px] font-black text-theme uppercase tracking-widest">Active UI</span>
                                            </div>
                                        </div>
                                        <GeneralTab showOnlyAppearance />
                                    </div>
                                )}
                                {activeTab === 'status' && <DangerZoneTab />}
                            </motion.div>
                        </AnimatePresence>
                    </main>
                </div>
            </div>
        </div>
    );
}