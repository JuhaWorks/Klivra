import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "Are you sure?", 
    message = "This action cannot be undone.", 
    confirmText = "Confirm", 
    cancelText = "Cancel",
    type = "danger" // 'danger' | 'warning' | 'info'
}) => {
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative z-10 w-full max-w-sm bg-elevated border border-strong rounded-[2.5rem] shadow-huge overflow-hidden p-8 noise flex flex-col items-center text-center"
                    >
                        <div className={cn(
                            "w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-glow-sm",
                            type === 'danger' ? "bg-danger/10 text-danger border border-danger/20" : 
                            type === 'warning' ? "bg-warning/10 text-warning border border-warning/20" :
                            "bg-theme/10 text-theme border border-theme/20"
                        )}>
                            <AlertTriangle className="w-8 h-8" />
                        </div>

                        <h3 className="text-xl font-black text-primary tracking-tighter mb-2">{title}</h3>
                        <p className="text-[13px] font-bold text-tertiary opacity-60 leading-relaxed mb-8">
                            {message}
                        </p>

                        <div className="flex flex-col w-full gap-3">
                            <button
                                onClick={onConfirm}
                                className={cn(
                                    "w-full py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all shadow-lift active:scale-[0.98]",
                                    type === 'danger' ? "bg-danger text-white hover:bg-danger-hover" : 
                                    type === 'warning' ? "bg-warning text-white hover:bg-warning-hover" :
                                    "bg-theme text-white hover:bg-theme-hover"
                                )}
                            >
                                {confirmText}
                            </button>
                            <button
                                onClick={onClose}
                                className="w-full py-4 rounded-2xl text-[12px] font-black text-tertiary uppercase tracking-widest hover:bg-glass transition-all"
                            >
                                {cancelText}
                            </button>
                        </div>

                        <button 
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 text-tertiary hover:text-primary transition-all rounded-full hover:bg-glass"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ConfirmModal;
