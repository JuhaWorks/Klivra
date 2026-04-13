import React from 'react';

const TaskMetadata = ({ 
    status, setStatus, 
    priority, setPriority, 
    type, setType, 
    isAuthorized 
}) => {
    return (
        <div className="space-y-4 bg-white/[0.01] border border-white/5 p-4 rounded-2xl shadow-2xl">
            <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1.5">Status & Type</label>
                <div className="grid grid-cols-1 gap-1.5">
                    <select 
                        value={status} 
                        onChange={(e) => setStatus(e.target.value)} 
                        disabled={!isAuthorized} 
                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white font-black text-[8px] uppercase outline-none appearance-none hover:bg-white/10 transition-all cursor-pointer"
                    >
                        {['Pending', 'In Progress', 'Completed', 'Canceled'].map(s => <option key={s} value={s} className="bg-[#0c0c0e]">{s}</option>)}
                    </select>
                    <select 
                        value={type} 
                        onChange={(e) => setType(e.target.value)} 
                        disabled={!isAuthorized} 
                        className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white font-black text-[8px] uppercase outline-none appearance-none hover:bg-white/10 transition-all cursor-pointer"
                    >
                        {['Task', 'Bug', 'Feature', 'Maintenance'].map(t => <option key={t} value={t} className="bg-[#0c0c0e]">{t}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1.5">Task Priority</label>
                <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value)} 
                    disabled={!isAuthorized} 
                    className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white font-black text-[8px] uppercase outline-none appearance-none hover:bg-white/10 transition-all cursor-pointer"
                >
                    {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p} value={p} className="bg-[#0c0c0e]">{p}</option>)}
                </select>
            </div>
        </div>
    );
};

export default TaskMetadata;
