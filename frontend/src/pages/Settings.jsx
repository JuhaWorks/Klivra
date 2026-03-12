import React, { useState } from 'react';
import { User, ShieldCheck, ShieldAlert, Settings as SettingsIcon, Zap, ChevronRight } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import GeneralTab from '../components/settings/GeneralTab';
import SecurityTab from '../components/settings/SecurityTab';
import AccountStatusTab from '../components/settings/DangerZoneTab';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


/**
 * Modern 2026 Settings Page
 * High-fidelity orchestration of global preferences with Glassmorphism 2.0
 */
export default function Settings() {
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General', icon: User, color: 'text-cyan-400' },
        { id: 'security', label: 'Security', icon: ShieldCheck, color: 'text-indigo-400' },
        { id: 'danger', label: 'Account Status', icon: ShieldAlert, color: 'text-rose-500' }
    ];

    return (
        <div className="min-h-screen pb-20 pt-8 px-6 lg:px-10 space-y-10 max-w-7xl mx-auto">
            <Toaster position="bottom-right" reverseOrder={false} />

            {/* Cinematic Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-cyan-400 font-black text-[10px] uppercase tracking-[0.4em]">
                        <SettingsIcon className="w-4 h-4" />
                        <span>Global Settings</span>
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-6xl font-black text-theme tracking-tighter leading-none">
                            Settings.
                        </h1>
                        <p className="text-secondary font-medium text-lg max-w-xl">
                            Manage your account settings, security preferences, and general profile information.
                        </p>
                    </div>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-12 items-start">
                {/* Horizontal / Vertical Hybrid Navigation */}
                <aside className="w-full lg:w-72 shrink-0">
                    <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-3 pb-6 lg:pb-0 no-scrollbar">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={twMerge(clsx(
                                    "flex items-center gap-4 px-6 py-4 rounded-2xl transition-all relative group whitespace-nowrap lg:whitespace-normal",
                                    activeTab === tab.id
                                        ? "text-white"
                                        : "text-secondary hover:text-primary"
                                ))}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="settings-tab-bg"
                                        className="absolute inset-0 glass-2 bg-white/5 border border-white/10 rounded-2xl shadow-xl"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                                <tab.icon className={twMerge(clsx(
                                    "w-5 h-5 transition-colors relative z-10",
                                    activeTab === tab.id ? tab.color : "group-hover:text-primary/70"
                                ))} />
                                <span className="font-black text-[10px] uppercase tracking-[0.2em] relative z-10">{tab.label}</span>
                                {activeTab === tab.id && (
                                    <ChevronRight className="ml-auto w-4 h-4 text-tertiary hidden lg:block relative z-10" />
                                )}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-10 hidden lg:block">
                        <div className="glass-2 bg-gradient-to-br from-cyan-500/10 to-transparent border border-white/5 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <Zap className="w-4 h-4 text-cyan-400" />
                                <span className="text-[10px] font-black text-theme uppercase tracking-widest">System Version</span>
                            </div>
                            <p className="text-[11px] text-tertiary font-medium leading-relaxed">
                                Your workspace is up to date with the latest standards.
                            </p>
                        </div>
                    </div>
                </aside>

                {/* Main Dynamic Domain */}
                <main className="flex-1 min-w-0 w-full animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {activeTab === 'general' && <GeneralTab />}
                            {activeTab === 'security' && <SecurityTab />}
                            {activeTab === 'danger' && <AccountStatusTab />}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
