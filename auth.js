/* Shared authentication, user management, progress sync and score statistics.
   Include this file (as a normal script) before a page's own inline script.
   Pages can use:
     PTAuth.init({ onUnlock(session), onLock() })
     PTAuth.openSettings() / PTAuth.setTheme(id)
     PTProgress.create({ testId, total, catalog, get(), set(state) })
     PTProgress.rows()    -> { [test_id]: answers object (includes __stats) }
     PTProgress.counts()  -> { [test_id]: answeredCount }
     PTProgress.setLaunchFilter(testId, filter) / takeLaunchFilter(testId)
   All styling is injected here as #pt-auth-styles; no external CSS is required.
   Sessions live only in localStorage. Retry filters live in sessionStorage.
   Usernames never go into the URL. */
(function(){
'use strict';

var SUPABASE_URL='https://klwqlynfphckzelrvwbn.supabase.co';
var ANON_KEY='sb_publishable_IQfBO2HpBPnWFx9NTb_-tA_-JGg0uKu';
var K_USER='pt_session_user', K_ROLE='pt_session_role';
var SAVED='Saved to cloud \u2713', SYNCING='Syncing...';
var HELP='Need to sign up or forgot your password? Contact Big P.';
var NOT_FOUND='Username not found. To sign up, contact Big P.';

/* Hand-maintained changelog. Only edit this list when explicitly asked. */
var PT_UPDATES=[
  {version:'v1.5',date:'Nov 26, 2026',title:'Themes, Cloud Sync, Review Tools & Visual Overhaul',
   note:'Note: Earlier updates (v1.0–v1.4) were not recorded.',
   items:[
    'Full-screen account login gate with first-time password creation, theme-matched styling, and admin password resets.',
    'Automatic cross-device cloud sync for answers, written self-grades, flagged questions, and personal notes.',
    'New Settings modal (⚙️) with 8 color themes (Ember Dark default, Midnight Ocean, Daylight Light, Mono Minimal, Synthwave, Matcha Forest, Big Poop, and Golden Hour), confetti toggle, and test resets.',
    'Streamlined top bar with capitalized display names and clean distraction-free home layout.',
    'Detailed Correct / Incorrect / % breakdowns overall, by Question Format (MCQ & Written), and by System / Topic.',
    'Targeted Retry Incorrect mode, Review Flagged filter, and Continue Where You Left Off auto-scroll.',
    'Per-question personal study notes, laptop keyboard shortcuts (A–D, F, N/P), and upgraded Formula Sheet zoom controls.',
    'Glassmorphic visual overhaul with animated mastery rings, drifting ambient glows, evolving streak badges, and confetti celebrations.',
    'Subtle synthesized Web Audio sound effects for right/wrong answers, streak milestones, flags, and theme switches (with a Sounds toggle in Settings).'
  ]}
];
var WRONG_PASSWORD='Incorrect password. Need a reset? Contact Big P.';

/* Eight hand-picked themes. The same presets are installed in <head> on each
   page so data-pt-theme is set before first paint; auth.js reuses them here. */
var THEME_ORDER=['ember','midnight','light','minimal','synthwave','forest','bigpoop','goldenhour'];
var THEME_LABELS={ember:'Ember Dark',midnight:'Midnight Ocean',light:'Daylight Clean',minimal:'Mono Minimal',synthwave:'Synthwave Arcade',forest:'Matcha Forest',bigpoop:'Big Poop',goldenhour:'Golden Hour'};
var THEME_FALLBACK={
  ember:{label:'Ember Dark',bg:'#09090b',surface:'rgba(20,20,23,.82)',surface2:'rgba(28,28,33,.78)',border:'rgba(39,39,42,.95)',text:'#fafafa',muted:'#a1a1aa',primary:'#ef4444',secondary:'#f97316',highlight:'#eab308',glow1:'rgba(239,68,68,.20)',glow2:'rgba(249,115,22,.14)',overlay:'rgba(9,9,11,.82)',shadow:'rgba(0,0,0,.45)',onAccent:'#ffffff',soft:'rgba(239,68,68,.13)',accentBorder:'rgba(239,68,68,.38)',input:'rgba(9,9,11,.62)',ok:'#34d399',bad:'#fb7185',okSoft:'rgba(52,211,153,.12)',badSoft:'rgba(251,113,133,.12)',scheme:'dark'},
  midnight:{label:'Midnight Ocean',bg:'#070b14',surface:'rgba(19,26,42,.78)',surface2:'rgba(15,23,42,.84)',border:'rgba(99,102,241,.24)',text:'#f8fafc',muted:'#94a3b8',primary:'#6366f1',secondary:'#38bdf8',highlight:'#34d399',glow1:'rgba(99,102,241,.22)',glow2:'rgba(16,185,129,.12)',overlay:'rgba(7,11,20,.82)',shadow:'rgba(2,6,23,.48)',onAccent:'#ffffff',soft:'rgba(99,102,241,.14)',accentBorder:'rgba(129,140,248,.4)',input:'rgba(2,6,23,.55)',ok:'#34d399',bad:'#fb7185',okSoft:'rgba(16,185,129,.12)',badSoft:'rgba(244,63,94,.12)',scheme:'dark'},
  light:{label:'Daylight Clean',bg:'#f8fafc',surface:'rgba(255,255,255,.94)',surface2:'rgba(241,245,249,.96)',border:'#cbd5e1',text:'#0f172a',muted:'#475569',primary:'#2563eb',secondary:'#059669',highlight:'#0f766e',glow1:'rgba(37,99,235,.14)',glow2:'rgba(5,150,105,.12)',overlay:'rgba(15,23,42,.30)',shadow:'rgba(15,23,42,.16)',onAccent:'#ffffff',soft:'rgba(37,99,235,.10)',accentBorder:'rgba(37,99,235,.32)',input:'#ffffff',ok:'#065f46',bad:'#be123c',okSoft:'rgba(5,150,105,.11)',badSoft:'rgba(225,29,72,.10)',scheme:'light'},
  minimal:{label:'Mono Minimal',bg:'#0a0a0a',surface:'#121212',surface2:'#171717',border:'#262626',text:'#fafafa',muted:'#a3a3a3',primary:'#fafafa',secondary:'#a3a3a3',highlight:'#d4d4d4',glow1:'rgba(0,0,0,0)',glow2:'rgba(0,0,0,0)',overlay:'rgba(0,0,0,.86)',shadow:'rgba(0,0,0,.50)',onAccent:'#0a0a0a',soft:'rgba(250,250,250,.10)',accentBorder:'rgba(250,250,250,.26)',input:'#0a0a0a',ok:'#d4d4d4',bad:'#a3a3a3',okSoft:'rgba(212,212,212,.10)',badSoft:'rgba(163,163,163,.10)',scheme:'dark'},
  synthwave:{label:'Synthwave Arcade',bg:'#0d0618',surface:'rgba(23,13,41,.86)',surface2:'rgba(35,18,58,.84)',border:'rgba(236,72,153,.28)',text:'#faf5ff',muted:'#c4b5fd',primary:'#ec4899',secondary:'#06b6d4',highlight:'#a855f7',glow1:'rgba(236,72,153,.20)',glow2:'rgba(6,182,212,.16)',overlay:'rgba(13,6,24,.84)',shadow:'rgba(0,0,0,.52)',onAccent:'#0d0618',soft:'rgba(236,72,153,.14)',accentBorder:'rgba(236,72,153,.44)',input:'rgba(13,6,24,.64)',ok:'#2dd4bf',bad:'#fb7185',okSoft:'rgba(45,212,191,.12)',badSoft:'rgba(251,113,133,.12)',scheme:'dark'},
  forest:{label:'Matcha Forest',bg:'#06110d',surface:'rgba(15,31,25,.86)',surface2:'rgba(20,42,34,.84)',border:'rgba(16,185,129,.26)',text:'#ecfdf5',muted:'#a7f3d0',primary:'#10b981',secondary:'#f59e0b',highlight:'#34d399',glow1:'rgba(16,185,129,.18)',glow2:'rgba(245,158,11,.12)',overlay:'rgba(6,17,13,.82)',shadow:'rgba(0,0,0,.46)',onAccent:'#06110d',soft:'rgba(16,185,129,.13)',accentBorder:'rgba(16,185,129,.42)',input:'rgba(6,17,13,.62)',ok:'#34d399',bad:'#fb7185',okSoft:'rgba(52,211,153,.12)',badSoft:'rgba(251,113,133,.12)',scheme:'dark'},
  bigpoop:{label:'Big Poop',bg:'#120b07',surface:'#1d120c',surface2:'#281911',border:'#3f281c',text:'#fdf8f4',muted:'#c8b2a2',primary:'#b45309',secondary:'#d97706',highlight:'#f59e0b',glow1:'rgba(180, 83, 9, 0.34)',glow2:'rgba(217, 119, 6, 0.24)',overlay:'rgba(18,11,7,.88)',shadow:'rgba(0,0,0,.5)',onAccent:'#fff8ef',soft:'rgba(180,83,9,.16)',accentBorder:'rgba(245,158,11,.46)',input:'rgba(18,11,7,.72)',ok:'#f5b74f',bad:'#ff8a80',okSoft:'rgba(245,183,79,.13)',badSoft:'rgba(255,138,128,.13)',scheme:'dark'},
  goldenhour:{label:'Golden Hour',bg:'#140c18',surface:'#1f1324',surface2:'#2b1a30',border:'#462b47',text:'#fffbeb',muted:'#e2c7c9',primary:'#f59e0b',secondary:'#fb7185',highlight:'#fde047',glow1:'rgba(245, 158, 11, 0.34)',glow2:'rgba(251, 113, 133, 0.26)',overlay:'rgba(20,12,24,.88)',shadow:'rgba(0,0,0,.5)',onAccent:'#1a0f18',soft:'rgba(245,158,11,.15)',accentBorder:'rgba(253,224,71,.48)',input:'rgba(20,12,24,.72)',ok:'#fde047',bad:'#fb7185',okSoft:'rgba(253,224,71,.12)',badSoft:'rgba(251,113,133,.14)',scheme:'dark'}
};
var THEMES=window.PT_THEME_PRESETS||THEME_FALLBACK;
var progressRegistry={};

var mem={}, session=null, pendingUser=null, booted=false, gate=null, bar=null, adminModal=null, adminKeyHandler=null;
var settingsModal=null, settingsKeyHandler=null;
var callbacks={unlock:[],lock:[]};

function enc(s){return encodeURIComponent(String(s))}
function norm(s){return String(s==null?'':s).trim().toLowerCase()}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function lsGet(k){try{var v=localStorage.getItem(k);return v==null?(mem[k]||null):v}catch(e){return mem[k]||null}}
function lsSet(k,v){mem[k]=String(v);try{localStorage.setItem(k,String(v))}catch(e){}}
function lsDel(k){delete mem[k];try{localStorage.removeItem(k)}catch(e){}}
function displayName(s){var u=norm(s);return u?u.charAt(0).toUpperCase()+u.slice(1):''}
function getSession(){var u=norm(lsGet(K_USER)),r=lsGet(K_ROLE);return u&&r?{username:u,role:r}:null}
function saveSession(u,r){var nu=norm(u);lsSet(K_USER,nu);lsSet(K_ROLE,r||'student');session={username:nu,role:r||'student'}}
function clearSession(){lsDel(K_USER);lsDel(K_ROLE);session=null}

/* ---------- theme bootstrap (falls back if a page lacks the head installer) ---------- */

function validTheme(t){t=norm(t);return THEME_ORDER.indexOf(t)>=0?t:'ember'}
function currentTheme(){return validTheme(lsGet('pt_theme')||'ember')}
function themeVarsCSS(){
  var css=':root{--pt-ease:cubic-bezier(.16,1,.3,1)}';
  THEME_ORDER.forEach(function(id){
    var p=THEMES[id]||THEME_FALLBACK[id];
    css+='html[data-pt-theme="'+id+'"]{'+
      '--pt-bg:'+p.bg+';--pt-surface:'+p.surface+';--pt-surface-2:'+p.surface2+';--pt-border:'+p.border+';'+
      '--pt-text:'+p.text+';--pt-text-muted:'+p.muted+';--pt-accent-primary:'+p.primary+';'+
      '--pt-accent-secondary:'+p.secondary+';--pt-accent-highlight:'+p.highlight+';'+
      '--pt-glow-1:'+p.glow1+';--pt-glow-2:'+p.glow2+';--pt-overlay:'+p.overlay+';'+
      '--pt-shadow:'+p.shadow+';--pt-on-accent:'+p.onAccent+';--pt-accent-soft:'+p.soft+';'+
      '--pt-accent-border:'+p.accentBorder+';--pt-input:'+p.input+';--pt-ok:'+p.ok+';--pt-bad:'+p.bad+';'+
      '--pt-ok-soft:'+p.okSoft+';--pt-bad-soft:'+p.badSoft+';color-scheme:'+p.scheme+'}';
  });
  return css;
}
function injectThemeCSS(){
  var el=document.getElementById('pt-theme-vars');
  if(!el){el=document.createElement('style');el.id='pt-theme-vars';document.head.appendChild(el)}
  el.textContent=themeVarsCSS();
}
function setTheme(id,silent){
  id=validTheme(id);
  document.documentElement.setAttribute('data-pt-theme',id);
  lsSet('pt_theme',id);
  renderThemeGrid();
  if(!silent&&settingsModal)settingsMsg('Theme set to '+THEME_LABELS[id]+'.');
  if(document.dispatchEvent&&window.CustomEvent)document.dispatchEvent(new CustomEvent('pt-theme-change',{detail:{theme:id}}));
}

/* ---------- self-contained styling ---------- */

function injectCSS(){
  if(document.getElementById('pt-auth-styles'))return;
  var css=[
    'html{--pt-ease:cubic-bezier(.16,1,.3,1)}',
    '@keyframes fadeSlideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes ptCorrectPop{0%{transform:scale(1);box-shadow:0 0 0 0 rgba(52,211,153,.55)}35%{transform:scale(1.07);box-shadow:0 0 0 6px rgba(52,211,153,.18),0 0 30px rgba(16,185,129,.5)}100%{transform:scale(1);box-shadow:0 0 0 13px rgba(52,211,153,0),0 0 0 rgba(16,185,129,0)}}',
    '@keyframes ptWrongShake{0%,100%{transform:translateX(0)}18%{transform:translateX(-6px)}38%{transform:translateX(5px)}58%{transform:translateX(-4px)}78%{transform:translateX(2px)}}',
    '@keyframes ptStreakPop{0%{transform:scale(.85)}45%{transform:scale(1.22)}100%{transform:scale(1)}}',
    '@keyframes ptModalIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}',
    '@keyframes ptNewPulse{0%,100%{box-shadow:0 0 0 2px rgba(7,11,20,.9),0 0 8px rgba(251,113,133,.5)}50%{box-shadow:0 0 0 2px rgba(7,11,20,.9),0 0 16px rgba(251,113,133,.9)}}',
    '@keyframes ptToastIn{from{opacity:0;transform:translate(-50%,-14px) scale(.96)}to{opacity:1;transform:translate(-50%,0) scale(1)}}',
    '@keyframes ptToastOut{to{opacity:0;transform:translate(-50%,-10px) scale(.97)}}',

    '/* page lock: nothing behind the gate can be seen or clicked */',
    'html body.pt-auth-locked{overflow:hidden!important;height:100vh}',
    'html body.pt-auth-locked main,html body.pt-auth-locked #app,html body.pt-auth-locked [data-pt-auth-page]{visibility:hidden!important;pointer-events:none!important}',
    'html body.pt-auth-locked #tb,html body.pt-auth-locked #tp,html body.pt-auth-locked #zm,html body.pt-auth-locked #zo{display:none!important;visibility:hidden!important}',

    '/* full-screen login gate */',
    'html body #pt-auth-gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:radial-gradient(820px 620px at 12% -8%,var(--pt-glow-1),transparent 62%),radial-gradient(700px 540px at 92% 18%,var(--pt-glow-2),transparent 62%),var(--pt-bg);padding:16px;overflow:auto;color:var(--pt-text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.5}',
    'html body #pt-auth-gate *,html body #pt-auth-bar *,html body #pt-auth-admin-modal *{box-sizing:border-box}',
    'html body #pt-auth-gate .pt-auth-card{max-width:420px;width:100%;background:var(--pt-surface);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid var(--pt-border);border-radius:20px;padding:30px;box-shadow:0 0 28px var(--pt-glow-1),0 12px 32px rgba(0,0,0,0.45);animation:fadeSlideUp .55s var(--pt-ease) backwards;transition:transform .35s var(--pt-ease),box-shadow .35s var(--pt-ease)}',
    'html body #pt-auth-gate .pt-auth-card:hover{transform:translateY(-3px);box-shadow:0 0 36px var(--pt-glow-2),0 16px 38px var(--pt-shadow)}',
    'html body #pt-auth-gate .pt-auth-mark{width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,var(--pt-accent-primary),var(--pt-accent-secondary));color:var(--pt-on-accent);display:flex;align-items:center;justify-content:center;font-weight:800;letter-spacing:.5px;margin-bottom:18px;box-shadow:0 8px 24px var(--pt-glow-1)}',
    'html body #pt-auth-gate h2{margin:0 0 6px;font-size:1.45rem;letter-spacing:-.02em;color:var(--pt-text)}',
    'html body #pt-auth-gate .pt-auth-lead{color:var(--pt-text-muted);margin:0 0 18px;font-size:.92rem}',
    'html body #pt-auth-gate .pt-auth-chip{display:inline-block;background:var(--pt-accent-soft);border:1px solid var(--pt-accent-border);border-radius:999px;padding:4px 11px;color:var(--pt-text);font-size:.8rem;font-weight:700;margin-bottom:16px}',
    'html body #pt-auth-gate label.pt-auth-label{display:block;margin:0 0 6px;color:var(--pt-text);font-size:.85rem;font-weight:600}',
    'html body #pt-auth-gate input.pt-auth-input{width:100%;padding:11px 14px;border-radius:10px;background:var(--pt-input);border:1px solid var(--pt-border);color:var(--pt-text);font:inherit;margin:0 0 14px;display:block;transition:border-color .3s var(--pt-ease),box-shadow .3s var(--pt-ease)}',
    'html body #pt-auth-gate input.pt-auth-input::placeholder{color:var(--pt-text-muted)}',
    'html body #pt-auth-gate input.pt-auth-input:focus{outline:none;border-color:var(--pt-accent-primary);box-shadow:0 0 0 3px var(--pt-accent-soft),0 0 24px var(--pt-glow-2)}',
    'html body #pt-auth-gate button.pt-auth-primary{width:100%;padding:12px 16px;border-radius:10px;background:linear-gradient(135deg,var(--pt-accent-primary),var(--pt-accent-secondary));color:var(--pt-on-accent);font-weight:700;cursor:pointer;border:1px solid transparent;text-align:center;font-family:inherit;font-size:1rem;box-shadow:0 0 28px var(--pt-glow-1),0 12px 32px rgba(0,0,0,0.45);transition:transform .3s var(--pt-ease),filter .3s var(--pt-ease),box-shadow .3s var(--pt-ease)}',
    'html body #pt-auth-gate button.pt-auth-primary:hover{filter:brightness(1.1);transform:translateY(-2px);box-shadow:0 0 36px var(--pt-glow-2),0 16px 34px var(--pt-shadow)}',
    'html body #pt-auth-gate button.pt-auth-primary:active{transform:scale(.98)}',
    'html body #pt-auth-gate button.pt-auth-primary:disabled{opacity:.6;cursor:wait}',
    'html body #pt-auth-gate button.pt-auth-back{display:block;margin:12px auto 0;background:none;border:0;padding:4px;color:var(--pt-accent-secondary);font-size:.85rem;cursor:pointer;text-align:center;font-family:inherit}',
    'html body #pt-auth-gate button.pt-auth-back:hover{color:var(--pt-accent-highlight);text-decoration:underline}',
    'html body #pt-auth-gate .pt-auth-error:empty{display:none}',
    'html body #pt-auth-gate .pt-auth-error:not(:empty){background:var(--pt-bad-soft);border:1px solid var(--pt-bad);color:var(--pt-bad);border-radius:10px;padding:10px 12px;margin:0 0 14px;font-size:.88rem}',
    'html body #pt-auth-gate .pt-auth-help{border-top:1px solid var(--pt-border);margin:20px 0 0;padding-top:14px;color:var(--pt-text-muted);font-size:.82rem;text-align:center;line-height:1.45}',
    'html body #pt-auth-gate .pt-auth-loading{display:flex;align-items:center;justify-content:center;gap:10px;color:var(--pt-text-muted);min-height:60px}',
    'html body #pt-auth-gate .pt-auth-spinner{width:20px;height:20px;border:2px solid var(--pt-border);border-top-color:var(--pt-accent-primary);border-radius:50%;animation:pt-auth-spin .8s linear infinite}',
    '@keyframes pt-auth-spin{to{transform:rotate(360deg)}}',

    '/* logged-in top bar: exactly four right-aligned items */',
    'html body #pt-auth-bar{display:none;position:sticky;top:0;z-index:9000;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding:8px 12px;background:var(--pt-surface);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-bottom:1px solid var(--pt-border);color:var(--pt-text);font-size:.8rem;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 8px 26px var(--pt-shadow)}',
    'html body #pt-auth-bar.pt-auth-on{display:flex}',
    'html body #pt-auth-bar [hidden]{display:none!important}',
    'html body #pt-auth-bar .pt-auth-sync{padding:5px 10px;border-radius:999px;background:var(--pt-ok-soft);border:1px solid var(--pt-border);color:var(--pt-ok);white-space:nowrap;font-weight:700;transition:background .3s var(--pt-ease),border-color .3s var(--pt-ease)}',
    'html body #pt-auth-bar .pt-auth-sync.pt-auth-warn{background:var(--pt-bad-soft);border-color:var(--pt-bad);color:var(--pt-bad)}',
    'html body #pt-auth-bar .pt-auth-user-badge{max-width:min(34vw,190px);overflow:hidden;text-overflow:ellipsis;padding:5px 11px;border-radius:999px;background:var(--pt-surface-2);border:1px solid var(--pt-border);color:var(--pt-text);font-weight:800;white-space:nowrap}',
    'html body #pt-auth-bar button.pt-auth-btn{padding:6px 12px;border-radius:999px;border:1px solid var(--pt-border);background:var(--pt-surface-2);color:var(--pt-text);font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap;text-align:center;font-family:inherit;transition:transform .25s var(--pt-ease),border-color .25s var(--pt-ease),box-shadow .25s var(--pt-ease),background .25s var(--pt-ease)}',
    'html body #pt-auth-bar button.pt-auth-btn:hover{border-color:var(--pt-accent-primary);box-shadow:0 0 0 1px var(--pt-accent-soft),0 6px 18px var(--pt-shadow)}',
    'html body #pt-auth-bar button.pt-auth-btn:active{transform:scale(.98)}',
    'html body #pt-auth-bar button.pt-updates-btn{position:relative;display:inline-flex;align-items:center;gap:6px;color:var(--pt-text)}',
    'html body #pt-auth-bar button.pt-settings-btn{min-width:34px;display:inline-flex;align-items:center;justify-content:center;font-size:1rem;padding:5px 10px}',
    'html body #pt-auth-bar .pt-update-new{position:absolute;top:-7px;right:-8px;padding:2px 6px;border-radius:999px;background:linear-gradient(135deg,var(--pt-accent-primary),var(--pt-accent-secondary));color:var(--pt-on-accent);font-size:.6rem;font-weight:800;letter-spacing:.04em;animation:ptNewPulse 1.8s ease-in-out infinite}',

    '/* in-test auth controls */',
    'html body .pt-auth-act{flex-wrap:wrap}',
    'html body .act button.pt-auth-flag{flex:0 0 auto;font-size:.85rem;padding:10px 12px;border-radius:10px;background:var(--pt-surface-2);color:var(--pt-text);border:1px solid var(--pt-border)}',
    'html body .act button.pt-auth-flag.pt-auth-on{border-color:var(--pt-accent-border);color:var(--pt-accent-secondary);font-weight:700;background:var(--pt-accent-soft)}',
    'html body .pt-settings-tip{display:flex;align-items:center;gap:7px;margin:0 0 12px;padding:9px 12px;border-radius:12px;border:1px solid var(--pt-accent-border);background:var(--pt-accent-soft);color:var(--pt-text-muted);font-size:.82rem;font-weight:600;line-height:1.45;overflow-wrap:anywhere}',
    'html body .pt-intro-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    'html body .pt-intro-row .pt-settings-tip{flex:1 1 320px;margin-bottom:12px}',
    'html body button.pt-score-link{margin:0 0 12px;padding:8px 13px;border-radius:999px;border:1px solid var(--pt-accent-border);background:var(--pt-surface-2);color:var(--pt-text);font-size:.8rem;font-weight:800;cursor:pointer;white-space:nowrap;font-family:inherit}',
    'html body button.pt-score-link:hover{border-color:var(--pt-accent-primary);background:var(--pt-accent-soft)}',

    '/* answer feedback micro-animations */',
    'html body .pt-correct-pop{animation:ptCorrectPop .6s var(--pt-ease)}',
    'html body .pt-wrong-shake{animation:ptWrongShake .3s ease-in-out;border-color:rgba(251,113,133,.7)!important;box-shadow:0 0 20px rgba(244,63,94,.22)}',
    'html body .streak-badge{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;font-size:.8rem;font-weight:800;white-space:nowrap;color:#fde68a;background:rgba(251,146,60,.12);border:1px solid rgba(251,146,60,.32);box-shadow:0 0 20px rgba(251,146,60,.12)}',
    'html body .streak-badge:empty{display:none}',
    'html body .streak-badge.pt-streak-pop{animation:ptStreakPop .42s var(--pt-ease)}',
    'html body .streak-badge[data-tier="fire"]{color:#fdba74;background:rgba(251,146,60,.16);border-color:rgba(251,146,60,.5);box-shadow:0 0 24px rgba(251,146,60,.2)}',
    'html body .streak-badge[data-tier="crown"]{color:#fde68a;background:linear-gradient(135deg,rgba(245,158,11,.18),rgba(139,92,246,.16));border-color:rgba(251,191,36,.55);box-shadow:0 0 26px rgba(251,191,36,.2)}',
    'html body #pt-confetti{position:fixed;inset:0;pointer-events:none;z-index:100005}',
    'html body .pt-toast{position:fixed;left:50%;top:72px;z-index:100006;transform:translateX(-50%);padding:9px 16px;border-radius:999px;background:rgba(15,23,42,.86);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(251,191,36,.36);color:#fde68a;font-size:.85rem;font-weight:800;white-space:nowrap;box-shadow:0 12px 34px rgba(2,6,23,.5),0 0 24px rgba(251,191,36,.16);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;animation:ptToastIn .35s var(--pt-ease) backwards}',
    'html body .pt-toast.pt-toast-out{animation:ptToastOut .4s var(--pt-ease) forwards}',

    '/* score breakdown / retry UI (shared by menu and tests) */',
    'html body .pt-stats-card{background:rgba(15,23,42,.5);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(148,163,184,.14);border-radius:16px;padding:14px;margin-top:14px;color:#f1f5f9}',
    'html body .pt-stats-title{font-weight:800;font-size:.95rem;margin:0 0 8px;color:#f8fafc}',
    'html body .pt-stats-section{font-size:.72rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#7dd3fc;margin:12px 0 2px}',
    'html body .pt-stats-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;border-top:1px solid rgba(148,163,184,.12);font-size:.82rem;line-height:1.4}',
    'html body .pt-stats-row:first-of-type{border-top:0}',
    'html body .pt-stats-row.pt-stats-overall{background:rgba(99,102,241,.09);border-radius:10px;padding:9px 8px;border-top:0}',
    'html body .pt-stats-name{font-weight:700;flex:0 0 auto;min-width:112px;color:#f1f5f9}',
    'html body .pt-stats-bar{flex:1 1 90px;min-width:70px;height:8px;background:rgba(148,163,184,.14);border-radius:99px;overflow:hidden;display:flex;box-shadow:inset 0 1px 3px rgba(0,0,0,.28)}',
    'html body .pt-stats-bar i{display:block;flex:0 0 auto;height:100%;border-radius:99px;transition:width .6s var(--pt-ease)}',
    'html body .pt-stats-bar i.bar-ok{background:linear-gradient(90deg,#059669,#34d399);box-shadow:0 0 12px rgba(52,211,153,.35)}',
    'html body .pt-stats-bar i.bar-bad{background:linear-gradient(90deg,#e11d48,#fb7185);box-shadow:0 0 12px rgba(251,113,133,.3)}',
    'html body .pt-stats-bar i.bar-answered{background:linear-gradient(90deg,#4f46e5,#38bdf8)}',
    'html body .pt-stats-num{color:#94a3b8;white-space:nowrap;font-variant-numeric:tabular-nums}',
    'html body .pt-stats-pct{font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums;color:#f8fafc}',
    'html body .pt-stats-badge{display:inline-block;padding:3px 8px;border-radius:999px;font-size:.75rem;font-weight:700;white-space:nowrap;border:1px solid transparent}',
    'html body .pt-stats-badge.ok{background:rgba(16,185,129,.12);border-color:rgba(52,211,153,.32);color:#6ee7b7}',
    'html body .pt-stats-badge.bad{background:rgba(244,63,94,.12);border-color:rgba(251,113,133,.32);color:#fda4af}',
    'html body button.pt-stats-btn{margin-left:auto;padding:6px 11px;border-radius:999px;border:1px solid transparent;background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:#fff;font-size:.76rem;font-weight:700;white-space:nowrap;text-align:center;cursor:pointer;font-family:inherit;transition:transform .25s var(--pt-ease),filter .25s var(--pt-ease),box-shadow .25s var(--pt-ease)}',
    'html body button.pt-stats-btn:hover{filter:brightness(1.12);box-shadow:0 6px 18px rgba(56,189,248,.22)}',
    'html body button.pt-stats-btn:active{transform:scale(.98)}',
    'html body button.pt-stats-btn.ghost{background:transparent;color:#93c5fd;border-color:rgba(147,197,253,.4)}',
    'html body button.pt-stats-btn:disabled{opacity:.55;cursor:default;border-color:rgba(148,163,184,.14);background:rgba(30,41,59,.5);color:#94a3b8}',
    'html body .pt-stats-mastered{margin-left:auto;color:#6ee7b7;font-size:.78rem;font-weight:700;white-space:nowrap}',
    'html body .pt-stats-row.pt-stats-sub{padding:5px 0 5px 10px;border-top:1px dashed rgba(148,163,184,.14);font-size:.76rem;background:rgba(148,163,184,.05)}',
    'html body .pt-stats-sub .pt-stats-name{min-width:100%;font-weight:600;color:#cbd5e1}',
    'html body .pt-stats-sub .pt-stats-badge{padding:2px 6px;font-size:.68rem}',
    'html body button.pt-stats-btn.compact{padding:4px 8px;font-size:.7rem}',
    'html body .pt-stats-empty{color:#94a3b8;font-size:.85rem;margin:4px 0 0}',
    'html body .pt-topic-list{display:grid;gap:10px}',
    'html body .pt-topic-card{background:rgba(2,6,23,.3);border:1px solid rgba(148,163,184,.13);border-radius:12px;padding:2px 10px 10px}',
    'html body .pt-topic-card .pt-stats-row{border-top:0;padding:8px 0}',
    'html body .pt-topic-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}',
    'html body .pt-format-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:999px;background:rgba(148,163,184,.09);border:1px solid rgba(148,163,184,.16);color:#cbd5e1;font-size:.72rem;font-weight:600;white-space:nowrap}',
    'html body .pt-format-pill.is-perfect{border-color:rgba(52,211,153,.35);background:rgba(16,185,129,.12);color:#6ee7b7}',
    'html body .pt-format-pill.has-miss{border-color:rgba(251,113,133,.35);background:rgba(244,63,94,.1);color:#fda4af}',
    'html body button.pt-pill-retry{padding:1px 7px;border-radius:999px;border:1px solid rgba(148,163,184,.28);background:rgba(30,41,59,.72);color:#e2e8f0;font-size:.66rem;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;transition:transform .25s var(--pt-ease),border-color .25s var(--pt-ease)}',
    'html body button.pt-pill-retry:hover{border-color:rgba(56,189,248,.55);color:#fff}',
    'html body button.pt-pill-retry:active{transform:scale(.98)}',
    'html body button.pt-stats-grade{padding:10px 12px;border-radius:10px;border:1px solid rgba(148,163,184,.16);background:rgba(30,41,59,.55);color:#e2e8f0;font-size:.85rem;font-weight:700;text-align:center;cursor:pointer;flex:1 1 auto;font-family:inherit;transition:transform .25s var(--pt-ease),border-color .25s var(--pt-ease),box-shadow .25s var(--pt-ease),background .25s var(--pt-ease)}',
    'html body button.pt-stats-grade:hover{border-color:rgba(56,189,248,.5);transform:translateY(-2px)}',
    'html body button.pt-stats-grade:active{transform:scale(.98)}',
    'html body button.pt-stats-grade.correct.on{border-color:rgba(52,211,153,.7);background:rgba(16,185,129,.16);color:#6ee7b7;box-shadow:0 0 18px rgba(16,185,129,.16)}',
    'html body button.pt-stats-grade.incorrect.on{border-color:rgba(251,113,133,.7);background:rgba(244,63,94,.14);color:#fda4af;box-shadow:0 0 18px rgba(244,63,94,.16)}',
    'html body .pt-stats-retry-banner{position:sticky;top:56px;z-index:60;display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:rgba(15,23,42,.8);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(99,102,241,.45);color:#e2e8f0;border-radius:14px;padding:10px 13px;margin:0 0 14px;font-size:.88rem;box-shadow:0 8px 26px rgba(2,6,23,.3)}',
    'html body .pt-stats-retry-banner strong{color:#93c5fd}',
    'html body .pt-stats-retry-banner button{margin-left:auto;background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:#fff;border:1px solid transparent;border-radius:999px;padding:7px 12px;font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit}',
    'html body .pt-resume-highlight{animation:ptResumePulse 2s ease-out;border-radius:14px}',
    '@keyframes ptResumePulse{0%{box-shadow:0 0 0 0 rgba(99,102,241,.85)}45%{box-shadow:0 0 0 9px rgba(56,189,248,.25)}100%{box-shadow:0 0 0 0 rgba(56,189,248,0)}}',

    '/* score summary modal */',
    'html body #pt-stats-modal{position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,11,20,.78);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#e2e8f0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    'html body #pt-stats-modal .pt-stats-modal-card{width:min(560px,100%);max-height:min(86vh,760px);overflow:auto;background:rgba(15,23,42,.82);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(148,163,184,.16);border-radius:20px;padding:20px;box-shadow:0 24px 70px rgba(2,6,23,.65);animation:ptModalIn .4s var(--pt-ease) backwards}',
    'html body #pt-stats-modal .pt-stats-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}',
    'html body #pt-stats-modal .pt-stats-modal-head h2{margin:0;font-size:1.15rem;color:#f8fafc}',
    'html body #pt-stats-modal button.pt-stats-close{background:rgba(30,41,59,.65);color:#e2e8f0;border:1px solid rgba(148,163,184,.16);border-radius:999px;padding:6px 11px;cursor:pointer;font-family:inherit;font-size:.8rem;transition:transform .25s var(--pt-ease),border-color .25s var(--pt-ease)}',
    'html body #pt-stats-modal button.pt-stats-close:hover{border-color:rgba(56,189,248,.5)}',
    'html body #pt-stats-modal button.pt-stats-close:active{transform:scale(.98)}',
    'html body #pt-stats-modal .pt-stats-card{background:rgba(2,6,23,.34);border-color:rgba(148,163,184,.14);color:#e2e8f0}',
    'html body #pt-stats-modal .pt-stats-name,html body #pt-stats-modal .pt-stats-pct,html body #pt-stats-modal .pt-stats-title{color:#e2e8f0}',
    'html body #pt-stats-modal .pt-stats-section{color:#7dd3fc}',
    'html body #pt-stats-modal .pt-stats-row{border-color:rgba(148,163,184,.12)}',
    'html body #pt-stats-modal .pt-stats-num{color:#94a3b8}',
    '@media (max-width:520px){html body .pt-stats-name{min-width:100%}html body button.pt-stats-btn{margin-left:0}html body .pt-stats-mastered{margin-left:0}}',

    '/* updates changelog modal */',
    'html body #pt-updates-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,11,20,.82);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#e2e8f0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    'html body #pt-updates-modal .pt-updates-card{width:min(560px,100%);max-height:min(86vh,760px);overflow:auto;background:rgba(15,23,42,.84);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(148,163,184,.16);border-radius:20px;padding:20px;box-shadow:0 24px 70px rgba(2,6,23,.65);animation:ptModalIn .4s var(--pt-ease) backwards}',
    'html body #pt-updates-modal .pt-updates-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}',
    'html body #pt-updates-modal .pt-updates-head h2{margin:0;font-size:1.2rem;color:#f8fafc}',
    'html body #pt-updates-modal .pt-updates-head p{margin:4px 0 0;color:#94a3b8;font-size:.82rem}',
    'html body #pt-updates-modal button.pt-updates-close{padding:6px 11px;border-radius:999px;border:1px solid rgba(148,163,184,.18);background:rgba(30,41,59,.65);color:#e2e8f0;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit;transition:transform .25s var(--pt-ease),border-color .25s var(--pt-ease)}',
    'html body #pt-updates-modal button.pt-updates-close:hover{border-color:rgba(56,189,248,.55);color:#fff}',
    'html body #pt-updates-modal button.pt-updates-close:active{transform:scale(.98)}',
    'html body #pt-updates-modal .pt-update-card{background:rgba(2,6,23,.34);border:1px solid rgba(148,163,184,.14);border-radius:14px;padding:14px}',
    'html body #pt-updates-modal .pt-update-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}',
    'html body #pt-updates-modal .pt-update-version{padding:3px 9px;border-radius:999px;background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:#fff;font-size:.72rem;font-weight:800}',
    'html body #pt-updates-modal .pt-update-date{color:#94a3b8;font-size:.76rem}',
    'html body #pt-updates-modal .pt-update-title{margin:0 0 8px;color:#f8fafc;font-size:1rem}',
    'html body #pt-updates-modal .pt-update-note{margin:0 0 10px;padding:8px 10px;border-radius:10px;border:1px solid rgba(251,191,36,.28);background:rgba(245,158,11,.1);color:#fcd34d;font-size:.78rem;font-weight:700;overflow-wrap:anywhere}',
    'html body #pt-updates-modal .pt-update-items{margin:0;padding-left:18px;color:#cbd5e1;font-size:.85rem;line-height:1.55;overflow-wrap:anywhere}',
    'html body #pt-updates-modal .pt-update-items li+li{margin-top:5px}',

    '/* settings modal: themes, effects, resets and account controls */',
    'html body #pt-settings-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--pt-overlay);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:var(--pt-text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    'html body #pt-settings-modal .pt-settings-card{width:min(620px,100%);max-height:min(88vh,820px);overflow:auto;background:var(--pt-surface);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid var(--pt-border);border-radius:20px;padding:22px;box-shadow:0 24px 70px var(--pt-shadow);animation:ptModalIn .4s var(--pt-ease) backwards}',
    'html body #pt-settings-modal .pt-settings-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:4px}',
    'html body #pt-settings-modal .pt-settings-head h2{margin:0;font-size:1.2rem;color:var(--pt-text)}',
    'html body #pt-settings-modal .pt-settings-head p{margin:4px 0 0;color:var(--pt-text-muted);font-size:.82rem}',
    'html body #pt-settings-modal button.pt-settings-close{padding:6px 11px;border-radius:999px;border:1px solid var(--pt-border);background:var(--pt-surface-2);color:var(--pt-text);font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit}',
    'html body #pt-settings-modal .pt-settings-msg{min-height:1.2em;margin:10px 0 2px;color:var(--pt-accent-secondary);font-size:.8rem;font-weight:700;overflow-wrap:anywhere}',
    'html body #pt-settings-modal .pt-settings-msg.pt-auth-bad{color:var(--pt-bad)}',
    'html body #pt-settings-modal .pt-settings-section{margin-top:18px;padding-top:16px;border-top:1px solid var(--pt-border)}',
    'html body #pt-settings-modal .pt-settings-section h3{margin:0 0 4px;color:var(--pt-text);font-size:.94rem}',
    'html body #pt-settings-modal .pt-settings-section>p{margin:0 0 12px;color:var(--pt-text-muted);font-size:.78rem}',
    'html body #pt-settings-modal .pt-theme-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}',
    'html body #pt-settings-modal button.pt-theme-swatch{min-width:0;display:flex;align-items:center;gap:9px;padding:9px;border-radius:13px;border:1px solid var(--pt-border);background:var(--pt-surface-2);color:var(--pt-text);font-family:inherit;font-size:.78rem;font-weight:700;text-align:left;cursor:pointer;transition:transform .25s var(--pt-ease),border-color .25s var(--pt-ease),box-shadow .25s var(--pt-ease)}',
    'html body #pt-settings-modal button.pt-theme-swatch:hover{transform:translateY(-2px);border-color:var(--pt-accent-primary)}',
    'html body #pt-settings-modal button.pt-theme-swatch.selected{border-color:var(--pt-accent-primary);box-shadow:0 0 0 1px var(--pt-accent-soft),0 8px 22px var(--pt-shadow)}',
    'html body #pt-settings-modal .pt-theme-preview{position:relative;flex:0 0 auto;width:44px;height:38px;border-radius:9px;border:1px solid var(--pt-border);display:flex;align-items:flex-end;justify-content:center;gap:4px;padding:0 0 7px;overflow:hidden}',
    'html body #pt-settings-modal .pt-theme-preview i{width:8px;height:8px;border-radius:50%;display:block;box-shadow:0 0 8px currentColor}',
    'html body #pt-settings-modal .pt-settings-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 0;border-bottom:1px solid var(--pt-border)}',
    'html body #pt-settings-modal .pt-settings-row:last-child{border-bottom:0}',
    'html body #pt-settings-modal .pt-settings-row-label{min-width:0;color:var(--pt-text);font-size:.85rem;font-weight:700}',
    'html body #pt-settings-modal .pt-settings-row-label small{display:block;color:var(--pt-text-muted);font-size:.73rem;font-weight:500;margin-top:2px;overflow-wrap:anywhere}',
    'html body #pt-settings-modal button.pt-settings-btn{padding:8px 13px;border-radius:10px;border:1px solid var(--pt-border);background:var(--pt-surface-2);color:var(--pt-text);font-family:inherit;font-size:.78rem;font-weight:800;cursor:pointer;white-space:nowrap;transition:transform .25s var(--pt-ease),border-color .25s var(--pt-ease)}',
    'html body #pt-settings-modal button.pt-settings-btn:hover{border-color:var(--pt-accent-primary)}',
    'html body #pt-settings-modal button.pt-settings-btn:active{transform:scale(.98)}',
    'html body #pt-settings-modal button.pt-settings-btn.confirm{border-color:var(--pt-bad);color:var(--pt-bad);background:var(--pt-bad-soft)}',
    'html body #pt-settings-modal button.pt-settings-btn.logout{border-color:var(--pt-bad);color:#fff;background:linear-gradient(135deg,#e11d48,#f43f5e)}',
    'html body #pt-settings-modal .pt-settings-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    'html body #pt-settings-modal button.pt-settings-fx{display:inline-flex;align-items:center;gap:7px;min-width:118px;justify-content:center;border-color:var(--pt-accent-border);background:var(--pt-accent-soft)}',
    'html body #pt-settings-modal button.pt-settings-fx[aria-pressed="false"]{border-color:var(--pt-border);background:var(--pt-surface-2);color:var(--pt-text-muted)}',
    'html body #pt-settings-modal button.pt-settings-fx .pt-settings-fx-dot{font-size:.9rem}',
    '@media (max-width:560px){html body #pt-settings-modal .pt-settings-card{padding:17px}html body #pt-settings-modal .pt-theme-grid{grid-template-columns:repeat(2,minmax(0,1fr))}html body #pt-settings-modal button.pt-theme-swatch{padding:7px;font-size:.72rem;gap:7px}html body #pt-settings-modal .pt-theme-preview{width:36px;height:32px}html body #pt-settings-modal .pt-settings-actions{width:100%}}',

    '/* personalized greeting */',
    'html body .pt-greeting{margin:2px 0 0;color:var(--pt-text);font-size:.95rem;font-weight:700}',
    'html body .pt-greeting-sub{margin:3px 0 12px;color:var(--pt-accent-secondary);font-size:.85rem;font-weight:600}',
    'html body #pt-auth-bar .pt-update-new{animation:ptNewPulse 1.8s ease-in-out infinite}',

    '/* ambient drifting orbs (theme-tinted, FX-toggle aware) */',
    '@keyframes ptOrbDriftA{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(6vw,5vh,0) scale(1.12)}100%{transform:translate3d(-3vw,9vh,0) scale(.96)}}',
    '@keyframes ptOrbDriftB{0%{transform:translate3d(0,0,0) scale(1.05)}50%{transform:translate3d(-7vw,-6vh,0) scale(.92)}100%{transform:translate3d(4vw,-10vh,0) scale(1.14)}}',
    'html body main{position:relative;z-index:1}',
    'html body .pt-ambient-orbs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;contain:strict}',
    'html body .pt-ambient-orbs .pt-orb{position:absolute;width:46vmax;height:46vmax;border-radius:50%;filter:blur(80px);opacity:.62;will-change:transform;transform:translate3d(0,0,0)}',
    'html body .pt-ambient-orbs .pt-orb-a{left:-14vmax;top:-18vmax;background:radial-gradient(circle,var(--pt-glow-1),transparent 68%);animation:ptOrbDriftA 26s ease-in-out infinite alternate}',
    'html body .pt-ambient-orbs .pt-orb-b{right:-15vmax;top:24vh;background:radial-gradient(circle,var(--pt-glow-2),transparent 68%);animation:ptOrbDriftB 32s ease-in-out infinite alternate}',
    'html[data-pt-theme="minimal"] .pt-ambient-orbs,html.pt-fx-off .pt-ambient-orbs{display:none!important}',
    'html[data-pt-theme="light"] .pt-ambient-orbs .pt-orb{opacity:.32;filter:blur(96px)}',
    '@media (prefers-reduced-motion:reduce){html body .pt-ambient-orbs .pt-orb{animation:none!important}}',

    '/* review flagged, personal notes and tactile question polish */',
    'html body button.pt-review-flag-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:999px;border:1px solid var(--pt-accent-border);background:var(--pt-accent-soft);color:var(--pt-text);font-size:.8rem;font-weight:800;cursor:pointer;white-space:nowrap;font-family:inherit;transition:transform .3s var(--pt-ease),border-color .3s var(--pt-ease),box-shadow .3s var(--pt-ease)}',
    'html body button.pt-review-flag-btn:hover{transform:translateY(-2px);border-color:var(--pt-accent-primary);box-shadow:0 0 22px var(--pt-glow-1)}',
    'html body button.pt-review-flag-btn:active{transform:scale(.98)}',
    'html body .pt-flag-banner{border-color:var(--pt-accent-border)!important;background:var(--pt-surface)!important;box-shadow:0 10px 30px var(--pt-shadow),0 0 22px var(--pt-glow-1)}',
    'html body .pt-flag-banner strong{color:var(--pt-accent-highlight)}',
    'html body .pt-flag-banner button{border:1px solid var(--pt-accent-border)!important;background:linear-gradient(135deg,var(--pt-accent-primary),var(--pt-accent-secondary))!important;color:var(--pt-on-accent)!important;border-radius:999px;padding:7px 12px;font-size:.78rem;font-weight:800;cursor:pointer;font-family:inherit;white-space:nowrap;transition:transform .3s var(--pt-ease),box-shadow .3s var(--pt-ease)}',
    'html body .pt-flag-banner button:hover{transform:translateY(-2px);box-shadow:0 0 22px var(--pt-glow-2)}',
    'html body button.pt-note-btn{min-width:112px}',
    'html body button.pt-note-btn.has-note{border-color:var(--pt-accent-border);background:var(--pt-accent-soft);color:var(--pt-accent-highlight)}',
    'html body .pt-note-badge{display:inline-flex;align-items:center;justify-content:center;margin-left:5px;padding:1px 5px;border-radius:999px;background:var(--pt-accent-soft);color:var(--pt-accent-highlight);font-size:.8rem}',
    'html body .pt-note-box[hidden]{display:none!important}',
    'html body .pt-note-box{margin-top:12px;padding:12px;border-radius:14px;background:var(--pt-surface-2);border:1px solid var(--pt-border);color:var(--pt-text);animation:fadeSlideUp .3s var(--pt-ease)}',
    'html body .pt-note-box label{display:block;margin:0 0 6px;color:var(--pt-text);font-size:.8rem;font-weight:800}',
    'html body .pt-note-box textarea{width:100%;min-height:76px;resize:vertical;padding:10px 12px;border-radius:10px;border:1px solid var(--pt-border);background:var(--pt-input);color:var(--pt-text);font:inherit;line-height:1.45;transition:border-color .3s var(--pt-ease),box-shadow .3s var(--pt-ease)}',
    'html body .pt-note-box textarea:focus{outline:none;border-color:var(--pt-accent-primary);box-shadow:0 0 0 3px var(--pt-accent-soft),0 0 20px var(--pt-glow-1)}',
    'html body .pt-note-box textarea::placeholder{color:var(--pt-text-muted)}',
    'html body .pt-note-box small{display:block;margin-top:6px;color:var(--pt-text-muted);font-size:.72rem}',
    'html body .pt-card-answered,html body .pt-card-noted,html body .pt-card-flagged{border-left:3px solid var(--pt-accent-primary)}',
    'html body .pt-card-noted{border-left-color:var(--pt-accent-secondary)}',
    'html body .pt-card-flagged{border-left-color:var(--pt-accent-highlight);box-shadow:0 14px 40px var(--pt-shadow),0 0 20px var(--pt-glow-1)}',
    'html body .choices button{transition:transform .3s var(--pt-ease),border-color .3s var(--pt-ease),box-shadow .3s var(--pt-ease),background .3s var(--pt-ease)}',
    'html body .choices button:not(:disabled):hover{transform:translateY(-2px);border-color:var(--pt-accent-primary);box-shadow:0 0 20px var(--pt-glow-1)}',
    'html body .choices button:not(:disabled):active{transform:scale(.97)}',

    '/* keyboard shortcut reference */',
    'html body #pt-settings-modal .pt-shortcut-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
    'html body #pt-settings-modal .pt-shortcut-pill{display:flex;align-items:center;gap:8px;min-width:0;padding:8px 10px;border-radius:12px;background:var(--pt-surface-2);border:1px solid var(--pt-border);color:var(--pt-text);font-size:.78rem;overflow-wrap:anywhere}',
    'html body #pt-settings-modal kbd{display:inline-block;min-width:26px;text-align:center;padding:3px 6px;border-radius:7px;background:var(--pt-accent-soft);border:1px solid var(--pt-accent-border);color:var(--pt-accent-highlight);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.74rem;font-weight:800}',
    '@media (max-width:420px){html body #pt-settings-modal .pt-shortcut-grid{grid-template-columns:1fr}}',

    '/* admin / user management modal */',
    'html body #pt-auth-admin-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,11,20,.82);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#f1f5f9;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    'html body #pt-auth-admin-modal .pt-auth-admin-card{width:min(680px,100%);max-height:min(86vh,760px);overflow:auto;background:rgba(15,23,42,.82);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border:1px solid rgba(148,163,184,.16);border-radius:20px;padding:22px;box-shadow:0 24px 70px rgba(2,6,23,.65);animation:ptModalIn .4s var(--pt-ease) backwards}',
    'html body #pt-auth-admin-modal .pt-auth-admin-head{display:flex;align-items:center;justify-content:space-between;gap:12px}',
    'html body #pt-auth-admin-modal .pt-auth-admin-head h2{margin:0;font-size:1.2rem;color:#f8fafc}',
    'html body #pt-auth-admin-modal .pt-auth-admin-head button{background:rgba(30,41,59,.65);border:1px solid rgba(148,163,184,.16);border-radius:999px;color:#e2e8f0;padding:6px 10px;cursor:pointer;font-family:inherit}',
    'html body #pt-auth-admin-modal .pt-auth-admin-head button:hover{border-color:rgba(56,189,248,.5)}',
    'html body #pt-auth-admin-modal .pt-auth-admin-sub{color:#94a3b8;margin:5px 0 12px;font-size:.85rem}',
    'html body #pt-auth-admin-modal .pt-auth-admin-msg{font-size:.85rem;color:#94a3b8;min-height:1.2em;margin:0 0 12px}',
    'html body #pt-auth-admin-modal .pt-auth-admin-msg.pt-auth-bad{color:#fca5a5}',
    'html body #pt-auth-admin-modal form.pt-auth-add{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px}',
    'html body #pt-auth-admin-modal input.pt-auth-input{flex:1 1 190px;min-width:0;padding:10px 12px;border-radius:10px;background:rgba(2,6,23,.55);border:1px solid rgba(148,163,184,.18);color:#f1f5f9;font:inherit;transition:border-color .3s var(--pt-ease),box-shadow .3s var(--pt-ease)}',
    'html body #pt-auth-admin-modal input.pt-auth-input:focus{outline:none;border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,.16)}',
    'html body #pt-auth-admin-modal .pt-auth-role-tag{font-size:.75rem;color:#94a3b8;border:1px solid rgba(148,163,184,.2);border-radius:999px;padding:5px 10px;white-space:nowrap}',
    'html body #pt-auth-admin-modal button.pt-auth-btn-small{padding:8px 12px;border-radius:10px;border:1px solid transparent;background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:#fff;font-size:.8rem;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit;transition:transform .25s var(--pt-ease),filter .25s var(--pt-ease)}',
    'html body #pt-auth-admin-modal button.pt-auth-btn-small:hover{filter:brightness(1.12)}',
    'html body #pt-auth-admin-modal button.pt-auth-btn-small:active{transform:scale(.98)}',
    'html body #pt-auth-admin-modal button[data-act]{padding:7px 10px;border-radius:8px;border:1px solid rgba(148,163,184,.16);background:rgba(30,41,59,.6);color:#e2e8f0;font-size:.78rem;cursor:pointer;white-space:nowrap;font-family:inherit;transition:transform .25s var(--pt-ease),border-color .25s var(--pt-ease)}',
    'html body #pt-auth-admin-modal button[data-act]:hover{border-color:rgba(56,189,248,.5);color:#fff}',
    'html body #pt-auth-admin-modal button[data-act]:active{transform:scale(.98)}',
    'html body #pt-auth-admin-modal .pt-auth-table-wrap{overflow:auto;border:1px solid rgba(148,163,184,.14);border-radius:12px}',
    'html body #pt-auth-admin-modal table.pt-auth-table{width:100%;border-collapse:collapse;font-size:.82rem}',
    'html body #pt-auth-admin-modal table.pt-auth-table th,html body #pt-auth-admin-modal table.pt-auth-table td{text-align:left;padding:9px 10px;border-bottom:1px solid rgba(148,163,184,.12);white-space:nowrap;color:#cbd5e1}',
    'html body #pt-auth-admin-modal table.pt-auth-table th{color:#94a3b8;font-weight:600;background:rgba(2,6,23,.35)}',
    'html body #pt-auth-admin-modal table.pt-auth-table tr:last-child td{border-bottom:0}',
    'html body #pt-auth-admin-modal .pt-auth-password{display:inline-block;padding:3px 8px;border-radius:6px;background:rgba(2,6,23,.55);border:1px solid rgba(148,163,184,.18);color:#bfdbfe;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.82rem}',
    'html body #pt-auth-admin-modal .pt-auth-muted{color:#64748b}',
    'html body #pt-auth-admin-modal table.pt-auth-table td.pt-auth-actions{display:flex;gap:6px}',
    '/* theme-aware overrides so every theme keeps crisp contrast */',
    'html[data-pt-theme] #pt-auth-gate{background:radial-gradient(760px 560px at 12% -8%,var(--pt-glow-1),transparent 62%),radial-gradient(700px 540px at 92% 18%,var(--pt-glow-2),transparent 62%),var(--pt-bg)!important;color:var(--pt-text)!important}',
    'html[data-pt-theme] #pt-auth-gate .pt-auth-card{background:var(--pt-surface)!important;border-color:var(--pt-border)!important;color:var(--pt-text)!important;box-shadow:0 0 28px var(--pt-glow-1),0 12px 32px rgba(0,0,0,0.45)!important}',
    'html[data-pt-theme] #pt-auth-admin-modal .pt-auth-admin-card,html[data-pt-theme] #pt-stats-modal .pt-stats-modal-card,html[data-pt-theme] #pt-updates-modal .pt-updates-card{background:var(--pt-surface)!important;border-color:var(--pt-border)!important;color:var(--pt-text)!important;box-shadow:0 24px 70px var(--pt-shadow)!important}',
    'html[data-pt-theme] #pt-auth-admin-modal,html[data-pt-theme] #pt-stats-modal,html[data-pt-theme] #pt-updates-modal{background:var(--pt-overlay)!important;color:var(--pt-text)!important}',
    'html[data-pt-theme] #pt-auth-gate h2,html[data-pt-theme] .pt-auth-admin-head h2,html[data-pt-theme] .pt-stats-modal-head h2,html[data-pt-theme] .pt-updates-head h2,html[data-pt-theme] .pt-stats-title{color:var(--pt-text)!important}',
    'html[data-pt-theme] #pt-auth-gate .pt-auth-lead,html[data-pt-theme] #pt-auth-gate .pt-auth-help,html[data-pt-theme] .pt-auth-admin-sub,html[data-pt-theme] .pt-auth-admin-msg,html[data-pt-theme] .pt-updates-head p,html[data-pt-theme] .pt-stats-num,html[data-pt-theme] .pt-stats-empty,html[data-pt-theme] .pt-auth-muted{color:var(--pt-text-muted)!important}',
    'html[data-pt-theme] #pt-auth-gate .pt-auth-chip,html[data-pt-theme] .pt-auth-role-tag{background:var(--pt-accent-soft)!important;border-color:var(--pt-accent-border)!important;color:var(--pt-text)!important}',
    'html[data-pt-theme] #pt-auth-gate .pt-auth-mark{background:linear-gradient(135deg,var(--pt-accent-primary),var(--pt-accent-secondary))!important;color:var(--pt-on-accent)!important;box-shadow:0 8px 24px var(--pt-shadow)!important}',
    'html[data-pt-theme] input.pt-auth-input{background:var(--pt-input)!important;border-color:var(--pt-border)!important;color:var(--pt-text)!important}',
    'html[data-pt-theme] input.pt-auth-input::placeholder{color:var(--pt-text-muted)!important}',
    'html[data-pt-theme] input.pt-auth-input:focus{border-color:var(--pt-accent-primary)!important;box-shadow:0 0 0 3px var(--pt-accent-soft),0 0 24px var(--pt-glow-2)!important}',
    'html[data-pt-theme] #pt-auth-gate .pt-auth-error{background:var(--pt-bad-soft)!important;border-color:var(--pt-bad)!important;color:var(--pt-bad)!important}',
    'html[data-pt-theme] button.pt-auth-back{color:var(--pt-accent-secondary)!important}',
    'html[data-pt-theme] button.pt-auth-primary,html[data-pt-theme] #pt-auth-admin-modal button.pt-auth-btn-small,html[data-pt-theme] button.pt-stats-btn:not(.ghost),html[data-pt-theme] .pt-stats-retry-banner button{background:linear-gradient(135deg,var(--pt-accent-primary),var(--pt-accent-secondary))!important;color:var(--pt-on-accent)!important;border-color:transparent!important}',
    'html[data-pt-theme] button.pt-stats-btn.ghost{background:transparent!important;color:var(--pt-accent-primary)!important;border-color:var(--pt-accent-border)!important}',
    'html[data-pt-theme] button.pt-stats-btn:disabled{background:var(--pt-surface-2)!important;color:var(--pt-text-muted)!important;border-color:var(--pt-border)!important}',
    'html[data-pt-theme] #pt-auth-admin-modal button[data-act],html[data-pt-theme] #pt-auth-admin-modal .pt-auth-admin-head button,html[data-pt-theme] #pt-stats-modal button.pt-stats-close,html[data-pt-theme] #pt-updates-modal button.pt-updates-close{background:var(--pt-surface-2)!important;border-color:var(--pt-border)!important;color:var(--pt-text)!important}',
    'html[data-pt-theme] .pt-stats-card,html[data-pt-theme] .pt-topic-card,html[data-pt-theme] .pt-format-pill,html[data-pt-theme] button.pt-pill-retry,html[data-pt-theme] .pt-stats-retry-banner,html[data-pt-theme] button.pt-stats-grade,html[data-pt-theme] .pt-auth-table-wrap,html[data-pt-theme] .pt-auth-password{background:var(--pt-surface-2)!important;border-color:var(--pt-border)!important;color:var(--pt-text)!important}',
    'html[data-pt-theme] body .pt-flag-banner{background:var(--pt-surface)!important;border-color:var(--pt-accent-border)!important;box-shadow:0 10px 30px var(--pt-shadow),0 0 22px var(--pt-glow-1)!important}',
    'html[data-pt-theme] body .pt-flag-banner strong{color:var(--pt-accent-highlight)!important}',
    'html[data-pt-theme] .pt-format-pill.is-perfect,html[data-pt-theme] .pt-format-pill.has-miss{background:var(--pt-surface-2)!important;border-color:var(--pt-accent-border)!important;color:var(--pt-text)!important}',
    'html[data-pt-theme] .pt-stats-name,html[data-pt-theme] .pt-stats-pct,html[data-pt-theme] .pt-auth-table td,html[data-pt-theme] .pt-update-title{color:var(--pt-text)!important}',
    'html[data-pt-theme] .pt-stats-section{color:var(--pt-accent-primary)!important}',
    'html[data-pt-theme] .pt-stats-bar{background:var(--pt-border)!important}',
    'html[data-pt-theme] .pt-stats-bar i.bar-ok{background:var(--pt-ok)!important}',
    'html[data-pt-theme] .pt-stats-bar i.bar-bad{background:var(--pt-bad)!important}',
    'html[data-pt-theme] .pt-stats-bar i.bar-answered{background:linear-gradient(90deg,var(--pt-accent-primary),var(--pt-accent-secondary))!important}',
    'html[data-pt-theme] .pt-stats-badge.ok{background:var(--pt-ok-soft)!important;border-color:var(--pt-ok)!important;color:var(--pt-ok)!important}',
    'html[data-pt-theme] .pt-stats-badge.bad{background:var(--pt-bad-soft)!important;border-color:var(--pt-bad)!important;color:var(--pt-bad)!important}',
    'html[data-pt-theme] .pt-stats-mastered{color:var(--pt-ok)!important}',
    'html[data-pt-theme] button.pt-stats-grade.correct.on{border-color:var(--pt-ok)!important;background:var(--pt-ok-soft)!important;color:var(--pt-ok)!important}',
    'html[data-pt-theme] button.pt-stats-grade.incorrect.on{border-color:var(--pt-bad)!important;background:var(--pt-bad-soft)!important;color:var(--pt-bad)!important}',
    'html[data-pt-theme] .pt-stats-retry-banner strong{color:var(--pt-accent-secondary)!important}',
    'html[data-pt-theme] .pt-greeting{color:var(--pt-text)!important}',
    'html[data-pt-theme] .pt-greeting-sub{color:var(--pt-accent-secondary)!important}',
    'html[data-pt-theme] .pt-auth-table th{background:var(--pt-surface-2)!important;color:var(--pt-text-muted)!important;border-color:var(--pt-border)!important}',
    'html[data-pt-theme] .pt-auth-table td{border-color:var(--pt-border)!important}',
    'html[data-pt-theme] .pt-auth-table tr:last-child td{border-bottom:0}',
    'html[data-pt-theme] .pt-auth-password{color:var(--pt-text)!important}',
    'html[data-pt-theme] #pt-auth-admin-modal .pt-auth-btn-small:hover{filter:brightness(1.1)}',
    'html[data-pt-theme] .pt-update-date{color:var(--pt-text-muted)!important}',
    'html[data-pt-theme] .pt-update-note{background:var(--pt-accent-soft)!important;border-color:var(--pt-accent-border)!important;color:var(--pt-accent-highlight)!important}',
    'html[data-pt-theme] .pt-update-version{background:linear-gradient(135deg,var(--pt-accent-primary),var(--pt-accent-secondary))!important;color:var(--pt-on-accent)!important}',
    'html[data-pt-theme] .pt-update-items{color:var(--pt-text)!important}',
    'html[data-pt-theme] .streak-badge{background:var(--pt-accent-soft)!important;border-color:var(--pt-accent-border)!important;color:var(--pt-accent-highlight)!important;box-shadow:0 0 20px var(--pt-glow-1)!important}',
    'html[data-pt-theme] .streak-badge[data-tier="fire"],html[data-pt-theme] .streak-badge[data-tier="crown"]{background:var(--pt-accent-soft)!important;border-color:var(--pt-accent-primary)!important;color:var(--pt-accent-highlight)!important}',
    'html[data-pt-theme] .pt-toast{background:var(--pt-surface)!important;border-color:var(--pt-accent-border)!important;color:var(--pt-accent-highlight)!important;box-shadow:0 12px 34px var(--pt-shadow)!important}',
    'html[data-pt-theme] #zo .zbar{background:var(--pt-surface-2)!important;border-bottom:1px solid var(--pt-border)!important;color:var(--pt-text)!important;box-shadow:0 2px 12px var(--pt-shadow)!important}',
    'html[data-pt-theme] #zm{background:var(--pt-overlay)!important}',
    '@media (max-width:520px){html body #pt-auth-gate .pt-auth-card{padding:22px}html body #pt-auth-bar{gap:7px;padding:7px 10px}html body #pt-auth-bar .pt-auth-sync{font-size:.7rem;padding:5px 8px}html body #pt-auth-bar .pt-auth-user-badge{font-size:.74rem;padding:5px 9px}html body #pt-auth-bar button.pt-auth-btn{padding:5px 9px;font-size:.74rem}html body #pt-auth-admin-modal .pt-auth-admin-card{padding:16px}}',
    '@media (prefers-reduced-motion:reduce){html *,html *::before,html *::after{animation-duration:.01ms!important;animation-delay:0ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}'
  ];
  var st=document.createElement('style');st.id='pt-auth-styles';st.textContent=css.join('\n');document.head.appendChild(st);
}
injectThemeCSS();
injectCSS();
setTheme(currentTheme(),true);

function lockPage(){
  document.body.classList.add('pt-auth-locked');
  document.body.style.overflow='hidden';
}
function unlockPage(){
  document.body.classList.remove('pt-auth-locked');
  if(document.body.style.overflow==='hidden')document.body.style.overflow='';
}

/* ---------- zero-dependency canvas confetti + effects toggle ---------- */

var FX_KEY='pt_fx_enabled';
var fxEnabled=(function(){var v=lsGet(FX_KEY);return v===null||v==='1'})();
var fxCanvas=null,fxCtx=null,fxParts=[],fxRAF=0,fxDpr=1;
function motionOK(){return !(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}
function ensureOrbs(){
  document.documentElement.classList.toggle('pt-fx-off',!fxEnabled);
  if(document.getElementById('pt-ambient-orbs')||!document.body)return;
  var d=document.createElement('div');d.id='pt-ambient-orbs';d.className='pt-ambient-orbs';
  d.innerHTML='<span class="pt-orb pt-orb-a"></span><span class="pt-orb pt-orb-b"></span>';
  document.body.appendChild(d);
}
ensureOrbs();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureOrbs,{once:true});
function sizeFX(){
  if(!fxCanvas)return;
  fxDpr=Math.min(2,window.devicePixelRatio||1);
  fxCanvas.width=Math.round(window.innerWidth*fxDpr);
  fxCanvas.height=Math.round(window.innerHeight*fxDpr);
  fxCanvas.style.width=window.innerWidth+'px';
  fxCanvas.style.height=window.innerHeight+'px';
  fxCtx=fxCanvas.getContext('2d');
  if(fxCtx)fxCtx.setTransform(fxDpr,0,0,fxDpr,0,0);
}
function ensureFX(){
  if(fxCanvas)return;
  fxCanvas=document.createElement('canvas');
  fxCanvas.id='pt-confetti';
  document.body.appendChild(fxCanvas);
  sizeFX();
  window.addEventListener('resize',sizeFX);
}
function stepFX(){
  fxRAF=0;
  if(!fxCtx)return;
  var w=window.innerWidth,h=window.innerHeight;
  fxCtx.clearRect(0,0,w,h);
  var alive=0,kept=[];
  for(var i=0;i<fxParts.length;i++){
    var p=fxParts[i];p.life++;
    if(p.life>p.max)continue;
    p.vy+=p.gravity;p.x+=p.vx;p.y+=p.vy;p.vx*=0.99;p.rot+=p.spin;
    var t=p.life/p.max;
    fxCtx.save();
    fxCtx.globalAlpha=Math.max(0,1-t*t);
    fxCtx.translate(p.x,p.y);
    fxCtx.rotate(p.rot);
    fxCtx.fillStyle=p.color;
    if(p.round){fxCtx.beginPath();fxCtx.arc(0,0,p.w/2,0,Math.PI*2);fxCtx.fill()}
    else fxCtx.fillRect(-p.w/2,-p.h/2,p.w,p.h*(0.6+Math.abs(Math.cos(p.rot))*0.4));
    fxCtx.restore();
    kept.push(p);alive++;
  }
  fxParts=kept;
  if(alive)fxRAF=requestAnimationFrame(stepFX);
  else fxCtx.clearRect(0,0,w,h);
}
function burst(originEl,options){
  if(!fxEnabled||!motionOK())return;
  options=options||{};
  var rect=originEl&&originEl.getBoundingClientRect?originEl.getBoundingClientRect():null;
  var x=typeof options.x==='number'?options.x:(rect?rect.left+rect.width/2:window.innerWidth/2);
  var y=typeof options.y==='number'?options.y:(rect?rect.top+rect.height/2:window.innerHeight/2);
  var count=typeof options.count==='number'?Math.max(1,Math.min(64,options.count)):(20+Math.floor(Math.random()*9));
  var colors=options.colors||['#38bdf8','#6366f1','#34d399','#fbbf24','#f472b6','#f8fafc'];
  var power=options.power||1,spread=options.spread||1;
  ensureFX();
  for(var k=0;k<count;k++){
    var a=-Math.PI/2+(Math.random()-0.5)*Math.PI*1.1*spread;
    var speed=(2.8+Math.random()*4.5)*power;
    fxParts.push({x:x+(Math.random()-0.5)*10,y:y+(Math.random()-0.5)*10,
      vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
      gravity:0.15+Math.random()*0.09,rot:Math.random()*Math.PI*2,
      spin:(Math.random()-0.5)*0.36,w:5+Math.random()*6,h:3+Math.random()*5,
      life:0,max:48+Math.floor(Math.random()*14),
      color:colors[k%colors.length],round:Math.random()<0.24});
  }
  if(!fxRAF)fxRAF=requestAnimationFrame(stepFX);
}
function confettiShower(){
  if(!fxEnabled||!motionOK())return;
  [0.16,0.4,0.64,0.88].forEach(function(frac,k){
    setTimeout(function(){burst(null,{x:window.innerWidth*frac,y:window.innerHeight*0.1+Math.random()*36,count:26,power:1.35,spread:1.5})},k*120);
  });
}
function streakToast(n){
  if(!fxEnabled||!motionOK())return;
  var text=n>=15?'Topic mastered! 💯':(n>=10?'10 streak — unstoppable! 👑':'5 in a row — locked in! 🔥');
  var el=document.createElement('div');
  el.className='pt-toast';
  el.textContent=text;
  document.body.appendChild(el);
  setTimeout(function(){el.classList.add('pt-toast-out')},1800);
  setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el)},2250);
}
function streakMilestone(n){
  if(!fxEnabled||!motionOK())return;
  window.PTCelebrate.burst(null,{x:window.innerWidth/2,y:window.innerHeight*0.24,
    count:48,power:1.5,spread:1.7,
    colors:['#fbbf24','#fde68a','#38bdf8','#34d399','#a78bfa','#f472b6']});
  streakToast(n);
}
function fxLabel(){
  var b=settingsModal&&settingsModal.querySelector('#pt-settings-fx');
  if(!b)return;
  b.innerHTML='<span class="pt-settings-fx-dot">'+(fxEnabled?'🎉':'🔕')+'</span><span>'+(fxEnabled?'Effects On':'Effects Off')+'</span>';
  b.setAttribute('aria-pressed',fxEnabled?'true':'false');
  b.title=fxEnabled?'Mute animations':'Turn animations on';
}
function updateUpdatesButton(){
  var b=bar&&bar.querySelector('#pt-updates-btn');
  if(!b)return;
  var latest=PT_UPDATES.length?PT_UPDATES[0].version:'';
  var seen=lsGet('pt_seen_update_version');
  b.innerHTML='<span>Updates</span>'+(latest&&seen!==latest?'<span class="pt-update-new">NEW</span>':'');
  b.setAttribute('aria-label',latest&&seen!==latest?'Updates — new in '+latest:'Updates');
  b.title=latest&&seen!==latest?'See what’s new in '+latest:'View release notes';
}
function setEffects(on){
  fxEnabled=!!on;
  lsSet(FX_KEY,fxEnabled?'1':'0');
  if(!fxEnabled){fxParts=[];if(fxCtx)fxCtx.clearRect(0,0,window.innerWidth,window.innerHeight)}
  ensureOrbs();
  fxLabel();
}
function soundLabel(){
  var b=settingsModal&&settingsModal.querySelector('#pt-settings-sound');
  if(!b)return;
  var on=PTSound.enabled();
  b.innerHTML='<span class="pt-settings-fx-dot">'+(on?'🔊':'🔇')+'</span><span>'+(on?'Sounds On':'Sounds Off')+'</span>';
  b.setAttribute('aria-pressed',on?'true':'false');
  b.title=on?'Mute sound effects':'Turn sound effects on';
}
function setSounds(on){
  PTSound.setEnabled(!!on);
  soundLabel();
  if(on)PTSound.pop();
}
var PTCelebrate={
  burst:burst,shower:confettiShower,streakMilestone:streakMilestone,toast:streakToast,
  setEnabled:setEffects,
  toggle:function(){setEffects(!fxEnabled)},
  enabled:function(){return fxEnabled},
  particleCount:function(){return fxParts.length}
};
window.PTCelebrate=PTCelebrate;

