import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Shield, Bell, Palette, AlertCircle, 
    Settings as SettingsIcon, ChevronRight, Globe, 
    Smartphone, History, Activity, CreditCard
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useTheme } from '../store/useTheme';

// Import real components
import GeneralTab from '../components/settings/GeneralTab';
import SecurityTab from '../components/settings/SecurityTab';
import NotificationsTab from '../components/settings/NotificationsTab';
import DangerZoneTab from '../components/settings/DangerZoneTab';

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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                active 
                ? 'bg-white dark:bg-white/10 shadow-sm border border-zinc-200 dark:border-white/10' 
                : 'hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent'
            }`}
        >
            <div className={`p-1.5 rounded-lg transition-colors ${
                active ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white'
            }`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <span className={`text-xs font-semibold uppercase tracking-widest ${
                active ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200'
            }`}>
                {tab.label}
            </span>
            {active && (
                <motion.div 
                    layoutId="active-pill"
                    className="ml-auto w-1 h-1 rounded-full bg-zinc-900 dark:bg-white"
                />
            )}
        </button>
    );
};

export default function Settings() {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="flex flex-col gap-8 pb-20">
            {/* Header / Breadcrumb area */}
            <div className="border-b border-default bg-surface/50 backdrop-blur-xl -mx-6 lg:-mx-12 px-6 lg:px-12">
                <div className="max-w-screen-2xl mx-auto py-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-theme flex items-center justify-center shadow-lg shadow-theme/10">
                            <SettingsIcon className="w-5 h-5 text-white" />
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
                            <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.3em] px-4 mb-4">Configuration</p>
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
                        <div className="px-4 py-6 rounded-3xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5">
                            <div className="flex items-center gap-2 mb-3">
                                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Platform Status</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">v4.2.1 Stable</span>
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
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-white/5">
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