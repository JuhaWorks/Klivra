import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// ─── Config ──────────────────────────────────────────────────────────────────
export const API_BASE = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
    : '';

const WORDS = ['extraordinary products.', 'the future, together.', 'what matters most.'];
const FEATURES = [['⚡', 'Real-time Sync'], ['◫', 'Kanban Boards'], ['◻', 'Whiteboards'], ['⬡', 'E2E Encrypted']];
const TEAM = ['AJ', 'KL', 'MP', 'SR'];

// ─── Styles ──────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

:root{
  --a:#10b981; --a2:#34d399;
  --bg:#050505; --surface:#0a0a0c;
  --b:rgba(255,255,255,.06); --bh:rgba(255,255,255,.1); --bf:rgba(16,185,129,.42);
  --t1:#f3f4f6; --t2:#9ca3af; --t3:#4b5563;
  --card:rgba(7,8,16,.95);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--t1);font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.serif{font-family:'Instrument Serif',Georgia,serif}
.auth-layout, .auth-layout * { cursor: none !important; }

/* cursor */
#cur{
  position:fixed;z-index:9999;pointer-events:none;
  width:5px;height:5px;border-radius:50%;
  background:rgba(255,255,255,.92);
  will-change:transform;
  transition:width .1s,height .1s,border-radius .1s,opacity .1s;
}
#cur.h{width:11px;height:11px}
#cur.t{width:2px;height:15px;border-radius:1px}
#cur.p{opacity:.4;width:3px;height:3px}

