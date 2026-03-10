import React, { useState } from 'react';
import { User, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import GeneralTab from '../components/settings/GeneralTab';
import SecurityTab from '../components/settings/SecurityTab';
import AccountStatusTab from '../components/settings/DangerZoneTab';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="p-5 sm:p-7 lg:p-8 max-w-[1400px] mx-auto space-y-7 font-sans pb-24">
            <Toaster position="bottom-right" reverseOrder={false} />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Settings & Profile</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage your account settings and preferences.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <aside className="w-full md:w-64 shrink-0">
                    <nav className="flex md:flex-col overflow-x-auto md:overflow-visible gap-1 pb-4 md:pb-0 hide-scrollbar">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap md:whitespace-normal font-medium text-[14px] ${activeTab === 'general'
                                ? 'bg-white/[0.04] text-white shadow-sm ring-1 ring-white/[0.06]'
                                : 'text-gray-400 hover:bg-white/[0.02] hover:text-gray-200'
                                }`}
                        >
                            <User className={`w-4 h-4 ${activeTab === 'general' ? 'text-emerald-400' : ''}`} />
                            General Profile
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap md:whitespace-normal font-medium text-[14px] ${activeTab === 'security'
                                ? 'bg-white/[0.04] text-white shadow-sm ring-1 ring-white/[0.06]'
                                : 'text-gray-400 hover:bg-white/[0.02] hover:text-gray-200'
                                }`}
                        >
                            <ShieldCheck className={`w-4 h-4 ${activeTab === 'security' ? 'text-emerald-400' : ''}`} />
                            Security
                        </button>
                        <div className="hidden md:block h-px bg-white/[0.06] my-2 mx-4"></div>
                        <button
                            onClick={() => setActiveTab('danger')}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap md:whitespace-normal font-medium text-[14px] ${activeTab === 'danger'
                                ? 'bg-amber-500/[0.05] text-amber-500 shadow-sm ring-1 ring-amber-500/20'
                                : 'text-amber-500/60 hover:bg-amber-500/[0.02] hover:text-amber-500'
                                }`}
                        >
                            <ShieldAlert className="w-4 h-4" />
                            Account Status
                        </button>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 bg-[#12121a]/50 md:bg-transparent rounded-2xl md:rounded-none ring-1 ring-white/[0.06] md:ring-0 p-6 md:p-0 min-h-[500px]">
                    {activeTab === 'general' && <GeneralTab />}
                    {activeTab === 'security' && <SecurityTab />}
                    {activeTab === 'danger' && <AccountStatusTab />}
                </div>
            </div>
        </div>
    );
}