/* ---------- zero-dependency Web Audio UI & feedback sounds ----------
   The context is only created/resumed inside a real user gesture, so browsers
   never log an autoplay warning. No <audio> tags or external files are used. */

var SOUND_KEY='pt_sounds';
var audioCtx=null,soundReady=false,soundArmed=false;
function soundEnabled(){var v=lsGet(SOUND_KEY);return v===null||v===''||v==='on'}
function armSound(){
  if(soundArmed)return;
  soundArmed=true;
  try{
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    if(!audioCtx)audioCtx=new AC();
    if(audioCtx.state==='suspended'&&typeof audioCtx.resume==='function'){
      var p=audioCtx.resume();if(p&&typeof p.catch==='function')p.catch(function(){});
    }
    soundReady=!!audioCtx;
  }catch(e){audioCtx=null;soundReady=false}
}
if(document.addEventListener){
  document.addEventListener('pointerdown',armSound,{once:true,capture:true,passive:true});
  document.addEventListener('keydown',armSound,{once:true,capture:true,passive:true});
}
function playTone(freq,delay,dur,vol,type,endFreq){
  if(!soundEnabled()||!soundReady||!audioCtx)return;
  try{
    var t0=audioCtx.currentTime+delay;
    var osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
    osc.type=type||'sine';
    osc.frequency.setValueAtTime(freq,t0);
    if(endFreq)osc.frequency.exponentialRampToValueAtTime(endFreq,t0+dur);
    gain.gain.setValueAtTime(0.0001,t0);
    gain.gain.exponentialRampToValueAtTime(vol,t0+Math.min(0.015,dur/3));
    gain.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    osc.connect(gain);gain.connect(audioCtx.destination);
    osc.start(t0);osc.stop(t0+dur+0.02);
  }catch(e){}
}
var PTSound={
  correct:function(){playTone(523,0,0.085,0.045,'sine');playTone(659,0.075,0.085,0.04,'sine')},
  streak:function(){[523,659,784,1046].forEach(function(f,k){playTone(f,k*0.07,0.075,0.045,'sine')})},
  wrong:function(){playTone(190,0,0.14,0.035,'triangle',140)},
  flag:function(){playTone(700,0,0.035,0.03,'sine');playTone(900,0.035,0.035,0.028,'sine')},
  pop:function(){playTone(420,0,0.04,0.028,'sine')},
  enabled:soundEnabled,
  setEnabled:function(on){lsSet(SOUND_KEY,on?'on':'off')},
  toggle:function(){var on=!soundEnabled();setSounds(on);return on},
  ready:function(){return soundReady}
};
window.PTSound=PTSound;

