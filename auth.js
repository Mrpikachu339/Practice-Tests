/* Shared authentication, user management, progress sync and score statistics.
   Include this file (as a normal script) before a page's own inline script.
   Pages can use:
     PTAuth.init({ onUnlock(session), onLock() })
     PTAuth.addBarButton({ id, label, onClick })
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
var WRONG_PASSWORD='Incorrect password. Need a reset? Contact Big P.';

var mem={}, session=null, pendingUser=null, booted=false, gate=null, bar=null, adminModal=null, adminKeyHandler=null;
var callbacks={unlock:[],lock:[]};

function enc(s){return encodeURIComponent(String(s))}
function norm(s){return String(s==null?'':s).trim().toLowerCase()}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function lsGet(k){try{var v=localStorage.getItem(k);return v==null?(mem[k]||null):v}catch(e){return mem[k]||null}}
function lsSet(k,v){mem[k]=String(v);try{localStorage.setItem(k,String(v))}catch(e){}}
function lsDel(k){delete mem[k];try{localStorage.removeItem(k)}catch(e){}}
function getSession(){var u=lsGet(K_USER),r=lsGet(K_ROLE);return u&&r?{username:u,role:r}:null}
function saveSession(u,r){lsSet(K_USER,u);lsSet(K_ROLE,r||'student');session={username:u,role:r||'student'}}
function clearSession(){lsDel(K_USER);lsDel(K_ROLE);session=null}

/* ---------- self-contained styling ---------- */

