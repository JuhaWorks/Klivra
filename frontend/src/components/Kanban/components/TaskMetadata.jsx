import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronDown, 
    Target, 
    Cpu, 
    ShieldCheck, 
    Briefcase,
    Activity,
    AlertCircle,
    Zap
} from 'lucide-react';

const COHORTS = [
    { 
        id: 'Strategic', 
        label: 'Strategic', 
        icon: Target, 
        color: 'text-indigo-400',
        types: ['Epic', 'Feature', 'Story', 'Research', 'Discovery'] 
    },
    { 
        id: 'Engineering', 
        label: 'Engineering', 
        icon: Cpu, 
        color: 'text-emerald-400',
        types: ['Refactor', 'DevOps', 'Technical Debt', 'QA', 'Performance'] 
    },
    { 
        id: 'Sustainability', 
        label: 'Sustainability', 
        icon: ShieldCheck, 
        color: 'text-rose-400',
        types: ['Bug', 'Security', 'Maintenance', 'Hygiene', 'Compliance'] 
    },
    { 
        id: 'Operations', 
        label: 'Operations', 
        icon: Briefcase, 
        color: 'text-slate-400',
        types: ['Task', 'Support', 'Admin', 'Meeting', 'Review'] 
    }
];

const ExecutiveSelect = ({ label, value, options, onChange, disabled, icon: Icon, isCohort = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="space-y-1.5" ref={containerRef}>
            {label && <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">{label}</label>}
            <div className="relative">
                <button
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.04] active:scale-[0.98]'}
                        ${isOpen ? 'bg-white/[0.06] border-white/20 shadow-lg' : 'bg-white/[0.02] border-white/5'}
                    `}
                >
                    <div className="flex items-center gap-2.5">
                        {Icon && <Icon className="w-3.5 h-3.5 text-theme/60" />}
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">{value}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 4, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute z-[100] min-w-full w-max mt-2 bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl"
                        >
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                                {isCohort ? (
                                    COHORTS.map(cohort => (
                                        <div key={cohort.id} className="space-y-1">
                                            <div className="flex items-center gap-2 px-3 py-2 mt-2 first:mt-0">
                                                <cohort.icon className={`w-3 h-3 ${cohort.color}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${cohort.color}`}>{cohort.label}</span>
                                            </div>
                                            {cohort.types.map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => { onChange(t); setIsOpen(false); }}
                                                    className={`
                                                        w-full text-left px-7 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap
                                                        ${value === t ? 'bg-theme/20 text-theme' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                                    `}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    ))
                                ) : (
                                    options.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => { onChange(opt); setIsOpen(false); }}
                                            className={`
                                                w-full text-left px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap
                                                ${value === opt ? 'bg-theme/20 text-theme' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                            `}
                                        >
                                            {opt}
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const TaskMetadata = ({ 
    status, setStatus, 
    priority, setPriority, 
    type, setType, 
    isAuthorized 
}) => {
    return (
        <div className="grid grid-cols-1 gap-6 p-1 overflow-visible">
            <div className="grid grid-cols-2 gap-4">
                <ExecutiveSelect 
                    label="Status"
                    value={status}
                    options={['Pending', 'In Progress', 'Completed', 'Canceled']}
                    onChange={setStatus}
                    disabled={!isAuthorized}
                    icon={Activity}
                />
                <ExecutiveSelect 
                    label="Priority"
                    value={priority}
                    options={['Low', 'Medium', 'High', 'Urgent']}
                    onChange={setPriority}
                    disabled={!isAuthorized}
                    icon={Zap}
                />
            </div>

            <ExecutiveSelect 
                label="Classification"
                value={type}
                onChange={setType}
                disabled={!isAuthorized}
                isCohort={true}
                icon={Target}
            />
        </div>
    );
};

export default TaskMetadata;
