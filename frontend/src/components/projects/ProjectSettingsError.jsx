import React from 'react';
import { Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProjectSettingsError = ({ title, description, icon: Icon = Lock }) => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
            <div className="p-12 text-center bg-zinc-950/50 border border-white/5 rounded-[40px] max-w-2xl mx-auto backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                {/* Decorative background glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/10 blur-[100px] group-hover:bg-emerald-600/20 transition-all duration-700" />

                <div className="relative space-y-6">
                    <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                        <Icon className="w-10 h-10 text-emerald-400" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-white tracking-tighter">
                            {title}
                        </h2>
                        <p className="text-zinc-500 font-medium leading-relaxed max-w-sm mx-auto">
                            {description}
                        </p>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={() => navigate('/projects')}
                            className="group flex items-center gap-3 px-8 py-3.5 bg-white text-zinc-950 font-black rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5 mx-auto"
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectSettingsError;
