import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ShieldAlert, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, api } from '../../store/useAuthStore';

// Glassmorphism Modal Component
const ConfirmModal = ({ isOpen, onClose, onConfirm, actionType, isLoading, deactivationDuration, setDeactivationDuration }) => {
    const [inputValue, setInputValue] = useState('');

    if (!isOpen) return null;

    const isMatch = inputValue === 'CONFIRM';
    const isDeactivate = actionType === 'deactivate';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-rich-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative w-full max-w-md bg-[#12121a]/90 backdrop-blur-md ring-1 ring-white/[0.06] shadow-2xl rounded-2xl p-6 m-4 transform transition-all">
                <h3 className="text-lg font-bold text-white tracking-tight">
                    {isDeactivate ? 'Deactivate Account' : 'Are you absolutely sure?'}
                </h3>

                {isDeactivate ? (
                    <div className="mt-4 space-y-4">
                        <p className="text-[13px] text-gray-400">
                            Your profile will be hidden from the workspace. You can reactivate at any time by logging back in.
                        </p>
                        <div className="space-y-1.5">
                            <label className="block text-[13px] font-semibold text-gray-300">
                                Deactivation Duration
                            </label>
                            <div className="relative">
                                <select
                                    className="block w-full appearance-none px-3.5 py-2.5 border border-white/[0.06] rounded-xl text-[13px] bg-white/[0.02] text-gray-200 focus:bg-white/[0.04] focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none cursor-pointer transition-all duration-200 [&>option]:bg-[#12121a] [&>option]:text-gray-200"
                                    value={deactivationDuration}
                                    onChange={(e) => setDeactivationDuration(e.target.value)}
                                >
                                    <option value="null">Indefinitely</option>
                                    <option value="7">7 Days</option>
                                    <option value="30">30 Days</option>
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-[13px] text-gray-400 mt-2">
                            This action cannot be undone. Please type <strong className="text-gray-200 font-bold select-all">CONFIRM</strong> below to verify.
                        </p>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type CONFIRM"
                            className="mt-4 block w-full px-3.5 py-2.5 border border-white/[0.06] rounded-xl text-[13px] bg-white/[0.02] text-gray-200 placeholder-gray-600 focus:bg-white/[0.04] focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 outline-none transition-all duration-200 shadow-inner shadow-black/20"
                        />
                    </>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2.5 text-[13px] font-semibold text-gray-300 hover:text-white hover:bg-white/[0.04] rounded-xl transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm()}
                        disabled={(actionType === 'delete' && !isMatch) || isLoading}
                        className={`inline-flex items-center justify-center px-4 py-2.5 text-[13px] font-semibold text-white rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${isDeactivate
                            ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
                            : 'bg-red-600 hover:bg-red-500 shadow-red-500/20'
                            }`}
                    >
                        {isLoading ? 'Processing...' : isDeactivate ? 'Confirm Deactivation' : 'Delete Account'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function AccountStatusTab() {
    const navigate = useNavigate();
    const logout = useAuthStore(state => state.logout);

    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        actionType: null // 'deactivate' or 'delete'
    });
    const [deactivationDuration, setDeactivationDuration] = useState('null');

    const closeHandler = () => {
        setModalConfig({ isOpen: false, actionType: null });
        setDeactivationDuration('null');
    };

    // Handle Deactivate Account
    const deactivateMutation = useMutation({
        mutationFn: async (duration) => {
            const body = duration !== 'null' ? { duration } : {};
            const response = await api.put('/settings/deactivate', body);
            return response.data;
        },
        onSuccess: async () => {
            toast.success('Account deactivated successfully.');
            closeHandler();
            await logout();
            navigate('/auth/login', { replace: true });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to deactivate account');
            closeHandler();
        }
    });

    // Handle Delete Account
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const response = await api.delete('/settings/delete');
            return response.data;
        },
        onSuccess: async () => {
            toast.success('Account permanently deleted.');
            closeHandler();
            await logout();
            navigate('/auth/login', { replace: true });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete account');
            closeHandler();
        }
    });

    const handleConfirm = () => {
        if (modalConfig.actionType === 'deactivate') {
            deactivateMutation.mutate(deactivationDuration);
        } else if (modalConfig.actionType === 'delete') {
            deleteMutation.mutate();
        }
    };

    const isLoading = deactivateMutation.isPending || deleteMutation.isPending;

    return (
        <div className="bg-amber-500/[0.02] border border-amber-500/10 -m-6 md:-m-8 p-6 md:p-8 rounded-2xl h-full transition-colors duration-200">
            <ConfirmModal
                isOpen={modalConfig.isOpen}
                onClose={closeHandler}
                onConfirm={handleConfirm}
                actionType={modalConfig.actionType}
                isLoading={isLoading}
                deactivationDuration={deactivationDuration}
                setDeactivationDuration={setDeactivationDuration}
            />

            <div className="mb-6 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h2 className="text-[17px] font-bold text-amber-400 tracking-tight">Account Status</h2>
                    <p className="text-[13px] text-amber-400/70 mt-1 max-w-2xl leading-relaxed">
                        Manage the active status of your profile. Deactivation temporarily suspends your presence, while deletion permanently scrubs all associated data.
                    </p>
                </div>
            </div>

            <div className="border border-white/[0.06] bg-white/[0.01] rounded-xl overflow-hidden divide-y divide-white/[0.06] mt-6">
                {/* Deactivate Option */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-[14px] font-bold text-gray-200 tracking-tight">Deactivate Profile</h3>
                        <p className="text-[13px] text-gray-500 mt-1 max-w-xl">
                            Hide your presence in the workspace without losing your data.
                        </p>
                    </div>
                    <button
                        onClick={() => setModalConfig({ isOpen: true, actionType: 'deactivate' })}
                        className="shrink-0 inline-flex items-center justify-center px-4 py-2 text-[13px] font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-all active:scale-[0.98]"
                    >
                        Deactivate
                    </button>
                </div>

                {/* Delete Option */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-[14px] font-bold text-gray-200 tracking-tight">Permanent Deletion</h3>
                        <p className="text-[13px] text-gray-500 mt-1 max-w-xl">
                            Irreversibly erase your entire account history and remove yourself from all shared projects.
                        </p>
                    </div>
                    <button
                        onClick={() => setModalConfig({ isOpen: true, actionType: 'delete' })}
                        className="shrink-0 inline-flex items-center justify-center px-4 py-2 text-[13px] font-semibold text-white bg-red-600/90 hover:bg-red-500 shadow-lg shadow-red-500/20 rounded-xl transition-all active:scale-[0.98]"
                    >
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
}
