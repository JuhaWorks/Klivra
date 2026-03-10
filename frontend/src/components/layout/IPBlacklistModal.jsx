import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const IPBlacklistModal = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [ipInput, setIpInput] = useState('');

    // Fetch Blocked IPs
    const { data: blockedIpsData, isLoading } = useQuery({
        queryKey: ['blockedIps'],
        queryFn: async () => {
            const res = await api.get('/admin/system/blocked-ips');
            return res.data;
        },
        enabled: isOpen,
    });

    const blockedIps = useMemo(() => blockedIpsData?.data || [], [blockedIpsData]);

    // Mutation to update blocked IPs
    const updateIpsMutation = useMutation({
        mutationFn: async (newIps) => {
            const res = await api.put('/admin/system/blocked-ips', { ips: newIps });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['blockedIps'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update IP blacklist');
        }
    });

    const handleBlockIp = () => {
        const trimmedIp = ipInput.trim();
        if (!trimmedIp) return;

        // Basic IPv4 extraction/validation (very rudimentary for UI sake)
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (!ipRegex.test(trimmedIp)) {
            return toast.error('Please enter a valid IPv4 address.');
        }

        if (blockedIps.includes(trimmedIp)) {
            return toast.error('This IP is already blacklisted.');
        }

        const newIps = [...blockedIps, trimmedIp];
        updateIpsMutation.mutate(newIps, {
            onSuccess: () => {
                toast.success('IP Address blocked successfully.');
                setIpInput('');
            }
        });
    };

    const handleUnblockIp = (ipToUnblock) => {
        const newIps = blockedIps.filter(ip => ip !== ipToUnblock);
        updateIpsMutation.mutate(newIps, {
            onSuccess: () => {
                toast.success('IP Address unblocked.');
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0f0f15] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white tracking-tight">IP Firewall</h3>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Manage Network Access Restrictions</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6 flex flex-col custom-scrollbar">
                    
                    {/* Add IP Form */}
                    <div className="space-y-2 flex-shrink-0">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Block New IP Address</label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="e.g. 192.168.1.100"
                                value={ipInput}
                                onChange={(e) => setIpInput(e.target.value)}
                                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-gray-600 font-mono"
                                onKeyDown={(e) => e.key === 'Enter' && handleBlockIp()}
                            />
                            <button
                                onClick={handleBlockIp}
                                disabled={updateIpsMutation.isPending || !ipInput.trim()}
                                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 disabled:text-emerald-900/50 text-black rounded-xl text-[11px] uppercase tracking-widest font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                            >
                                Block
                            </button>
                        </div>
                    </div>

                    <hr className="border-white/5" />

                    {/* Blocked IPs List */}
                    <div className="flex-1 min-h-[200px] flex flex-col">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-3">Currently Blocked Integrations ({blockedIps.length})</label>
                        
                        <div className="flex-1 bg-black/20 border border-white/5 rounded-2xl overflow-hidden shadow-inner">
                            {isLoading ? (
                                <div className="p-8 flex justify-center opacity-50">
                                    <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                                </div>
                            ) : blockedIps.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center justify-center h-full opacity-60">
                                    <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">No IPs Restricted</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-white/5 h-full overflow-y-auto custom-scrollbar">
                                    {blockedIps.map((ip) => (
                                        <li key={ip} className="group flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                                <code className="text-sm text-gray-300 font-mono">{ip}</code>
                                            </div>
                                            <button
                                                onClick={() => handleUnblockIp(ip)}
                                                disabled={updateIpsMutation.isPending}
                                                className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all focus:opacity-100"
                                            >
                                                Revoke
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
};

export default IPBlacklistModal;