/* page anims & auth anims */
@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes si{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes drift{0%,100%{transform:translate(0,0)}40%{transform:translate(18px,-12px)}75%{transform:translate(-10px,8px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes borderspin{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes shimmer{from{background-position:-300% center}to{background-position:300% center}}
@keyframes oauthglow{from{opacity:0}to{opacity:1}}
@keyframes grow{from{width:0}to{width:100%}}

.au{animation:up .42s cubic-bezier(.22,1,.36,1) both}
.as{animation:si .4s cubic-bezier(.22,1,.36,1) both}
.d1{animation-delay:.07s}.d2{animation-delay:.14s}.d3{animation-delay:.21s}
.d4{animation-delay:.28s}.d5{animation-delay:.35s}.d6{animation-delay:.42s}.d7{animation-delay:.49s}

/* card border */
.cb{
  border-radius:16px;padding:1px;
  background:linear-gradient(135deg,rgba(16,185,129,.15),rgba(255,255,255,.04),rgba(16,185,129,.08));
  background-size:300% 300%;
  animation:borderspin 8s ease infinite;
}
.cb:focus-within{
  background:linear-gradient(135deg,rgba(16,185,129,.26),rgba(255,255,255,.05),rgba(16,185,129,.16));
  background-size:300% 300%;
  animation:borderspin 4s ease infinite;
}

/* inputs */
.inp{width:100%;padding:10px 14px;border-radius:9px;background:rgba(255,255,255,.024);border:1px solid var(--b);color:var(--t1);font-family:'DM Sans',system-ui,sans-serif;font-size:13.5px;outline:none;transition:border-color .16s,box-shadow .16s,background .16s}
.inp::placeholder{color:var(--t3)}
.inp:hover{border-color:var(--bh);background:rgba(255,255,255,.03)}
.inp:focus{border-color:var(--bf);box-shadow:0 0 0 3px rgba(16,185,129,.09);background:rgba(16,185,129,.026)}
.inp.r{padding-right:40px}
.inp.e{border-color:rgba(248,113,113,.32)}
.inp.e:focus{border-color:rgba(248,113,113,.52);box-shadow:0 0 0 3px rgba(248,113,113,.08)}

/* submit */
.sbtn{
  width:100%;padding:11px;border-radius:9px;border:none;
  font-family:'DM Sans',system-ui,sans-serif;font-size:13.5px;font-weight:600;
  display:flex;align-items:center;justify-content:center;gap:7px;
  position:relative;overflow:hidden;
  background:linear-gradient(110deg,#059669,var(--a),var(--a2));
  color:#fff;box-shadow:0 4px 18px rgba(16,185,129,.2);
  transition:opacity .12s,transform .12s cubic-bezier(.34,1.56,.64,1),box-shadow .14s;
}
.sbtn::before{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 25%,rgba(255,255,255,.09) 50%,transparent 75%);background-size:300%;opacity:0;transition:opacity .2s}
.sbtn:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 7px 24px rgba(16,185,129,.28)}
.sbtn:hover::before{opacity:1;animation:shimmer 1.5s linear infinite}
.sbtn:active{transform:scale(.98)}
.sbtn:disabled{background:rgba(255,255,255,.04);color:var(--t3);border:1px solid var(--b);box-shadow:none}
.sbtn:disabled::before{display:none}

/* oauth — glow on hover */
.obtn{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:10px 14px;border-radius:9px;
  font-family:'DM Sans',system-ui,sans-serif;font-size:13px;font-weight:500;
  text-decoration:none;position:relative;overflow:hidden;
  transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s,background .14s;
}
.obtn::after{
  content:'';position:absolute;inset:0;border-radius:9px;
  opacity:0;transition:opacity .2s;
}
.og{background:rgba(255,255,255,.91);color:#1a1d2e}
.og::after{box-shadow:inset 0 0 0 1px rgba(16,185,129,.3),0 0 20px rgba(16,185,129,.12),0 0 40px rgba(16,185,129,.06)}
.og:hover{background:#fff;transform:translateY(-2px)}
.og:hover::after{opacity:1}
.gh{background:#0d1117;color:#c9d1d9;border:1px solid rgba(255,255,255,.07)}
.gh::after{box-shadow:inset 0 0 0 1px rgba(52,211,153,.28),0 0 20px rgba(16,185,129,.14),0 0 40px rgba(16,185,129,.06)}
.gh:hover{background:#161b22;transform:translateY(-2px)}
.gh:hover::after{opacity:1}

/* misc */
.ib{padding:6px;border-radius:7px;border:none;background:transparent;color:var(--t2);display:flex;align-items:center;justify-content:center;transition:color .12s,background .12s,transform .14s cubic-bezier(.34,1.56,.64,1)}
.ib:hover{color:#8090c0;background:rgba(255,255,255,.05);transform:scale(1.08)}
.chip{display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:9px;background:rgba(255,255,255,.018);border:1px solid var(--b);transition:border-color .16s,background .16s,transform .18s cubic-bezier(.34,1.56,.64,1)}
.chip:hover{border-color:rgba(16,185,129,.22);background:rgba(16,185,129,.044);transform:translateY(-2px)}
.tw{display:inline-block;width:2px;height:.8em;background:var(--a);margin-left:1px;border-radius:1px;animation:blink .9s step-end infinite;vertical-align:text-bottom}
.sdot{width:5px;height:5px;border-radius:50%;background:#34d399;box-shadow:0 0 5px #34d399;animation:blink 2.2s ease infinite}
.sp{width:13px;height:13px;border-radius:50%;border:2px solid rgba(255,255,255,.18);border-top-color:#fff;animation:spin .6s linear infinite;flex-shrink:0}
.sbar{flex:1;height:2px;border-radius:2px;background:var(--b);transition:background .22s}
.sbar.w{background:#f87171}.sbar.f{background:#fb923c}.sbar.g{background:#facc15}.sbar.s{background:#34d399;box-shadow:0 0 5px rgba(52,211,153,.26)}.sbar.x{background:#6ee7b7;box-shadow:0 0 6px rgba(110,231,183,.3)}
.ferr{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:500;color:#f08090;animation:up .12s ease both}
.ebanner{display:flex;align-items:flex-start;gap:9px;padding:10px 13px;border-radius:10px;background:rgba(248,113,113,.05);border:1px solid rgba(248,113,113,.14);color:#fca5a5;animation:up .18s ease both}
.lnk{color:var(--a2);font-weight:500;text-decoration:none;position:relative;transition:color .12s}
.lnk::after{content:'';position:absolute;bottom:-1px;left:0;width:0;height:1px;background:var(--a2);transition:width .15s}
.lnk:hover{color:#6ee7b7}.lnk:hover::after{width:100%}
.cbox{width:15px;height:15px;border-radius:4px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.025);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .16s cubic-bezier(.34,1.56,.64,1)}
.cbox.on{border-color:var(--a);background:rgba(16,185,129,.14);box-shadow:0 0 0 3px rgba(16,185,129,.07)}
.mbg{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(10px);z-index:50;animation:up .16s ease both}
.mbox{position:relative;z-index:51;width:100%;max-width:334px;background:linear-gradient(155deg,#0a0a0a,#000000);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:24px;box-shadow:0 28px 70px rgba(0,0,0,.5);animation:up .26s cubic-bezier(.22,1,.36,1) both}
.noise{position:fixed;inset:0;z-index:1;pointer-events:none;opacity:.017;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:160px}

/* success screen progress */
.prog-track{width:120px;height:2px;border-radius:2px;background:rgba(255,255,255,.06);overflow:hidden;margin:0 auto}
.prog-bar{height:100%;background:linear-gradient(90deg,#059669,#10b981,#34d399);border-radius:2px;animation:grow 1.5s linear forwards}
`;

export const useStyles = () => useEffect(() => {
    let el = document.getElementById('klv-auth-css');
    if (!el) {
        el = Object.assign(document.createElement('style'), { id: 'klv-auth-css', textContent: CSS });
        document.head.appendChild(el);
    }
    return () => { }; // Never clean up to avoid flashing during navigation between login/register
}, []);

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useTypewriter(spd = 68, pause = 2000) {
    const [st, set] = useState({ wi: 0, ci: 0, del: false, txt: '' });
    useEffect(() => {
        const word = WORDS[st.wi];
        const delay = st.del ? spd / 2 : st.ci === word.length ? pause : spd;
        const t = setTimeout(() => {
            if (!st.del && st.ci < word.length) return set(s => ({ ...s, ci: s.ci + 1, txt: word.slice(0, s.ci + 1) }));
            if (!st.del) return set(s => ({ ...s, del: true }));
            if (st.ci > 0) return set(s => ({ ...s, ci: s.ci - 1, txt: word.slice(0, s.ci - 1) }));
            set(s => ({ ...s, del: false, wi: (s.wi + 1) % WORDS.length, ci: 0 }));
        }, delay);
        return () => clearTimeout(t);
    }, [st, spd, pause]);
    return st.txt;
}

export function useCursor() {
    useEffect(() => {
        const el = document.getElementById('cur');
        if (!el) return;
        const mv = ({ clientX: x, clientY: y }) => { el.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; };
        const md = () => el.classList.add('p');
        const mu = () => el.classList.remove('p');
        document.addEventListener('mousemove', mv, { passive: true });
        document.addEventListener('mousedown', md);
        document.addEventListener('mouseup', mu);
        const bind = () => {
            document.querySelectorAll('a,button').forEach(n => {
                n.addEventListener('mouseenter', () => el.classList.add('h'));
                n.addEventListener('mouseleave', () => el.classList.remove('h'));
            });
            document.querySelectorAll('input').forEach(n => {
                n.addEventListener('mouseenter', () => el.classList.add('t'));
                n.addEventListener('mouseleave', () => el.classList.remove('t'));
            });
        };
        setTimeout(bind, 200);
        return () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mousedown', md); document.removeEventListener('mouseup', mu); };
    }, []);
}

// ─── Utils ────────────────────────────────────────────────────────────────────
export const pwStr = pw => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++; if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
};
export const STR = [null, { l: 'Weak', c: '#f87171', k: 'w' }, { l: 'Fair', c: '#fb923c', k: 'f' }, { l: 'Good', c: '#facc15', k: 'g' }, { l: 'Strong', c: '#34d399', k: 's' }, { l: 'Excellent', c: '#6ee7b7', k: 'x' }];

// ─── Shared Components ───────────────────────────────────────────────────────
export const Ico = ({ d, size = 14, sw = 2, stroke = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d={d} /></svg>
);
export const EyeIco = ({ open }) => open
    ? <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
    : <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;

export const GoogleSVG = () => (
    <svg width="14" height="14" viewBox="0 0 24 24">
        <g transform="matrix(1,0,0,1,27.009,-39.239)">
            <path fill="#4285F4" d="M-3.264 51.509c0-.79-.07-1.54-.19-2.27H-14.754v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
            <path fill="#34A853" d="M-14.754 63.239c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96l-3.98 3.09c1.97 3.92 6.02 6.62 10.71 6.62z" />
            <path fill="#FBBC05" d="M-21.484 53.529c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.28v-3.09h-3.98c-.82 1.62-1.29 3.44-1.29 5.37s.47 3.75 1.29 5.37l3.98-3.08z" />
            <path fill="#EA4335" d="M-14.754 43.989c1.77 0 3.35.61 4.6 1.8l3.42-3.42c-2.07-1.94-4.78-3.13-8.02-3.13-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
        </g>
    </svg>
);
export const GithubSVG = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
);

export const Logo = ({ size = 36 }) => (
    <div className="serif flex items-center justify-center text-white flex-shrink-0"
        style={{ width: size, height: size, borderRadius: size * .3, background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 16px rgba(16,185,129,.22)', fontSize: size * .44 }}>K</div>
);

export const StrBars = ({ value }) => {
    const s = pwStr(value), m = STR[Math.min(s, 5)];
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex gap-1">{[1, 2, 3, 4, 5].map(i => <div key={i} className={`sbar${i <= s && m ? ` ${m.k}` : ''}`} />)}</div>
            {m && <span style={{ fontSize: 10, fontWeight: 600, color: m.c }}>{m.l}</span>}
        </div>
    );
};

export const Field = ({ id, label, type = 'text', placeholder, reg, error, autoComplete, right, delay = '', showStr, strVal }) => (
    <div className={`flex flex-col gap-1.5 au ${delay}`}>
        <label htmlFor={id} className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--t2)' }}>{label}</label>
        <div className="relative">
            <input id={id} type={type} autoComplete={autoComplete} placeholder={placeholder} aria-invalid={!!error} {...reg}
                className={`inp${right ? ' r' : ''}${error ? ' e' : ''}`} />
            {right && <div className="absolute right-2.5 top-1/2 -translate-y-1/2">{right}</div>}
        </div>
        {showStr && strVal?.length > 0 && <StrBars value={strVal} />}
        {error && <p className="ferr"><Ico d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01" size={11} />{error.message}</p>}
    </div>
);

// ─── Brand Panel ─────────────────────────────────────────────────────────────
export function Brand({ rightSide }) {
    const typed = useTypewriter();
    return (
        <aside className="hidden lg:flex flex-col justify-between w-[42%] min-h-screen p-14 relative overflow-hidden"
            style={{ background: 'var(--surface)', borderRight: rightSide ? 'none' : '1px solid var(--b)', borderLeft: rightSide ? '1px solid var(--b)' : 'none' }}>

            <div style={{ position: 'absolute', width: 400, height: 400, top: -90, [rightSide ? 'right' : 'left']: -70, border: 'none', background: 'radial-gradient(circle at center, rgba(16,185,129,.08) 0%, transparent 60%)', animation: 'drift 22s ease-in-out infinite', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 240, height: 240, bottom: 20, [rightSide ? 'left' : 'right']: -50, border: 'none', background: 'radial-gradient(circle at center, rgba(16,185,129,.05) 0%, transparent 60%)', animation: 'drift 27s ease-in-out -9s infinite', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, opacity: .016, backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%,black,transparent)' }} />

            <header className="flex items-center gap-3 as relative z-10">
                <Logo size={36} />
                <div>
                    <div className="serif text-[16px] tracking-tight" style={{ color: 'var(--t1)' }}>Klivra</div>
                    <div className="text-[9px] uppercase tracking-[.14em] font-semibold" style={{ color: 'var(--t3)' }}>Enterprise</div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9.5px] font-semibold uppercase tracking-wider"
                    style={{ background: 'rgba(52,211,153,.05)', border: '1px solid rgba(52,211,153,.11)', color: '#5eead4' }}>
                    <div className="sdot" />All systems go
                </div>
            </header>

            <div className="flex flex-col relative z-10">
                <p className="au d1 text-[10px] uppercase tracking-[.2em] font-semibold mb-5" style={{ color: 'var(--a)' }}>
                    Enterprise Collaboration
                </p>
                <h2 className="au d2 serif leading-[1.1] tracking-tight mb-5"
                    style={{ fontSize: 'clamp(1.7rem,2.5vw,2.3rem)', color: 'var(--t1)' }}>
                    Build great things,<br />
                    <span style={{ background: 'linear-gradient(120deg,#34d399,#059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        {typed}<span className="tw" />
                    </span>
                </h2>
                <p className="au d3 text-[13px] leading-[1.75] mb-7 max-w-[255px]" style={{ color: 'var(--t2)' }}>
                    Real-time collaboration for teams that move fast and ship with confidence.
                </p>

                <div className="grid grid-cols-2 gap-2 mb-8">
                    {FEATURES.map(([icon, label], i) => (
                        <div key={label} className={`chip au d${i + 3}`}>
                            <div className="w-[25px] h-[25px] rounded-[7px] flex items-center justify-center text-[11px] flex-shrink-0"
                                style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.13)' }}>
                                {icon}
                            </div>
                            <span className="text-[11.5px] font-medium" style={{ color: 'var(--t2)' }}>{label}</span>
                        </div>
                    ))}
                </div>

                <div className="h-px" style={{ background: 'linear-gradient(90deg,transparent,var(--b) 30%,var(--b) 70%,transparent)' }} />
            </div>

            <footer className="flex items-center gap-3 au d6 relative z-10">
                <div className="flex">
                    {TEAM.map((s, i) => (
                        <div key={s} className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                            style={{ marginLeft: i ? -6 : 0, background: 'linear-gradient(135deg,#059669,#10b981)', border: '1.5px solid var(--surface)' }}>
                            {s[0]}
                        </div>
                    ))}
                </div>
                <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
                    <span style={{ color: '#6878a8', fontWeight: 500 }}>2,400+</span> teams this month
                </span>
            </footer>
        </aside>
    );
}

// ─── Layout Component ─────────────────────────────────────────────────────────

export function AuthLayout({ children, reverse = false }) {
    useStyles();
    useCursor();

    return (
        <div className="auth-layout">
            <div id="cur" style={{ left: 0, top: 0 }} />
            <div className="noise" />
            <div className="flex flex-col lg:flex-row min-h-screen relative z-10">
                {!reverse && <Brand rightSide={false} />}
                {children}
                {reverse && <Brand rightSide={true} />}
            </div>
        </div>
    );
}