/* Thin Supabase PostgREST client: every request carries the publishable key. */
async function sb(path,options){
  options=options||{};
  var headers={apikey:ANON_KEY,Authorization:'Bearer '+ANON_KEY,'Content-Type':'application/json'};
  if(options.headers){Object.keys(options.headers).forEach(function(k){headers[k]=options.headers[k]})}
  var res;
  try{
    res=await fetch(SUPABASE_URL+'/rest/v1/'+path,{
      method:options.method||'GET',headers:headers,
      body:options.body==null?undefined:options.body
    });
  }catch(e){throw new Error('Network unavailable. Your answers are saved on this device.')}
  if(!res.ok){
    var detail='';
    try{var j=await res.json();detail=j.message||j.details||j.hint||''}catch(e){}
    throw new Error(detail||('Request failed ('+res.status+')'));
  }
  if(res.status===204||res.status===205)return null;
  var text=await res.text();
  if(!text)return null;
  try{return JSON.parse(text)}catch(e){return null}
}

/* ---------- login gate ---------- */

function ensureGate(){
  if(gate)return gate;
  lockPage();
  gate=document.createElement('div');gate.id='pt-auth-gate';gate.className='pt-auth-gate';
  document.body.appendChild(gate);
  return gate;
}
function gateCard(inner){
  ensureGate();
  gate.innerHTML='<div class="pt-auth-card"><div class="pt-auth-mark">PT</div>'+inner+'<p class="pt-auth-help">'+HELP+'</p></div>';
}
function gateError(msg){var e=gate&&gate.querySelector('.pt-auth-error');if(e)e.textContent=msg||''}
function gateBusy(btn,label){if(!btn)return;btn.disabled=true;btn.textContent=label||'Please wait\u2026'}
function gateIdle(btn,label){if(!btn||!btn.isConnected)return;btn.disabled=false;btn.textContent=label}