function injectCSS(){
  if(document.getElementById('pt-auth-styles'))return;
  var css=[
    '/* page lock: nothing behind the gate can be seen or clicked */',
    'html body.pt-auth-locked{overflow:hidden!important;height:100vh}',
    'html body.pt-auth-locked main,html body.pt-auth-locked #app,html body.pt-auth-locked [data-pt-auth-page]{visibility:hidden!important;pointer-events:none!important}',
    'html body.pt-auth-locked #tb,html body.pt-auth-locked #tp,html body.pt-auth-locked #zm,html body.pt-auth-locked #zo{display:none!important;visibility:hidden!important}',
    '',
    '/* full-screen login gate */',
    'html body #pt-auth-gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#0b0f19;padding:16px;overflow:auto;color:#f1f5f9;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.5}',
    'html body #pt-auth-gate *,html body #pt-auth-userbar *,html body #pt-auth-admin-modal *{box-sizing:border-box}',
    'html body #pt-auth-gate .pt-auth-card{max-width:400px;width:100%;background:#131a2a;border:1px solid #263148;border-radius:14px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,0.6)}',
    'html body #pt-auth-gate .pt-auth-mark{width:42px;height:42px;border-radius:10px;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;letter-spacing:.5px;margin-bottom:16px}',
    'html body #pt-auth-gate h2{margin:0 0 6px;font-size:1.35rem;color:#f8fafc}',
    'html body #pt-auth-gate .pt-auth-lead{color:#94a3b8;margin:0 0 18px;font-size:.92rem}',
    'html body #pt-auth-gate .pt-auth-chip{display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:999px;padding:4px 11px;color:#bfdbfe;font-size:.8rem;font-weight:700;margin-bottom:16px}',
    'html body #pt-auth-gate label.pt-auth-label{display:block;margin:0 0 6px;color:#cbd5e1;font-size:.85rem;font-weight:600}',
    'html body #pt-auth-gate input.pt-auth-input{width:100%;padding:11px 14px;border-radius:8px;background:#0b0f19;border:1px solid #2d3a54;color:#f1f5f9;font:inherit;margin:0 0 14px;display:block}',
    'html body #pt-auth-gate input.pt-auth-input::placeholder{color:#64748b}',
    'html body #pt-auth-gate input.pt-auth-input:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.22)}',
    'html body #pt-auth-gate button.pt-auth-primary{width:100%;padding:11px 16px;border-radius:8px;background:#3b82f6;color:#fff;font-weight:600;cursor:pointer;border:1px solid #3b82f6;text-align:center;font-family:inherit;font-size:1rem}',
    'html body #pt-auth-gate button.pt-auth-primary:hover{background:#2563eb;border-color:#2563eb}',
    'html body #pt-auth-gate button.pt-auth-primary:disabled{opacity:.6;cursor:wait}',
    'html body #pt-auth-gate button.pt-auth-back{display:block;margin:12px auto 0;background:none;border:0;padding:4px;color:#93c5fd;font-size:.85rem;cursor:pointer;text-align:center;font-family:inherit}',
    'html body #pt-auth-gate button.pt-auth-back:hover{color:#bfdbfe;text-decoration:underline}',
    'html body #pt-auth-gate .pt-auth-error:empty{display:none}',
    'html body #pt-auth-gate .pt-auth-error:not(:empty){background:#3b1520;border:1px solid #7f1d2e;color:#fecaca;border-radius:8px;padding:10px 12px;margin:0 0 14px;font-size:.88rem}',
    'html body #pt-auth-gate .pt-auth-help{border-top:1px solid #263148;margin:20px 0 0;padding-top:14px;color:#94a3b8;font-size:.82rem;text-align:center;line-height:1.45}',
    'html body #pt-auth-gate .pt-auth-loading{display:flex;align-items:center;justify-content:center;gap:10px;color:#94a3b8;min-height:60px}',
    'html body #pt-auth-gate .pt-auth-spinner{width:20px;height:20px;border:2px solid #2d3a54;border-top-color:#3b82f6;border-radius:50%;animation:pt-auth-spin .8s linear infinite}',
    '@keyframes pt-auth-spin{to{transform:rotate(360deg)}}',
    '',
    '/* logged-in top bar */',
    'html body #pt-auth-userbar{display:none;position:sticky;top:0;z-index:9000;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 16px;background:#131a2a;border-bottom:1px solid #263148;color:#e2e8f0;font-size:.82rem;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.22)}',
    'html body #pt-auth-userbar.pt-auth-on{display:flex}',
    'html body #pt-auth-userbar [hidden]{display:none!important}',
    'html body #pt-auth-userbar .pt-auth-brand{font-weight:800;color:#cbd5e1;white-space:nowrap}',
    'html body #pt-auth-userbar .pt-auth-spacer{flex:1 1 auto}',
    'html body #pt-auth-userbar .pt-auth-sync{padding:5px 10px;border-radius:999px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.35);color:#86efac;white-space:nowrap;font-weight:600}',
    'html body #pt-auth-userbar .pt-auth-sync.pt-auth-warn{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.4);color:#fca5a5}',
    'html body #pt-auth-userbar .pt-auth-user-badge{padding:5px 10px;border-radius:999px;background:#1e293b;border:1px solid #334155;color:#e2e8f0;font-weight:700;white-space:nowrap}',
    'html body #pt-auth-userbar button.pt-auth-btn{padding:6px 12px;border-radius:999px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:.8rem;font-weight:600;cursor:pointer;white-space:nowrap;text-align:center;font-family:inherit}',
    'html body #pt-auth-userbar button.pt-auth-btn:hover{border-color:#3b82f6;color:#fff;background:#25334a}',
    '',
    '/* in-test auth controls */',
    'html body .pt-auth-act{flex-wrap:wrap}',
    'html body .act button.pt-auth-flag{flex:0 0 auto;font-size:.85rem;padding:10px 12px;border-radius:8px;background:#1e293b;color:#cbd5e1;border:1px solid #334155;cursor:pointer}',
    'html body .act button.pt-auth-flag.pt-auth-on{border-color:#3b82f6;color:#93c5fd;font-weight:700}',
    'html body button.pt-auth-reset{display:inline-block;margin-top:14px;background:none;border:0;padding:0;color:#64748b;font-size:.8rem;text-decoration:underline;cursor:pointer;text-align:left}',
    'html body button.pt-auth-reset:hover{color:#93c5fd}',
    '',
    '/* score breakdown / retry UI (shared by menu and tests) */',
    'html body .pt-stats-card{background:var(--card,#fff);border:1px solid var(--line,#d9deea);border-radius:12px;padding:12px;margin-top:12px;color:var(--tx,#1b2133)}',
    'html body .pt-stats-title{font-weight:800;font-size:.95rem;margin:0 0 8px;color:var(--tx,#1b2133)}',
    'html body .pt-stats-section{font-size:.72rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--mut,#5b6478);margin:12px 0 2px}',
    'html body .pt-stats-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--line,#d9deea);font-size:.82rem;line-height:1.4}',
    'html body .pt-stats-row:first-of-type{border-top:0}',
    'html body .pt-stats-row.pt-stats-overall{background:rgba(59,130,246,.06);border-radius:8px;padding:9px 8px;border-top:0}',
    'html body .pt-stats-name{font-weight:700;flex:0 0 auto;min-width:112px;color:var(--tx,#1b2133)}',
    'html body .pt-stats-bar{flex:1 1 90px;min-width:70px;height:7px;background:var(--line,#d9deea);border-radius:99px;overflow:hidden;display:block}',
    'html body .pt-stats-bar i{display:block;height:100%;background:#3b82f6;border-radius:99px}',
    'html body .pt-stats-num{color:var(--mut,#5b6478);white-space:nowrap;font-variant-numeric:tabular-nums}',
    'html body .pt-stats-pct{font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--tx,#1b2133)}',
    'html body .pt-stats-badge{display:inline-block;padding:3px 8px;border-radius:999px;font-size:.75rem;font-weight:700;white-space:nowrap;border:1px solid transparent}',
    'html body .pt-stats-badge.ok{background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.35);color:#15803d}',
    'html body .pt-stats-badge.bad{background:rgba(239,68,68,.11);border-color:rgba(239,68,68,.32);color:#b91c1c}',
    'html body button.pt-stats-btn{margin-left:auto;padding:6px 11px;border-radius:999px;border:1px solid #3b82f6;background:#3b82f6;color:#fff;font-size:.76rem;font-weight:700;white-space:nowrap;text-align:center;cursor:pointer;font-family:inherit}',
    'html body button.pt-stats-btn:hover{background:#2563eb;border-color:#2563eb}',
    'html body button.pt-stats-btn.ghost{background:transparent;color:#3b82f6}',
    'html body button.pt-stats-btn:disabled{opacity:.55;cursor:default;border-color:var(--line,#d9deea);background:transparent;color:var(--mut,#5b6478)}',
    'html body .pt-stats-mastered{margin-left:auto;color:#15803d;font-size:.78rem;font-weight:700;white-space:nowrap}',
    'html body .pt-stats-empty{color:var(--mut,#5b6478);font-size:.85rem;margin:4px 0 0}',
    'html body button.pt-stats-grade{padding:10px 12px;border-radius:9px;border:1px solid var(--line,#d9deea);background:var(--card,#fff);color:var(--tx,#1b2133);font-size:.85rem;font-weight:700;text-align:center;cursor:pointer;flex:1 1 auto;font-family:inherit}',
    'html body button.pt-stats-grade:hover{border-color:#3b82f6}',
    'html body button.pt-stats-grade.correct.on{border-color:#22c55e;background:rgba(34,197,94,.14);color:#15803d}',
    'html body button.pt-stats-grade.incorrect.on{border-color:#ef4444;background:rgba(239,68,68,.12);color:#b91c1c}',
    'html body .pt-stats-retry-banner{position:sticky;top:56px;z-index:60;display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#131a2a;border:1px solid #3b82f6;color:#e2e8f0;border-radius:12px;padding:10px 13px;margin:0 0 14px;font-size:.88rem;box-shadow:0 6px 18px rgba(0,0,0,.18)}',
    'html body .pt-stats-retry-banner strong{color:#93c5fd}',
    'html body .pt-stats-retry-banner button{margin-left:auto;background:#3b82f6;color:#fff;border:1px solid #3b82f6;border-radius:999px;padding:7px 12px;font-size:.78rem;font-weight:700;cursor:pointer;white-space:nowrap;font-family:inherit}',
    'html body .pt-resume-highlight{animation:ptResumePulse 2s ease-out;border-radius:14px}',
    '@keyframes ptResumePulse{0%{box-shadow:0 0 0 0 rgba(59,130,246,.85)}45%{box-shadow:0 0 0 9px rgba(59,130,246,.25)}100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}}',
    'html body #pt-stats-modal{position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(11,15,25,.72);color:#e2e8f0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    'html body #pt-stats-modal .pt-stats-modal-card{width:min(560px,100%);max-height:min(86vh,760px);overflow:auto;background:#131a2a;border:1px solid #263148;border-radius:14px;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.6)}',
    'html body #pt-stats-modal .pt-stats-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}',
    'html body #pt-stats-modal .pt-stats-modal-head h2{margin:0;font-size:1.15rem;color:#f8fafc}',
    'html body #pt-stats-modal button.pt-stats-close{background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:999px;padding:6px 11px;cursor:pointer;font-family:inherit;font-size:.8rem}',
    'html body #pt-stats-modal .pt-stats-card{background:#0f1523;border-color:#263148;color:#e2e8f0}',
    'html body #pt-stats-modal .pt-stats-name,html body #pt-stats-modal .pt-stats-pct,html body #pt-stats-modal .pt-stats-title{color:#e2e8f0}',
    'html body #pt-stats-modal .pt-stats-section{color:#93c5fd}',
    'html body #pt-stats-modal .pt-stats-row{border-color:#263148}',
    'html body #pt-stats-modal .pt-stats-num{color:#94a3b8}',
    '@media (max-width:520px){html body .pt-stats-name{min-width:100%}html body button.pt-stats-btn{margin-left:0}html body .pt-stats-mastered{margin-left:0}}',
    '',
    '/* admin / user management modal */',
    'html body #pt-auth-admin-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(11,15,25,.8);color:#f1f5f9;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
    'html body #pt-auth-admin-modal .pt-auth-admin-card{width:min(680px,100%);max-height:min(86vh,760px);overflow:auto;background:#131a2a;border:1px solid #263148;border-radius:14px;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.6)}',
    'html body #pt-auth-admin-modal .pt-auth-admin-head{display:flex;align-items:center;justify-content:space-between;gap:12px}',
    'html body #pt-auth-admin-modal .pt-auth-admin-head h2{margin:0;font-size:1.2rem;color:#f8fafc}',
    'html body #pt-auth-admin-modal .pt-auth-admin-sub{color:#94a3b8;margin:5px 0 12px;font-size:.85rem}',
    'html body #pt-auth-admin-modal .pt-auth-admin-msg{font-size:.85rem;color:#94a3b8;min-height:1.2em;margin:0 0 12px}',
    'html body #pt-auth-admin-modal .pt-auth-admin-msg.pt-auth-bad{color:#fca5a5}',
    'html body #pt-auth-admin-modal form.pt-auth-add{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px}',
    'html body #pt-auth-admin-modal input.pt-auth-input{flex:1 1 190px;min-width:0;padding:10px 12px;border-radius:8px;background:#0b0f19;border:1px solid #2d3a54;color:#f1f5f9;font:inherit}',
    'html body #pt-auth-admin-modal input.pt-auth-input:focus{outline:none;border-color:#3b82f6}',
    'html body #pt-auth-admin-modal .pt-auth-role-tag{font-size:.75rem;color:#94a3b8;border:1px solid #334155;border-radius:999px;padding:5px 10px;white-space:nowrap}',
    'html body #pt-auth-admin-modal button.pt-auth-btn-small{padding:8px 12px;border-radius:8px;border:1px solid #3b82f6;background:#3b82f6;color:#fff;font-size:.8rem;font-weight:600;cursor:pointer;white-space:nowrap;font-family:inherit}',
    'html body #pt-auth-admin-modal button.pt-auth-btn-small:hover{background:#2563eb}',
    'html body #pt-auth-admin-modal button[data-act]{padding:7px 10px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:.78rem;cursor:pointer;white-space:nowrap;font-family:inherit}',
    'html body #pt-auth-admin-modal button[data-act]:hover{border-color:#3b82f6;color:#fff}',
    'html body #pt-auth-admin-modal .pt-auth-table-wrap{overflow:auto;border:1px solid #263148;border-radius:10px}',
    'html body #pt-auth-admin-modal table.pt-auth-table{width:100%;border-collapse:collapse;font-size:.82rem}',
    'html body #pt-auth-admin-modal table.pt-auth-table th,html body #pt-auth-admin-modal table.pt-auth-table td{text-align:left;padding:9px 10px;border-bottom:1px solid #263148;white-space:nowrap;color:#cbd5e1}',
    'html body #pt-auth-admin-modal table.pt-auth-table th{color:#94a3b8;font-weight:600;background:#0f1523}',
    'html body #pt-auth-admin-modal table.pt-auth-table tr:last-child td{border-bottom:0}',
    'html body #pt-auth-admin-modal .pt-auth-password{display:inline-block;padding:3px 8px;border-radius:6px;background:#0b0f19;border:1px solid #334155;color:#bfdbfe;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.82rem}',
    'html body #pt-auth-admin-modal .pt-auth-muted{color:#64748b}',
    'html body #pt-auth-admin-modal table.pt-auth-table td.pt-auth-actions{display:flex;gap:6px}',
    '@media (max-width:520px){html body #pt-auth-gate .pt-auth-card{padding:22px}html body #pt-auth-userbar{gap:8px;padding:8px 12px}html body #pt-auth-userbar .pt-auth-brand{display:none}html body #pt-auth-admin-modal .pt-auth-admin-card{padding:16px}}'
  ];
  var st=document.createElement('style');st.id='pt-auth-styles';st.textContent=css.join('\n');document.head.appendChild(st);
}
injectCSS();

