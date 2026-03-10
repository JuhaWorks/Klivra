import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, api } from '../store/useAuthStore';
import { Navigate, Link } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [maintenanceEndTime, setMaintenanceEndTime] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Secure the Route: If not Admin, bounce immediately
    if (user?.role !== 'Admin') {
        return <Navigate to="/" replace />;
    }

    // 0. Fetch Global Stats
    const { data: statsRes } = useQuery({
        queryKey: ['adminStats'],
        queryFn: async () => (await api.get('/admin/stats')).data,
    });
    const stats = statsRes?.data || { users: { total: 0, active: 0, banned: 0 }, projects: { total: 0 } };

    // 1. Fetch Users
    const { data: usersData, isLoading } = useQuery({
        queryKey: ['adminUsers', page, search],
        queryFn: async () => {
            const res = await api.get(`/admin/users?page=${page}&limit=10&search=${search}`);
            return res.data;
        },
        keepPreviousData: true, // Smooth pagination UI
    });

    const users = usersData?.data || [];
    const meta = usersData?.meta || { page: 1, pages: 1, total: 0 };

    // 2. Role Update Mutation
    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, newRole }) => {
            const res = await api.put(`/admin/users/${id}/role`, { role: newRole });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(`Role updated to ${data.data.role} successfully`);
            queryClient.invalidateQueries(['adminUsers']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update role');
        }
    });

    // 3. Ban Toggle Mutation
    const toggleBanMutation = useMutation({
        mutationFn: async (id) => {
            const res = await api.put(`/admin/users/${id}/ban`);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries(['adminUsers']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update ban status');
        }
    });

    // 4. System Maintenance Toggle
    const toggleMaintenanceMutation = useMutation({
        mutationFn: async ({ enabled, endTime }) => (await api.put('/admin/system/maintenance', { enabled, endTime })).data,
        onSuccess: (data) => {
            const isEnabled = data.data.value.enabled;
            toast.success(isEnabled ? `Maintenance Enabled until ${new Date(data.data.value.endTime).toLocaleString()}` : 'Maintenance Mode Disabled');
            queryClient.invalidateQueries(['adminStats']);
        },
    });

    const isMaintenanceMode = stats.system?.status === 'Maintenance';

    // Sub-component: Maintenance Modal
    const MaintenanceModal = () => {
        if (!isModalOpen) return null;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-[#0f0f15] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">System Maintenance</h3>
                                <p className="text-xs text-gray-500">Configure scheduled downtime for all users.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Expected Completion Time</label>
                            <input
                                type="datetime-local"
                                value={maintenanceEndTime}
                                onChange={(e) => setMaintenanceEndTime(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            />
                            <p className="text-[10px] text-emerald-500/60 px-1 italic">Users will see this time on the maintenance screen.</p>
                        </div>

                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                            <p className="text-xs text-emerald-300/80 leading-relaxed">
                                <strong>Warning:</strong> Enabling maintenance mode will immediately block access for all non-admin users. You will retain full access.
                            </p>
                        </div>
                    </div>

                    <div className="p-6 bg-black/20 flex gap-3">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (!maintenanceEndTime) return toast.error('Please set an completion time');
                                toggleMaintenanceMutation.mutate({ enabled: true, endTime: maintenanceEndTime });
                                setIsModalOpen(false);
                            }}
                            className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            Start Maintenance
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Sub-component: Status Badge
    const StatusBadge = ({ user: u }) => {
        if (u.isBanned) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                    Banned
                </span>
            );
        }
        if (!u.isActive) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-500/10 text-gray-400 border border-gray-500/20">
                    Deactivated
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active
            </span>
        );
    };

    // Sub-component: Role Badge
    const RoleBadge = ({ role }) => {
        const styles = {
            Admin: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            Manager: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            Developer: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
        };
        return (
            <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${styles[role] || styles['Developer']}`}>
                {role}
            </span>
        );
    };

    return (
        <div className="p-5 sm:p-7 lg:p-8 max-w-[1400px] mx-auto space-y-7">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        Security & Access Control
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage user roles, permissions, and platform security flags.</p>
                </div>

                {/* Security Actions */}
                <div className="flex items-center gap-4">
                    {isMaintenanceMode && stats.system?.endTime && (
                        <div className="hidden md:flex flex-col items-end px-4 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                            <span className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest">End Time</span>
                            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-tighter">
                                {new Date(stats.system.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                    <Link to="/admin/security" className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-500/20 transition-all">
                        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Neural Feed
                    </Link>
                    <button
                        onClick={() => {
                            if (isMaintenanceMode) {
                                toggleMaintenanceMutation.mutate({ enabled: false });
                            } else {
                                setIsModalOpen(true);
                            }
                        }}
                        className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-300 shadow-xl ${isMaintenanceMode
                            ? 'bg-emerald-500 text-black border-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <svg className={`w-4.5 h-4.5 ${isMaintenanceMode ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {isMaintenanceMode ? 'Lock Protocol: OFF' : 'Schedule Lock'}
                    </button>
                </div>
            </div>

            {/* Platform Stats Overlays */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border border-white/[0.06] rounded-3xl p-7 backdrop-blur-sm shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-25 transition-all group-hover:scale-110 duration-500">
                        <svg className="w-14 h-14 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-0.5">Total Registry</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black text-white">{stats.users.total}</h3>
                        <span className="text-xs text-emerald-400/60 font-medium">Nodes</span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-4 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></span>
                        Synchronized with master database
                    </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent border border-white/[0.06] rounded-3xl p-7 backdrop-blur-sm shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-25 transition-all group-hover:scale-110 duration-500">
                        <svg className="w-14 h-14 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-0.5">Active Nodes</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black text-white">{stats.users.active}</h3>
                        <span className="text-xs text-emerald-400/60 font-medium">Verified</span>
                    </div>
                    <p className="text-[10px] text-emerald-500/50 mt-4 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        All systems operational
                    </p>
                </div>

                <div className="bg-gradient-to-br from-rose-500/10 via-transparent to-transparent border border-white/[0.06] rounded-3xl p-7 backdrop-blur-sm shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-25 transition-all group-hover:scale-110 duration-500">
                        <svg className="w-14 h-14 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    </div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-0.5">Blacklisted</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black text-rose-500">{stats.users.banned}</h3>
                        <span className="text-xs text-rose-400/60 font-medium">Banned</span>
                    </div>
                    <p className="text-[10px] text-rose-500/40 mt-4 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500/50"></span>
                        Restricted from platform access
                    </p>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2rem] overflow-hidden backdrop-blur-sm shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-white/[0.01] border-b border-white/[0.04]">
                                <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Identity Node</th>
                                <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Access Level</th>
                                <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Status</th>
                                <th scope="col" className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Registry Date</th>
                                <th scope="col" className="relative px-8 py-5"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="inline-flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-sm text-gray-500 font-medium">
                                        No neural signatures matched your query.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u._id} className="hover:bg-white/[0.01] transition-all group">
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 relative">
                                                    <img className="h-11 w-11 rounded-2xl object-cover ring-2 ring-white/5 group-hover:ring-emerald-500/40 transition-all duration-300" src={u.avatar} alt="" />
                                                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0f] ${u.isActive ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-gray-100 group-hover:text-emerald-400 transition-colors">{u.name}</div>
                                                    <div className="text-[11px] text-gray-500 font-medium">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <RoleBadge role={u.role} />
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <StatusBadge user={u} />
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap text-xs text-gray-500 font-mono">
                                            {new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                                            <DropdownMenu.Root>
                                                <DropdownMenu.Trigger asChild>
                                                    <button className="p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                                                        <svg className="w-5 h-5 opacity-40 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                                    </button>
                                                </DropdownMenu.Trigger>
                                                <DropdownMenu.Portal>
                                                    <DropdownMenu.Content className="w-48 bg-zinc-900 border border-zinc-700/50 rounded-xl p-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2" sideOffset={5} align="end">

                                                        <DropdownMenu.Label className="px-3 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Access Control</DropdownMenu.Label>
                                                        {['Admin', 'Manager', 'Developer'].map(r => (
                                                            <DropdownMenu.Item
                                                                key={r}
                                                                disabled={u.role === r}
                                                                onSelect={() => updateRoleMutation.mutate({ id: u._id, newRole: r })}
                                                                className={`flex items-center px-3 py-2.5 text-xs font-bold rounded-xl cursor-pointer outline-none transition-all
                                                                ${u.role === r ? 'opacity-30 cursor-not-allowed text-gray-500' : 'text-gray-300 hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white'}`}
                                                            >
                                                                <div className="w-1.5 h-1.5 rounded-full bg-current mr-2.5 opacity-40"></div>
                                                                Authorize as {r}
                                                            </DropdownMenu.Item>
                                                        ))}

                                                        <DropdownMenu.Separator className="h-px bg-zinc-800 my-1 -mx-1" />

                                                        {/* Danger Zone */}
                                                        <DropdownMenu.Label className="px-2 py-1.5 text-[10px] font-semibold text-red-500 uppercase tracking-wider">Danger Zone</DropdownMenu.Label>
                                                        <DropdownMenu.Item
                                                            disabled={u._id === user._id}
                                                            onSelect={(e) => {
                                                                e.preventDefault(); // Prevent direct action, require confirmation naturally
                                                                if (window.confirm(`Are you absolutely sure you want to ${u.isBanned ? 'UNBAN' : 'BAN'} ${u.name}?`)) {
                                                                    toggleBanMutation.mutate(u._id);
                                                                }
                                                            }}
                                                            className={`flex items-center px-2 py-2 text-xs rounded-md cursor-pointer outline-none transition-colors 
                                                            ${u._id === user._id ? 'opacity-50 cursor-not-allowed' : 'text-red-400 focus:bg-red-500 focus:text-white'}`}
                                                        >
                                                            {u.isBanned ? 'Unban User' : 'Ban User'}
                                                        </DropdownMenu.Item>

                                                    </DropdownMenu.Content>
                                                </DropdownMenu.Portal>
                                            </DropdownMenu.Root>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!isLoading && meta.pages > 1 && (
                    <div className="bg-black/20 px-6 py-4 flex items-center justify-between border-t border-white/[0.06]">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="relative inline-flex items-center px-4 py-2 border border-white/10 text-sm font-medium rounded-md text-gray-300 bg-white/5 hover:bg-white/10 disabled:opacity-50">Previous</button>
                            <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-white/10 text-sm font-medium rounded-md text-gray-300 bg-white/5 hover:bg-white/10 disabled:opacity-50">Next</button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                    Displaying <span className="text-gray-200">{(page - 1) * 10 + 1}</span> — <span className="text-gray-200">{Math.min(page * 10, meta.total)}</span> / <span className="text-emerald-400">{meta.total}</span> Nodes found
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="relative inline-flex items-center px-3 py-2 rounded-l-xl border border-white/10 bg-white/5 text-sm font-medium text-gray-400 hover:bg-white/10 disabled:opacity-30 transition-all">
                                        <span className="sr-only">Previous</span>
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages} className="relative inline-flex items-center px-3 py-2 rounded-r-xl border border-white/10 bg-white/5 text-sm font-medium text-gray-400 hover:bg-white/10 disabled:opacity-30 transition-all">
                                        <span className="sr-only">Next</span>
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <MaintenanceModal />
        </div>
    );
};

export default AdminDashboard;