function renderGate(step,message){
  lockPage();
  if(step==='checking'){
    gateCard('<h2>Checking your session\u2026</h2><div class="pt-auth-loading"><span class="pt-auth-spinner"></span><span>One moment</span></div>');
    return;
  }
  if(step==='user'){
    gateCard('<h2>Sign in to Practice Tests</h2><p class="pt-auth-lead">Your progress stays in sync across devices.</p>'+
      '<p class="pt-auth-error"></p><form id="pt-auth-form"><label class="pt-auth-label" for="pt-auth-user">Username</label>'+
      '<input class="pt-auth-input" id="pt-auth-user" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="Your username">'+
      '<button class="pt-auth-primary" type="submit">Continue</button></form>');
    if(message)gateError(message);
    var u=gate.querySelector('#pt-auth-user');if(u)u.focus();
    wireForm(handleUsername);
    return;
  }
  if(step==='password'){
    gateCard('<span class="pt-auth-chip">'+esc(displayName(pendingUser?pendingUser.username:''))+'</span>'+
      '<h2>Welcome back</h2><p class="pt-auth-lead">Enter your password to continue.</p>'+
      '<p class="pt-auth-error"></p><form id="pt-auth-form"><label class="pt-auth-label" for="pt-auth-pass">Password</label>'+
      '<input class="pt-auth-input" id="pt-auth-pass" type="password" autocomplete="current-password" placeholder="Your password">'+
      '<button class="pt-auth-primary" type="submit">Log In</button><button class="pt-auth-back" type="button" data-back="1">\u2190 Use a different username</button></form>');
    wireForm(handleLogin);wireBack();
    var p=gate.querySelector('#pt-auth-pass');if(p)p.focus();
    return;
  }
  /* create */
  gateCard('<span class="pt-auth-chip">'+esc(displayName(pendingUser?pendingUser.username:''))+'</span>'+
    '<h2>Create Your Password</h2><p class="pt-auth-lead">First time here? Choose a password (at least 4 characters).</p>'+
    '<p class="pt-auth-error"></p><form id="pt-auth-form"><label class="pt-auth-label" for="pt-auth-new">New Password</label>'+
    '<input class="pt-auth-input" id="pt-auth-new" type="password" autocomplete="new-password" placeholder="At least 4 characters">'+
    '<label class="pt-auth-label" for="pt-auth-confirm">Confirm Password</label>'+
    '<input class="pt-auth-input" id="pt-auth-confirm" type="password" autocomplete="new-password" placeholder="Repeat your password">'+
    '<button class="pt-auth-primary" type="submit">Save Password &amp; Enter</button>'+
    '<button class="pt-auth-back" type="button" data-back="1">\u2190 Use a different username</button></form>');
  wireForm(handleCreate);wireBack();
  var n=gate.querySelector('#pt-auth-new');if(n)n.focus();
}
function wireBack(){
  var b=gate.querySelector('[data-back]');
  if(b)b.onclick=function(){pendingUser=null;renderGate('user')};
}
function wireForm(handler){
  var form=gate.querySelector('#pt-auth-form');
  if(!form)return;
  form.onsubmit=async function(e){
    e.preventDefault();
    var btn=form.querySelector('.pt-auth-primary');
    gateError('');gateBusy(btn);
    try{await handler(form)}catch(err){gateError((err&&err.message)||'Something went wrong. Please try again.')}
    finally{gateIdle(btn,btn&&btn.dataset.label?btn.dataset.label:(form.querySelector('#pt-auth-pass')?'Log In':form.querySelector('#pt-auth-new')?'Save Password & Enter':'Continue'))}
  };
}
async function handleUsername(form){
  var name=norm(form.querySelector('#pt-auth-user').value);
  if(!name){gateError('Enter your username.');return}
  var rows=await sb('app_users?username=eq.'+enc(name)+'&select=*');
  if(!rows||!rows.length){gateError(NOT_FOUND);return}
  pendingUser=rows[0];
  renderGate(pendingUser.password?'password':'create');
}
async function handleLogin(form){
  var pw=form.querySelector('#pt-auth-pass').value;
  if(!pw){gateError('Enter your password.');return}
  if(!pendingUser)return;
  var rows=await sb('app_users?username=eq.'+enc(pendingUser.username)+'&select=username,role,password');
  var row=rows&&rows[0];
  if(!row){pendingUser=null;renderGate('user','Account not found. To sign up, contact Big P.');return}
  if(!row.password){pendingUser=row;renderGate('create');return}
  if(pw!==row.password){gateError(WRONG_PASSWORD);return}
  saveSession(row.username,row.role);
  unlock(session);
}
async function handleCreate(form){
  var pw=form.querySelector('#pt-auth-new').value;
  var confirm=form.querySelector('#pt-auth-confirm').value;
  if(pw.length<4){gateError('Password must be at least 4 characters.');return}
  if(pw!==confirm){gateError('Passwords do not match.');return}
  if(!pendingUser)return;
  await sb('app_users?username=eq.'+enc(pendingUser.username),{
    method:'PATCH',body:JSON.stringify({password:pw,created_at:new Date().toISOString()}),headers:{'Prefer':'return=minimal'}
  });
  saveSession(pendingUser.username,pendingUser.role);
  unlock(session);
}