function lockPage(){
  document.body.classList.add('pt-auth-locked');
  document.body.style.overflow='hidden';
}
function unlockPage(){
  document.body.classList.remove('pt-auth-locked');
  if(document.body.style.overflow==='hidden')document.body.style.overflow='';
}

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
    gateCard('<span class="pt-auth-chip">@'+esc(pendingUser?pendingUser.username:'')+'</span>'+
      '<h2>Welcome back</h2><p class="pt-auth-lead">Enter your password to continue.</p>'+
      '<p class="pt-auth-error"></p><form id="pt-auth-form"><label class="pt-auth-label" for="pt-auth-pass">Password</label>'+
      '<input class="pt-auth-input" id="pt-auth-pass" type="password" autocomplete="current-password" placeholder="Your password">'+
      '<button class="pt-auth-primary" type="submit">Log In</button><button class="pt-auth-back" type="button" data-back="1">\u2190 Use a different username</button></form>');
    wireForm(handleLogin);wireBack();
    var p=gate.querySelector('#pt-auth-pass');if(p)p.focus();
    return;
  }
  /* create */
  gateCard('<span class="pt-auth-chip">@'+esc(pendingUser?pendingUser.username:'')+'</span>'+
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
  bar=document.createElement('div');bar.id='pt-auth-userbar';bar.className='pt-auth-userbar';
  bar.innerHTML='<span class="pt-auth-brand">Grade 12 Practice</span><span class="pt-auth-spacer"></span>'+
    '<span class="pt-auth-sync" id="pt-auth-sync"></span><span class="pt-auth-user-badge" id="pt-auth-user-badge"></span>'+
    '<button type="button" class="pt-auth-btn" id="pt-auth-admin-btn" hidden>Admin / Users</button>'+
    '<button type="button" class="pt-auth-btn" id="pt-auth-logout-btn">Log Out</button>';
  document.body.insertBefore(bar,document.body.firstChild);
  bar.querySelector('#pt-auth-admin-btn').onclick=openAdmin;
  bar.querySelector('#pt-auth-logout-btn').onclick=lock;
  setSync(SAVED);
  return bar;
}
function setSync(text,warn){
  ensureBar();
  var el=bar.querySelector('#pt-auth-sync');
  if(el){el.textContent=text;el.classList.toggle('pt-auth-warn',!!warn)}
}
function addBarButton(opts){
  ensureBar();
  opts=opts||{};
  var b=document.createElement('button');
  b.type='button';b.className='pt-auth-btn';
  if(opts.id)b.id=opts.id;
  b.textContent=opts.label||'';
  if(typeof opts.onClick==='function')b.onclick=opts.onClick;
  var sync=bar.querySelector('#pt-auth-sync');
  bar.insertBefore(b,sync||null);
  return b;
}
function unlock(s){
  session=s||getSession();
  if(!session)return;
  ensureBar();
  bar.classList.add('pt-auth-on');
  bar.querySelector('#pt-auth-user-badge').textContent='@'+session.username;
  bar.querySelector('#pt-auth-admin-btn').hidden=!(session.role==='main'||session.role==='admin');
  setSync(SAVED);
  if(gate)gate.remove();
  gate=null;
  unlockPage();
  callbacks.unlock.forEach(function(fn){try{fn(session)}catch(e){}});
}
function lock(){
  clearSession();
  if(adminModal)closeAdmin();
  if(bar)bar.classList.remove('pt-auth-on');
  renderGate('user');
  callbacks.lock.forEach(function(fn){try{fn()}catch(e){}});
}
async function verifySession(s){
  try{
    var rows=await sb('app_users?username=eq.'+enc(s.username)+'&select=username,role');
    if(!rows||!rows.length)return null;
    return {username:rows[0].username,role:rows[0].role||'student'};
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
      return '<tr><td><b>@'+esc(r.username)+'</b></td><td>'+esc(r.role||'student')+'</td>'+
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
      input.value='';adminMsg('Added @'+u+'. They can set a password on their first login.');
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
        adminMsg('Password reset for @'+u+'. They will create a new password next login.');
        await refreshAdmin();
      }else if(act==='delete'){
        if(b.dataset.confirmed!=='1'){b.dataset.confirmed='1';b.textContent='Confirm delete?';return}
        await sb('app_users?username=eq.'+enc(u),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
        adminMsg('Deleted @'+u+'.');
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
  Object.keys(src).forEach(function(k){if(k!=='__stats')n++});
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
  if(scope.indexOf('topic:')===0)return qTopics(q).indexOf(scope.slice(6))>=0;
  return (q.cats||[]).indexOf(scope)>=0;
}
function computeStats(catalog,answers){
  if(!catalog||!catalog.questions)return null;
  var formats=catalog.formats||[],topics=catalog.topics||[],cats=catalog.categories||[];
  var overall={answered:0,correct:0,incorrect:0,total:catalog.questions.length};
  var fPer={},tPer={},cPer={};
  formats.forEach(function(c){fPer[c.id]={answered:0,correct:0,incorrect:0,total:0}});
  topics.forEach(function(c){tPer[c.id]={answered:0,correct:0,incorrect:0,total:0}});
  cats.forEach(function(c){cPer[c.id]={answered:0,correct:0,incorrect:0,total:0}});
  catalog.questions.forEach(function(q){
    qFormats(q).forEach(function(id){if(fPer[id])fPer[id].total++});
    qTopics(q).forEach(function(id){if(tPer[id])tPer[id].total++});
    (q.cats||[]).forEach(function(id){if(cPer[id])cPer[id].total++});
    var g=gradeAnswer(q,answers[q.id]);
    if(!g)return;
    overall[g]++;overall.answered++;
    qFormats(q).forEach(function(id){var p=fPer[id];if(p){p[g]++;p.answered++}});
    qTopics(q).forEach(function(id){var p=tPer[id];if(p){p[g]++;p.answered++}});
    (q.cats||[]).forEach(function(id){var p=cPer[id];if(p){p[g]++;p.answered++}});
  });
  return {
    overall:overall,
    formats:formats.map(function(c){var p=fPer[c.id];p.id=c.id;p.label=c.label;return p}),
    topics:topics.map(function(c){var p=tPer[c.id];p.id=c.id;p.label=c.label;return p}),
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
    cfg.set({answers:{},flags:{}});
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
  return {
    restoreLocal:restoreLocal,loadCloud:loadCloud,changed:changed,push:push,
    reset:reset,clearIncorrect:clearIncorrect,flush:flush,
    answers:function(){return snapshot().answers},flags:function(){return snapshot().flags},
    stats:function(){return statsWithMeta(snapshot())},
    catalog:function(){return catalog},
    count:function(){return countAnswers(snapshot().answers)}
  };
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

/* ---------- shared score markup ---------- */

function statsPct(s){return s&&s.answered?Math.round(s.correct/s.answered*100):0}
function retryButton(scope,n,mastered,label){
  if(n>0)return '<button type="button" class="pt-stats-btn" data-scope="'+esc(scope)+'">'+(label||('Retry Incorrect ('+n+')'))+'</button>';
  if(mastered)return '<span class="pt-stats-mastered">100% Mastered \u2713</span>';
  return '';
}
function statsRow(s,scope,zeroNote){
  var w=s.total?Math.round(s.answered/s.total*100):0;
  var num=s.total?(s.answered+' / '+s.total):('0 / 0'+(zeroNote?' \u00b7 '+zeroNote:' \u00b7 0 Qs'));
  return '<div class="pt-stats-row"><span class="pt-stats-name">'+esc(s.label)+'</span>'+
    '<span class="pt-stats-bar"><i style="width:'+w+'%"></i></span>'+
    '<span class="pt-stats-num">'+num+'</span>'+
    '<span class="pt-stats-badge ok">Correct \u2713 '+s.correct+'</span>'+
    '<span class="pt-stats-badge bad">Incorrect \u2717 '+s.incorrect+'</span>'+
    '<span class="pt-stats-pct">'+statsPct(s)+'%</span>'+
    retryButton(scope,s.incorrect,s.total>0&&s.answered===s.total)+'</div>';
}
function statsSection(label,list,prefix,zeroNoteFor){
  if(!list||!list.length)return '';
  var h='<p class="pt-stats-section">'+esc(label)+'</p>';
  list.forEach(function(s){h+=statsRow(s,prefix+s.id,zeroNoteFor?zeroNoteFor(s):'')});
  return h;
}
function statsHTML(stats,opts){
  if(!stats||!stats.overall)return '<p class="pt-stats-empty">No answers saved yet \u2014 start a test to see your breakdown.</p>';
  opts=opts||{};
  var o=stats.overall;
  var h='<div class="pt-stats-row pt-stats-overall"><span class="pt-stats-name">Overall</span>'+
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
    h+=statsSection('By System / Topic',stats.topics,'topic:');
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
function openStatsModal(stats,onRetry,title){
  closeStatsModal();
  var m=document.createElement('div');m.id='pt-stats-modal';
  m.innerHTML='<div class="pt-stats-modal-card"><div class="pt-stats-modal-head"><h2>'+esc(title||'Score Summary')+'</h2>'+
    '<button type="button" class="pt-stats-close">Close</button></div>'+
    '<div class="pt-stats-card"><p class="pt-stats-title">Score Breakdown</p>'+statsHTML(stats)+'</div></div>';
  document.body.appendChild(m);
  function close(){closeStatsModal()}
  m.addEventListener('click',function(e){if(e.target===m||e.target.closest('.pt-stats-close'))close()});
  m.addEventListener('click',function(e){
    var b=e.target.closest('button[data-scope]');
    if(b&&typeof onRetry==='function'){close();onRetry(b.dataset.scope)}
  });
  window.__ptStatsKeyHandler=function(e){if(e.key==='Escape')close()};
  document.addEventListener('keydown',window.__ptStatsKeyHandler);
}

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
  addBarButton:addBarButton,
  lock:lock,
  api:sb
};
var PTProgress={create:createProgress,rows:rows,counts:counts,countAnswers:countAnswers,
  setLaunchFilter:setLaunchFilter,takeLaunchFilter:takeLaunchFilter,
  setContinue:setContinue,takeContinue:takeContinue,
  computeStats:computeStats,scopeMatches:scopeMatches,statsHTML:statsHTML,
  openStatsModal:openStatsModal,closeStatsModal:closeStatsModal};

window.PTAuth=PTAuth;
window.PTProgress=PTProgress;
})();