/* ---------- logged-in user bar ---------- */

function ensureBar(){
  if(bar)return bar;
  bar=document.createElement('div');bar.id='pt-auth-bar';bar.className='pt-auth-userbar';
  bar.innerHTML='<span class="pt-auth-sync" id="pt-auth-sync"></span>'+
    '<span class="pt-auth-user-badge" id="pt-auth-user-badge"></span>'+
    '<button type="button" class="pt-auth-btn pt-updates-btn" id="pt-updates-btn"></button>'+
    '<button type="button" class="pt-auth-btn pt-settings-btn" id="pt-settings-btn" aria-label="Settings" title="Settings">⚙️</button>';
  document.body.insertBefore(bar,document.body.firstChild);
  bar.querySelector('#pt-updates-btn').onclick=openUpdatesModal;
  bar.querySelector('#pt-settings-btn').onclick=openSettings;
  updateUpdatesButton();
  setSync(SAVED);
  return bar;
}
function setSync(text,warn){
  ensureBar();
  var el=bar.querySelector('#pt-auth-sync');
  if(el){el.textContent=text;el.classList.toggle('pt-auth-warn',!!warn)}
}
function unlock(s){
  session=s||getSession();
  if(!session)return;
  ensureBar();
  bar.classList.add('pt-auth-on');
  bar.querySelector('#pt-auth-user-badge').textContent=displayName(session.username);
  setSync(SAVED);
  if(gate)gate.remove();
  gate=null;
  unlockPage();
  callbacks.unlock.forEach(function(fn){try{fn(session)}catch(e){}});
}
function lock(){
  clearSession();
  if(adminModal)closeAdmin();
  if(settingsModal)closeSettings();
  if(bar)bar.classList.remove('pt-auth-on');
  renderGate('user');
  callbacks.lock.forEach(function(fn){try{fn()}catch(e){}});
}
async function verifySession(s){
  try{
    var rows=await sb('app_users?username=eq.'+enc(s.username)+'&select=username,role');
    if(!rows||!rows.length)return null;
    return {username:norm(rows[0].username),role:rows[0].role||'student'};
  }catch(e){return s} /* offline: keep the locally stored session */
}
function boot(){
  if(booted)return;
  booted=true;
  ensureBar();
  var s=getSession();
  if(!s){renderGate('user');return}
  renderGate('checking');
  verifySession(s).then(function(valid){
    if(valid&&valid.username){session=valid;lsSet(K_ROLE,valid.role||'student');unlock(valid)}
    else{clearSession();renderGate('user')}
  });
}

/* ---------- admin / user management ---------- */

function adminMsg(text,bad){
  if(!adminModal)return;
  var el=adminModal.querySelector('#pt-auth-admin-msg');
  if(el){el.textContent=text||'';el.classList.toggle('pt-auth-bad',!!bad)}
}
async function refreshAdmin(){
  if(!adminModal)return;
  var body=adminModal.querySelector('#pt-auth-admin-rows');
  try{
    var rows=await sb('app_users?select=username,role,password,created_at&order=created_at.asc');
    if(!body||!body.isConnected)return;
    body.innerHTML=(rows||[]).map(function(r){
      var hidePassword=(r.role==='admin'||r.username==='admin');
      return '<tr><td><b>'+esc(displayName(r.username))+'</b></td><td>'+esc(r.role||'student')+'</td>'+
        '<td>'+(hidePassword?'<span class="pt-auth-muted">Hidden</span>':(r.password?'<code class="pt-auth-password">'+esc(r.password)+'</code>':'<span class="pt-auth-muted">Not set</span>'))+'</td>'+
        '<td>'+(r.password&&r.created_at?esc(r.created_at.slice(0,10)):'<span class="pt-auth-muted">\u2014</span>')+'</td>'+
        '<td class="pt-auth-actions"><button type="button" data-act="reset" data-user="'+esc(r.username)+'">Reset Password</button>'+
        (r.role==='student'?'<button type="button" data-act="delete" data-user="'+esc(r.username)+'">Delete User</button>':'')+'</td></tr>';
    }).join('');
    if(!rows||!rows.length)body.innerHTML='<tr><td colspan="5">No users yet.</td></tr>';
  }catch(e){adminMsg((e&&e.message)||'Could not load users.',true)}
}
function closeAdmin(){
  if(adminKeyHandler){document.removeEventListener('keydown',adminKeyHandler);adminKeyHandler=null}
  if(adminModal)adminModal.remove();
  adminModal=null;
}
function openAdmin(){
  if(!session||!(session.role==='main'||session.role==='admin'))return;
  if(adminModal)return;
  adminModal=document.createElement('div');adminModal.className='pt-auth-admin-modal';adminModal.id='pt-auth-admin-modal';
  adminModal.innerHTML='<div class="pt-auth-admin-card" role="dialog" aria-modal="true" aria-label="User management">'+
    '<div class="pt-auth-admin-head"><h2>User Management</h2><button type="button" data-act="close" aria-label="Close">\u2715</button></div>'+
    '<p class="pt-auth-admin-sub">Reset passwords, add students and remove accounts.</p>'+
    '<p class="pt-auth-admin-msg" id="pt-auth-admin-msg"></p>'+
    '<form class="pt-auth-add" id="pt-auth-add-form"><input class="pt-auth-input" id="pt-auth-new-user" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="New username">'+
    '<span class="pt-auth-role-tag">role: student</span><button class="pt-auth-btn-small" type="submit">Add New User</button></form>'+
    '<div class="pt-auth-table-wrap"><table class="pt-auth-table"><thead><tr><th>User</th><th>Role</th><th>Password</th><th>Password Set</th><th>Actions</th></tr></thead>'+
    '<tbody id="pt-auth-admin-rows"><tr><td colspan="5">Loading\u2026</td></tr></tbody></table></div></div>';
  document.body.appendChild(adminModal);
  adminModal.addEventListener('click',function(e){if(e.target===adminModal)closeAdmin()});
  adminKeyHandler=function(e){if(e.key==='Escape')closeAdmin()};
  document.addEventListener('keydown',adminKeyHandler);
  adminModal.querySelector('#pt-auth-add-form').onsubmit=async function(e){
    e.preventDefault();
    var input=adminModal.querySelector('#pt-auth-new-user');
    var u=norm(input.value);
    if(!u){adminMsg('Enter a username.',true);return}
    try{
      await sb('app_users',{method:'POST',headers:{'Prefer':'return=minimal'},
        body:JSON.stringify({username:u,role:'student',password:null,created_at:new Date().toISOString()})});
      input.value='';adminMsg('Added '+displayName(u)+'. They can set a password on their first login.');
      await refreshAdmin();
    }catch(err){adminMsg((err&&err.message)||'Could not add user.',true)}
  };
  adminModal.addEventListener('click',async function(e){
    var b=e.target.closest('[data-act]');if(!b)return;
    var act=b.dataset.act,u=b.dataset.user;
    if(act==='close'){closeAdmin();return}
    if(!u||!adminModal)return;
    try{
      if(act==='reset'){
        await sb('app_users?username=eq.'+enc(u),{method:'PATCH',headers:{'Prefer':'return=minimal'},body:JSON.stringify({password:null})});
        adminMsg('Password reset for '+displayName(u)+'. They will create a new password next login.');
        await refreshAdmin();
      }else if(act==='delete'){
        if(b.dataset.confirmed!=='1'){b.dataset.confirmed='1';b.textContent='Confirm delete?';return}
        await sb('app_users?username=eq.'+enc(u),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
        adminMsg('Deleted '+displayName(u)+'.');
        await refreshAdmin();
      }
    }catch(err){adminMsg((err&&err.message)||'Action failed.',true)}
  });
  refreshAdmin();
}

/* ---------- progress sync + score statistics ---------- */

function pKey(user,testId){return 'pt_progress_'+user+'_'+testId}
function pRead(user,testId){
  var k=pKey(user,testId);
  try{var raw=localStorage.getItem(k);if(raw)return JSON.parse(raw)}catch(e){}
  try{return mem[k]?JSON.parse(mem[k]):null}catch(e){return null}
}
function pWrite(user,testId,val){
  var k=pKey(user,testId),raw=JSON.stringify(val);
  mem[k]=raw;
  try{localStorage.setItem(k,raw)}catch(e){}
}
function asMap(v){
  if(!v)return {};
  if(Array.isArray(v)){var o={};v.forEach(function(x,i){o[i]=x});return o}
  return typeof v==='object'?v:{};
}
/* __stats is derived data: never feed it back into question inputs. */
function stripStats(v){
  var src=asMap(v),out={};
  Object.keys(src).forEach(function(k){if(k!=='__stats')out[k]=src[k]});
  return out;
}
function countAnswers(v){
  var src=asMap(v),n=0;
  Object.keys(src).forEach(function(k){if(k!=='__stats'&&k!=='__notes')n++});
  return n;
}
function gradeAnswer(q,val){
  if(val==null||val==='')return null;
  if(q.written){
    if(val==='CORRECT'||val==='gotit')return 'correct';
    if(val==='INCORRECT'||val==='missit')return 'incorrect';
    return null;
  }
  if(!q.correct)return null;
  return val===q.correct?'correct':'incorrect';
}
function qFormats(q){return q.formats||(q.format?[q.format]:[])}
function qTopics(q){return q.topics||(q.topic?[q.topic]:[])}
function scopeMatches(q,scope){
  if(!q)return false;
  if(!scope||scope==='all')return true;
  if(scope.indexOf('format:')===0)return qFormats(q).indexOf(scope.slice(7))>=0;
  if(scope.indexOf('topic:')===0){
    var parts=scope.split(':');
    if(qTopics(q).indexOf(parts[1])<0)return false;
    return parts.length<3||qFormats(q).indexOf(parts[2])>=0;
  }
  return (q.cats||[]).indexOf(scope)>=0;
}
function blankStats(){return {answered:0,correct:0,incorrect:0,total:0}}
function computeStats(catalog,answers){
  if(!catalog||!catalog.questions)return null;
  var formats=catalog.formats||[],topics=catalog.topics||[],cats=catalog.categories||[];
  var overall=blankStats();overall.total=catalog.questions.length;
  var fPer={},tPer={},cPer={};
  var nestedIds=['mcq','written'],nestedLabels={mcq:'Multiple Choice',written:'Written Response'};
  formats.forEach(function(c){
    fPer[c.id]=blankStats();
    if(nestedLabels[c.id])nestedLabels[c.id]=c.label||nestedLabels[c.id];
  });
  topics.forEach(function(c){
    var p=blankStats(),nested={};
    nestedIds.forEach(function(fid){nested[fid]=blankStats()});
    p.formats=nested;tPer[c.id]=p;
  });
  cats.forEach(function(c){cPer[c.id]=blankStats()});
  catalog.questions.forEach(function(q){
    var fmts=qFormats(q);
    fmts.forEach(function(id){if(fPer[id])fPer[id].total++});
    qTopics(q).forEach(function(id){
      var p=tPer[id];if(!p)return;
      p.total++;
      fmts.forEach(function(fid){var sf=p.formats[fid];if(sf)sf.total++});
    });
    (q.cats||[]).forEach(function(id){if(cPer[id])cPer[id].total++});
    var g=gradeAnswer(q,answers[q.id]);
    if(!g)return;
    overall[g]++;overall.answered++;
    fmts.forEach(function(id){var p=fPer[id];if(p){p[g]++;p.answered++}});
    qTopics(q).forEach(function(id){
      var p=tPer[id];if(!p)return;
      p[g]++;p.answered++;
      fmts.forEach(function(fid){var sf=p.formats[fid];if(sf){sf[g]++;sf.answered++}});
    });
    (q.cats||[]).forEach(function(id){var p=cPer[id];if(p){p[g]++;p.answered++}});
  });
  return {
    overall:overall,
    formats:formats.map(function(c){var p=fPer[c.id];p.id=c.id;p.label=c.label;return p}),
    topics:topics.map(function(c){
      var p=tPer[c.id],nested=p.formats;
      p.formats=nestedIds.map(function(fid){
        var sf=nested[fid];sf.id=fid;sf.label=nestedLabels[fid];return sf;
      });
      p.id=c.id;p.label=c.label;return p;
    }),
    /* Combined legacy view: categories registered by the page (formats for
       Physics, body systems for Biology). */
    subcategories:cats.map(function(c){var p=cPer[c.id];p.id=c.id;p.label=c.label;return p})
  };
}
function currentUser(){return session?session.username:''}

function filterKey(testId){return 'pt_launch_filter_'+testId}
function setLaunchFilter(testId,filter){
  try{sessionStorage.setItem(filterKey(testId),JSON.stringify(filter||{}))}catch(e){}
}
function takeLaunchFilter(testId){
  try{
    var raw=sessionStorage.getItem(filterKey(testId));
    if(!raw)return null;
    sessionStorage.removeItem(filterKey(testId));
    return JSON.parse(raw);
  }catch(e){return null}
}
function continueKey(testId){return 'pt_continue_'+testId}
function setContinue(testId){
  try{sessionStorage.setItem(continueKey(testId),'1')}catch(e){}
}
function takeContinue(testId){
  try{
    var on=sessionStorage.getItem(continueKey(testId))==='1';
    sessionStorage.removeItem(continueKey(testId));
    return on;
  }catch(e){return false}
}
function nextQuestionId(catalog,answers){
  if(!catalog||!catalog.questions)return '';
  for(var i=0;i<catalog.questions.length;i++){
    var q=catalog.questions[i];
    if(!gradeAnswer(q,answers[q.id]))return q.id;
  }
  return '';
}

function createProgress(cfg){
  var testId=cfg.testId,timer=null,catalog=cfg.catalog||null;
  function snapshot(){
    var s=cfg.get()||{};
    return {answers:stripStats(s.answers),flags:asMap(s.flags),lastQuestionId:s.lastQuestionId||''};
  }
  function statsWithMeta(s){
    var st=computeStats(catalog,s.answers);
    if(st){
      st.lastQuestionId=s.lastQuestionId||'';
      st.nextQuestionId=nextQuestionId(catalog,s.answers);
    }
    return st;
  }
  function payload(){
    var s=snapshot(),answers={};
    Object.keys(s.answers).forEach(function(k){answers[k]=s.answers[k]});
    var stats=statsWithMeta(s);
    if(stats)answers.__stats=stats;
    return {answers:answers,flags:s.flags,updated_at:new Date().toISOString()};
  }
  function persist(){pWrite(currentUser(),testId,payload())}
  function restoreLocal(){
    var raw=pRead(currentUser(),testId)||{},st=asMap(raw.answers).__stats||{};
    cfg.set({answers:stripStats(raw.answers),flags:asMap(raw.flags),lastQuestionId:st.lastQuestionId||''});
  }
  async function loadCloud(){
    if(!currentUser())return;
    setSync(SAVED);
    try{
      var list=await sb('user_progress?username=eq.'+enc(currentUser())+'&test_id=eq.'+enc(testId)+'&select=*');
      if(list&&list.length){
        var saved=asMap(list[0].answers),st=asMap(saved.__stats)||{};
        cfg.set({answers:stripStats(saved),flags:asMap(list[0].flags),lastQuestionId:st.lastQuestionId||''});
        persist();
      }
      setSync(SAVED);
    }catch(e){setSync('Offline \u2014 saved locally',true)}
  }
  async function push(){
    if(!currentUser())return;
    var p=payload();
    try{
      await sb('user_progress',{
        method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify({username:currentUser(),test_id:testId,answers:p.answers,flags:p.flags,updated_at:p.updated_at})
      });
      setSync(SAVED);
    }catch(e){setSync('Offline \u2014 saved locally',true)}
  }
  function changed(){
    persist();
    setSync(SYNCING);
    if(timer)clearTimeout(timer);
    timer=setTimeout(function(){timer=null;push()},600);
  }
  function flush(){
    if(timer){clearTimeout(timer);timer=null}
    persist();setSync(SYNCING);
    return push();
  }
  function reset(){
    cfg.set({answers:{},flags:{},lastQuestionId:''});
    return flush();
  }
  function clearIncorrect(scope){
    var s=snapshot(),removed=0;
    (catalog&&catalog.questions?catalog.questions:[]).forEach(function(q){
      if(!scopeMatches(q,scope))return;
      if(gradeAnswer(q,s.answers[q.id])==='incorrect'){delete s.answers[q.id];removed++}
    });
    cfg.set({answers:s.answers,flags:s.flags,lastQuestionId:s.lastQuestionId});
    return flush();
  }
  var api={
    restoreLocal:restoreLocal,loadCloud:loadCloud,changed:changed,push:push,
    reset:reset,clearIncorrect:clearIncorrect,flush:flush,
    answers:function(){return snapshot().answers},flags:function(){return snapshot().flags},
    stats:function(){return statsWithMeta(snapshot())},
    catalog:function(){return catalog},
    count:function(){return countAnswers(snapshot().answers)}
  };
  progressRegistry[testId]=api;
  return api;
}
async function rows(){
  if(!currentUser())return {};
  try{
    var list=await sb('user_progress?username=eq.'+enc(currentUser())+'&select=test_id,answers,updated_at');
    var out={};
    (list||[]).forEach(function(r){out[r.test_id]=asMap(r.answers)});
    return out;
  }catch(e){return {}}
}
async function counts(){
  var all=await rows(),out={};
  Object.keys(all).forEach(function(k){out[k]=countAnswers(all[k])});
  return out;
}
async function flagCounts(){
  if(!currentUser())return {};
  try{
    var list=await sb('user_progress?username=eq.'+enc(currentUser())+'&select=test_id,flags'),out={};
    (list||[]).forEach(function(r){
      var n=Object.keys(asMap(r.flags)).length;
      if(n)out[r.test_id]=n;
    });
    return out;
  }catch(e){return {}}
}
async function resetTest(testId){
  var user=norm(currentUser());
  if(!user||!testId)return false;
  try{sessionStorage.removeItem(filterKey(testId));sessionStorage.removeItem(continueKey(testId))}catch(e){}
  var inst=progressRegistry[testId];
  if(inst){await inst.reset()}
  else{
    pWrite(user,testId,{answers:{},flags:{},lastQuestionId:''});
    try{
      await sb('user_progress',{
        method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify({username:user,test_id:testId,answers:{},flags:{},updated_at:new Date().toISOString()})
      });
      setSync(SAVED);
    }catch(e){setSync('Offline — saved locally',true)}
  }
  try{
    document.dispatchEvent(new CustomEvent('pt-progress-reset',{detail:{testId:testId}}));
  }catch(e){}
  return true;
}

/* ---------- shared score markup ---------- */

function statsPct(s){return s&&s.answered?Math.round(s.correct/s.answered*100):0}
function retryButton(scope,n,mastered,label,compact){
  if(n>0)return '<button type="button" class="pt-stats-btn'+(compact?' compact':'')+'" data-scope="'+esc(scope)+'">'+(label||('Retry Incorrect ('+n+')'))+'</button>';
  if(mastered)return '<span class="pt-stats-mastered">100% Mastered \u2713</span>';
  return '';
}
function statBar(s){
  if(!s||!s.total)return '<span class="pt-stats-bar"><i class="bar-answered" style="width:0%"></i></span>';
  var ok=Math.round(s.correct/s.total*100),bad=Math.round(s.incorrect/s.total*100);
  return '<span class="pt-stats-bar"><i class="bar-ok" style="width:'+ok+'%"></i><i class="bar-bad" style="width:'+bad+'%"></i></span>';
}
function statsSubRow(s,scope){
  var name='<span class="pt-stats-name">\u21b3 '+esc(s.label)+'</span>';
  if(!s.total)return '<div class="pt-stats-row pt-stats-sub">'+name+'<span class="pt-stats-num">0 / 0 \u00b7 None</span></div>';
  return '<div class="pt-stats-row pt-stats-sub">'+name+
    statBar(s)+
    '<span class="pt-stats-num">'+s.answered+' / '+s.total+'</span>'+
    '<span class="pt-stats-badge ok">Correct \u2713 '+s.correct+'</span>'+
    '<span class="pt-stats-badge bad">Incorrect \u2717 '+s.incorrect+'</span>'+
    '<span class="pt-stats-pct">'+statsPct(s)+'%</span>'+
    retryButton(scope,s.incorrect,false,null,true)+'</div>';
}
function statsRow(s,scope,zeroNote){
  var num=s.total?(s.answered+' / '+s.total):('0 / 0'+(zeroNote?' \u00b7 '+zeroNote:' \u00b7 0 Qs'));
  return '<div class="pt-stats-row"><span class="pt-stats-name">'+esc(s.label)+'</span>'+
    statBar(s)+
    '<span class="pt-stats-num">'+num+'</span>'+
    '<span class="pt-stats-badge ok">Correct \u2713 '+s.correct+'</span>'+
    '<span class="pt-stats-badge bad">Incorrect \u2717 '+s.incorrect+'</span>'+
    '<span class="pt-stats-pct">'+statsPct(s)+'%</span>'+
    retryButton(scope,s.incorrect,s.total>0&&s.answered===s.total)+'</div>';
}
function statsSection(label,list,prefix,zeroNoteFor,subRows){
  if(!list||!list.length)return '';
  var h='<p class="pt-stats-section">'+esc(label)+'</p>';
  list.forEach(function(s){
    var scope=prefix+s.id;
    h+=statsRow(s,scope,zeroNoteFor?zeroNoteFor(s):'');
    if(subRows)h+=subRows(s,scope);
  });
  return h;
}
function formatPillLabel(f){
  if(!f)return '';
  if(f.id==='mcq')return 'MCQ';
  if(f.id==='written')return 'Written';
  return f.label||f.id;
}
function topicPills(t,scope){
  var list=(t&&t.formats?t.formats:[]).filter(function(f){return f&&f.total>0});
  if(!list.length)return '';
  var pills=list.map(function(f){
    var cls=f.answered===0?'':(f.incorrect?' has-miss':' is-perfect');
    var retry=f.incorrect>0?'<button type="button" class="pt-pill-retry" data-scope="'+esc(scope+':'+f.id)+'">Retry ('+f.incorrect+')</button>':'';
    return '<span class="pt-format-pill'+cls+'"><b>'+esc(formatPillLabel(f))+':</b> '+f.answered+' / '+f.total+' ('+statsPct(f)+'%)'+retry+'</span>';
  });
  return '<div class="pt-topic-pills">'+pills.join('')+'</div>';
}
function topicSection(topics){
  if(!topics||!topics.length)return '';
  var h='<p class="pt-stats-section">By System / Topic</p><div class="pt-topic-list">';
  topics.forEach(function(t){
    var scope='topic:'+t.id;
    h+='<div class="pt-topic-card">'+statsRow(t,scope,'')+topicPills(t,scope)+'</div>';
  });
  return h+'</div>';
}
function statsHTML(stats,opts){
  if(!stats||!stats.overall)return '<p class="pt-stats-empty">No answers saved yet \u2014 start a test to see your breakdown.</p>';
  opts=opts||{};
  var o=stats.overall;
  var h='<div class="pt-stats-row pt-stats-overall"><span class="pt-stats-name">Overall</span>'+
    statBar(o)+
    '<span class="pt-stats-num">'+o.answered+' / '+o.total+' Answered</span>'+
    '<span class="pt-stats-badge ok">Correct \u2713 '+o.correct+'</span>'+
    '<span class="pt-stats-badge bad">Incorrect \u2717 '+o.incorrect+'</span>'+
    '<span class="pt-stats-pct">'+statsPct(o)+'%</span>'+
    retryButton('all',o.incorrect,o.total>0&&o.answered===o.total,
      opts.menu?('Retry All Incorrect ('+o.incorrect+') \u2192'):null)+'</div>';
  if(stats.formats&&stats.formats.length){
    h+=statsSection('By Question Format',stats.formats,'format:',function(s){
      return s.label==='Written Response'?'No written questions':'';
    });
  }
  if(stats.topics&&stats.topics.length){
    h+=topicSection(stats.topics);
  }else if(stats.subcategories&&stats.subcategories.length){
    h+=statsSection('By Subcategory',stats.subcategories,'');
  }
  return h;
}
function closeStatsModal(){
  var m=document.getElementById('pt-stats-modal');
  if(m)m.remove();
  if(window.__ptStatsKeyHandler){document.removeEventListener('keydown',window.__ptStatsKeyHandler);window.__ptStatsKeyHandler=null}
}
function openStatsModal(stats,onRetry,title,opts){
  closeStatsModal();
  opts=opts||{};
  var flagCount=opts.flagCount||0;
  var ov=stats&&stats.overall;
  if(ov&&ov.answered>0&&Math.round(ov.correct/ov.answered*100)>=80)PTCelebrate.shower();
  var m=document.createElement('div');m.id='pt-stats-modal';
  m.innerHTML='<div class="pt-stats-modal-card"><div class="pt-stats-modal-head"><h2>'+esc(title||'Score Summary')+'</h2>'+
    '<button type="button" class="pt-stats-close">Close</button></div>'+
    (flagCount>0?'<button type="button" class="pt-review-flag-btn" data-flag-review>\u2691 Review Flagged ('+flagCount+')</button>':'')+
    '<div class="pt-stats-card"><p class="pt-stats-title">Score Breakdown</p>'+statsHTML(stats)+'</div></div>';
  document.body.appendChild(m);
  function close(){closeStatsModal()}
  m.addEventListener('click',function(e){if(e.target===m||e.target.closest('.pt-stats-close'))close()});
  m.addEventListener('click',function(e){
    var f=e.target.closest('button[data-flag-review]');
    if(f&&typeof opts.onFlagged==='function'){close();opts.onFlagged();return}
    var b=e.target.closest('button[data-scope]');
    if(b&&typeof onRetry==='function'){close();onRetry(b.dataset.scope)}
  });
  window.__ptStatsKeyHandler=function(e){if(e.key==='Escape')close()};
  document.addEventListener('keydown',window.__ptStatsKeyHandler);
}

function closeUpdatesModal(){
  var m=document.getElementById('pt-updates-modal');
  if(m&&m.parentNode)m.parentNode.removeChild(m);
  if(window.__ptUpdatesKeyHandler){document.removeEventListener('keydown',window.__ptUpdatesKeyHandler);window.__ptUpdatesKeyHandler=null}
}
function openUpdatesModal(){
  closeUpdatesModal();
  var latest=PT_UPDATES.length?PT_UPDATES[0].version:'';
  if(latest)lsSet('pt_seen_update_version',latest);
  updateUpdatesButton();
  var cards=PT_UPDATES.map(function(u){
    var items=(u.items||[]).map(function(x){return '<li>'+esc(x)+'</li>'}).join('');
    return '<article class="pt-update-card"><div class="pt-update-meta">'+
      '<span class="pt-update-version">'+esc(u.version)+'</span><span class="pt-update-date">'+esc(u.date)+'</span></div>'+
      '<h3 class="pt-update-title">'+esc(u.title)+'</h3>'+
      (u.note?'<p class="pt-update-note">'+esc(u.note)+'</p>':'')+
      '<ul class="pt-update-items">'+items+'</ul></article>';
  }).join('');
  var m=document.createElement('div');m.id='pt-updates-modal';
  m.innerHTML='<div class="pt-updates-card"><div class="pt-updates-head"><div>'+
    '<h2>What’s new</h2><p>Release notes for your study workspace</p></div>'+
    '<button type="button" class="pt-updates-close">Close ✕</button></div>'+cards+'</div>';
  document.body.appendChild(m);
  function close(){closeUpdatesModal()}
  m.addEventListener('click',function(e){if(e.target===m||e.target.closest('.pt-updates-close'))close()});
  window.__ptUpdatesKeyHandler=function(e){if(e.key==='Escape')close()};
  document.addEventListener('keydown',window.__ptUpdatesKeyHandler);
}

/* ---------- settings modal: themes, effects, resets and account ---------- */

/* Reset actions mirror tests-registry.js so new PT_TESTS entries appear automatically. */
function registeredTests(){return Array.isArray(window.PT_TESTS)?window.PT_TESTS:[]}
function resetTestList(){
  return registeredTests().map(function(t){return {id:t.id,label:t.subject||t.title||t.id}})
    .filter(function(t){return !!t.id});
}
function closeSettings(){
  if(settingsKeyHandler){document.removeEventListener('keydown',settingsKeyHandler);settingsKeyHandler=null}
  if(settingsModal&&settingsModal.parentNode)settingsModal.parentNode.removeChild(settingsModal);
  settingsModal=null;
}
function settingsMsg(text,bad){
  if(!settingsModal)return;
  var el=settingsModal.querySelector('#pt-settings-msg');
  if(el){el.textContent=text||'';el.classList.toggle('pt-auth-bad',!!bad)}
}
function themeSwatchHTML(id){
  var p=THEMES[id]||THEME_FALLBACK[id],on=currentTheme()===id;
  return '<button type="button" class="pt-theme-swatch'+(on?' selected':'')+'" data-theme="'+id+'" aria-pressed="'+(on?'true':'false')+'">'+
    '<span class="pt-theme-preview" style="background:'+esc(p.bg)+';border-color:'+esc(p.border)+'">'+
      '<i style="background:'+esc(p.primary)+'"></i><i style="background:'+esc(p.secondary)+'"></i><i style="background:'+esc(p.highlight)+'"></i>'+
    '</span><span>'+esc(THEME_LABELS[id])+'</span></button>';
}
function renderThemeGrid(){
  if(!settingsModal)return;
  var grid=settingsModal.querySelector('#pt-theme-grid');
  if(grid)grid.innerHTML=THEME_ORDER.map(themeSwatchHTML).join('');
}
function resetButtonHTML(id,label){
  return '<button type="button" class="pt-settings-btn" data-reset="'+esc(id)+'" data-label="'+esc(label)+'">'+esc(label)+'</button>';
}
async function handleSettingsReset(btn){
  var key=btn.dataset.reset||'';
  if(btn.dataset.confirm!=='1'){
    if(settingsModal)settingsModal.querySelectorAll('[data-reset]').forEach(function(x){x.dataset.confirm='0';x.textContent=x.dataset.label||''});
    btn.dataset.confirm='1';btn.textContent='Confirm Reset?';
    settingsMsg('Tap again to confirm '+(btn.dataset.label||'this reset')+'.');
    return;
  }
  btn.disabled=true;btn.textContent='Resetting\u2026';
  try{
    if(key==='all'){
      var list=resetTestList();
      for(var k=0;k<list.length;k++)await resetTest(list[k].id);
      settingsMsg('All test progress reset and synced to the cloud.');
    }else{
      await resetTest(key);
      settingsMsg((btn.dataset.label||'Test')+' progress reset and synced to the cloud.');
    }
  }catch(err){settingsMsg((err&&err.message)||'Reset failed. Please try again.',true)}
  finally{
    if(settingsModal)settingsModal.querySelectorAll('[data-reset]').forEach(function(x){
      x.disabled=false;x.dataset.confirm='0';x.textContent=x.dataset.label||'';
    });
  }
}
function openSettings(){
  if(settingsModal)return;
  closeUpdatesModal();
  closeStatsModal();
  settingsModal=document.createElement('div');settingsModal.id='pt-settings-modal';
  var isAdmin=!!session&&(session.role==='main'||session.role==='admin');
  settingsModal.innerHTML='<div class="pt-settings-card" role="dialog" aria-modal="true" aria-label="Settings">'+
    '<div class="pt-settings-head"><div><h2>Settings</h2><p>Make the workspace yours.</p></div>'+
      '<button type="button" class="pt-settings-close" aria-label="Close settings">Close \u2715</button></div>'+
    '<p class="pt-settings-msg" id="pt-settings-msg"></p>'+
    '<section class="pt-settings-section"><h3>Color Theme</h3><p>Eight looks — changes apply instantly and stay saved.</p>'+
      '<div class="pt-theme-grid" id="pt-theme-grid"></div></section>'+
    '<section class="pt-settings-section"><h3>Keyboard Shortcuts</h3><p>When you are not typing in a note or input.</p>'+
      '<div class="pt-shortcut-grid">'+
        '<span class="pt-shortcut-pill"><kbd>A</kbd>–<kbd>D</kbd><span>Choose an answer (or 1–4)</span></span>'+
        '<span class="pt-shortcut-pill"><kbd>F</kbd><span>Flag / unflag question</span></span>'+
        '<span class="pt-shortcut-pill"><kbd>N</kbd> / <kbd>→</kbd><span>Next question</span></span>'+
        '<span class="pt-shortcut-pill"><kbd>P</kbd> / <kbd>←</kbd><span>Previous question</span></span>'+
      '</div></section>'+
    '<section class="pt-settings-section"><h3>Celebrations &amp; Confetti</h3><p>Streak milestones and score showers.</p>'+
      '<div class="pt-settings-row"><span class="pt-settings-row-label">Animations<small>Milestone confetti, toasts and micro-effects</small></span>'+
      '<button type="button" class="pt-settings-btn pt-settings-fx" id="pt-settings-fx" aria-pressed="true"></button></div>'+
      '<div class="pt-settings-row"><span class="pt-settings-row-label">Sound Effects<small>Answer, streak, flag and UI feedback</small></span>'+
      '<button type="button" class="pt-settings-btn pt-settings-fx" id="pt-settings-sound" aria-pressed="true"></button></div></section>'+
    '<section class="pt-settings-section"><h3>Reset Progress</h3><p>Each reset clears that test\u2019s answers, written self-grades and flags.</p>'+
      '<div class="pt-settings-row"><span class="pt-settings-row-label">Individual tests<small>Two-step confirmation protects your streak</small></span>'+
      '<span class="pt-settings-actions">'+resetTestList().map(function(t){return resetButtonHTML(t.id,'Reset '+t.label)}).join('')+'</span></div>'+
      '<div class="pt-settings-row"><span class="pt-settings-row-label">Everything<small>Clear Physics 12 and Biology 12 together</small></span>'+
      '<span class="pt-settings-actions">'+resetButtonHTML('all','Reset All Tests')+'</span></div></section>'+
    '<section class="pt-settings-section"><h3>Account &amp; Admin</h3><p>Session tools live here so the header stays clean.</p>'+
      '<div class="pt-settings-row"><span class="pt-settings-row-label">Signed in as<small>'+esc(displayName(session&&session.username))+'</small></span>'+
      '<span class="pt-settings-actions">'+(isAdmin?'<button type="button" class="pt-settings-btn" id="pt-settings-admin">Admin / Users</button>':'')+
      '<button type="button" class="pt-settings-btn logout" id="pt-settings-logout">Log Out</button></span></div></section></div>';
  document.body.appendChild(settingsModal);
  renderThemeGrid();
  fxLabel();
  soundLabel();
  settingsModal.addEventListener('click',function(e){
    if(e.target===settingsModal||e.target.closest('.pt-settings-close')){closeSettings();return}
    var theme=e.target.closest('[data-theme]');if(theme){var changed=currentTheme()!==theme.dataset.theme;setTheme(theme.dataset.theme);if(changed)PTSound.pop();return}
    if(e.target.closest('#pt-settings-fx')){setEffects(!fxEnabled);return}
    if(e.target.closest('#pt-settings-sound')){setSounds(!PTSound.enabled());return}
    var reset=e.target.closest('[data-reset]');if(reset){handleSettingsReset(reset);return}
    if(e.target.closest('#pt-settings-admin')){closeSettings();openAdmin();return}
    if(e.target.closest('#pt-settings-logout')){closeSettings();lock()}
  });
  settingsKeyHandler=function(e){if(e.key==='Escape')closeSettings()};
  document.addEventListener('keydown',settingsKeyHandler);
}
/* ---------- personalized greeting ---------- */

var GREETING_LINES=[
  'One question closer to surviving Grade 12.',
  'Procrastination fears a synced progress bar.',
  'Formula sheet locked & loaded.',
  'Small sessions compound. You’re up.',
  'Question by question — that’s the whole strategy.'
];
function greetingFor(user){
  var h=new Date().getHours();
  var name=displayName(user);
  var lead=h<12?('Morning grind, '+name+' ☀️'):(h<18?('Afternoon lock-in, '+name+' ⚡'):('Late-night study session, '+name+' 🌙'));
  var sub=GREETING_LINES[Math.floor(Date.now()/60000)%GREETING_LINES.length];
  return {lead:lead,sub:sub};
}
function renderGreeting(root,user){
  if(!root)return;
  user=user||currentUser();
  if(!user){root.textContent='';return}
  var g=greetingFor(user);
  root.textContent=g.lead;
  var sub=document.getElementById('pt-greeting-sub');
  if(sub)sub.textContent=g.sub;
}
function renderCommunity(){
  renderGreeting(document.getElementById('pt-greeting'));
}
var PTCommunity={render:renderCommunity,greeting:renderGreeting};

var PTAuth={
  init:function(opts){
    opts=opts||{};
    var wasBooted=booted;
    if(typeof opts.onUnlock==='function')callbacks.unlock.push(opts.onUnlock);
    if(typeof opts.onLock==='function')callbacks.lock.push(opts.onLock);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
    if(wasBooted&&session&&opts.onUnlock){try{opts.onUnlock(session)}catch(e){}}
    return PTAuth;
  },
  session:function(){return session?{username:session.username,role:session.role}:null},
  setSync:setSync,
  setEffects:setEffects,
  openUpdates:openUpdatesModal,
  openSettings:openSettings,
  setTheme:setTheme,
  community:PTCommunity,
  lock:lock,
  api:sb
};
var PTProgress={create:createProgress,rows:rows,counts:counts,flagCounts:flagCounts,countAnswers:countAnswers,
  setLaunchFilter:setLaunchFilter,takeLaunchFilter:takeLaunchFilter,
  setContinue:setContinue,takeContinue:takeContinue,
  computeStats:computeStats,scopeMatches:scopeMatches,statsHTML:statsHTML,
  openStatsModal:openStatsModal,closeStatsModal:closeStatsModal,resetTest:resetTest};

window.PTAuth=PTAuth;
window.PTProgress=PTProgress;
window.PTCommunity=PTCommunity;
})();
