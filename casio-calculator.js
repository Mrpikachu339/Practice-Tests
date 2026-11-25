(function () {
  if (window.renderCasioCalc) return;

  var CSS = [
    '.casio-fx300{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif;font-size:13px;display:block;max-width:336px;margin:0 auto;overflow:hidden}',
    '.casio-fx300 *{box-sizing:border-box}',
    '.casio-fx300 .bezel{background:#222428;border-radius:14px;overflow:hidden}',
    '.casio-fx300 .hdr{display:flex;justify-content:space-between;align-items:center;padding:4px 10px 0;color:#dfe1e4;font-size:12px;font-weight:700}',
    '.casio-fx300 .hdr-l span{font-style:italic}',
    '.casio-fx300 .solar{background:#382520;width:46px;height:26px;border-radius:4px;margin-left:8px}',
    '.casio-fx300 .key.c-shift.active{outline:2px solid #f5b82e;background:#d9a62f;color:#3a2d12}',
    '.casio-fx300 .key.c-alpha.active{outline:2px solid #ff6b8b;background:#e06b91;color:#fff}',
    '.casio-fx300 .dpad .d{line-height:1;padding:0;font-size:9px}',
    '.casio-fx300 .casio-screen{background:#cfd6ce;border:4px inset #b7beb5;border-radius:6px;color:#111612 !important;margin:6px 10px 6px}',
    '.casio-fx300 .casio-screen *{color:#111612 !important}',
    '.casio-fx300 .casio-status{display:flex;justify-content:space-between;font-size:10px;font-weight:700;border-bottom:1px solid rgba(17,22,18,.18);padding-bottom:2px;margin-bottom:2px}',
    '.casio-fx300 .casio-expression{min-height:34px;display:flex;align-items:center;flex-wrap:wrap;font-size:15px;font-weight:600;padding:4px 0}',
    '.casio-fx300 .casio-expression .frac{display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 2px;line-height:1.05;font-size:12px}',
    '.casio-fx300 .casio-expression .frac .num{border-bottom:1.5px solid #111612;padding:0 3px 1px}',
    '.casio-fx300 .casio-expression .frac .den{padding:1px 3px 0}',
    '.casio-fx300 .casio-expression .cursor{display:inline-block;width:2px;height:16px;background:#111612;animation:casioBlk .7s step-end infinite}',
    '@keyframes casioBlk{50%{opacity:0}}',
    '.casio-fx300 .casio-result{text-align:right;font-size:20px;font-weight:700;min-height:26px;letter-spacing:.5px}',
    '.casio-fx300 .ctrl-row{display:flex;justify-content:space-between;align-items:center;padding:6px 10px 4px;background:#2a2d33}',
    '.casio-fx300 .key{border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;cursor:pointer}',
    '.casio-fx300 .key.c-shift{width:34px;height:34px;background:#f5b82e;color:#3a2d12}',
    '.casio-fx300 .key.c-alpha{width:34px;height:34px;background:#ff6b8b;color:#fff}',
    '.casio-fx300 .key.c-normal{width:34px;height:34px;background:#2d3036;color:#fff}',
    '.casio-fx300 .dpad{position:relative;width:54px;height:42px;border-radius:22px;background:#3a3e44;border:2px solid #525863}',
    '.casio-fx300 .dpad .d{position:absolute;width:14px;height:14px;border-radius:50%;background:#242a31;border:1px solid #525863;color:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:8px;cursor:pointer}',
    '.casio-fx300 .dpad .d-up{top:4px;left:50%;transform:translateX(-50%)}',
    '.casio-fx300 .dpad .d-down{bottom:4px;left:50%;transform:translateX(-50%)}',
    '.casio-fx300 .dpad .d-left{top:50%;left:4px;transform:translateY(-50%)}',
    '.casio-fx300 .dpad .d-right{top:50%;right:4px;transform:translateY(-50%)}',
    '.casio-fx300 .sci-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:3px;width:100%}',
    '.casio-fx300 .key-cell{display:flex;flex-direction:column;width:100%;min-width:0}',
    '.casio-fx300 .key-cell.empty{height:72px}',
    '.casio-fx300 .sub-row{height:11px;display:flex;justify-content:space-between;font-size:7px;line-height:1}',
    '.casio-fx300 .sub-gold{color:#f5b82e}',
    '.casio-fx300 .sub-pink{color:#ff6b8b}',
    '.casio-fx300 .sci-btn{flex:1;min-width:0;background:#2d3036;border:none;border-radius:5px;height:50px;color:#fff;font-size:12px;font-weight:700;cursor:pointer}',
    '.casio-fx300 .num-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;width:100%;margin-top:6px}',
    '.casio-fx300 .num-btn{flex:1;min-width:0;background:#53575f;border:none;border-radius:5px;height:48px;color:#fff;font-size:15px;font-weight:700;cursor:pointer}',
    '.casio-fx300 .num-btn.lime{background:#9cc43b}'
  ].join('');

  (function injectCss() {
    if (!document.getElementById('casio-fx300-css')) {
      var s = document.createElement('style');
      s.id = 'casio-fx300-css';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
  })();

  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function fmtNum(v) {
    if (!isFinite(v)) return 'Error';
    if (Number.isInteger(v) && Math.abs(v) < 1e15) return String(v);
    var s = v.toPrecision(10);
    return s.replace(/0+$/, '').replace(/\.$/, '');
  }
  function engStr(v) {
    if (!isFinite(v) || v === 0) return fmtNum(v);
    var a = Math.abs(v);
    var e = Math.floor(Math.log10(a));
    var r = Math.floor(e / 3) * 3;
    var m = a / Math.pow(10, r);
    var prefix = ['f', 'p', 'n', '\u00b5', 'm', '', 'k', 'M', 'G'][r / 3 + 5];
    return (v < 0 ? '-' : '') + fmtNum(m) + (prefix || '');
  }
  function isMinus(c) { return c === '-' || c === '\u2212'; }
  function fact(n) {
    var r = 1, m = Math.round(n);
    if (m < 0) return NaN;
    for (var i = 2; i <= m; i++) r *= i;
    return r;
  }
  function nPr(n, r) { return fact(n) / fact(n - r); }
  function nCr(n, r) { return fact(n) / (fact(r) * fact(n - r)); }
  function gcd(a, b) { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b) { var t = a % b; a = b; b = t; } return a; }
  function lcm(a, b) { if (!a || !b) return 0; return Math.abs(a * b) / gcd(a, b); }
  function ranInt(a, b) { if (b < a) { var t = a; a = b; b = t; } return Math.floor(Math.random() * (b - a + 1)) + a; }
  function factStr(n) {
    n = Math.round(n);
    if (n < 2) return '1';
    var out = [], f = 2, x = n;
    while (f * f <= x) { while (x % f === 0) { out.push(f); x = Math.floor(x / f); } f++; }
    if (x > 1) out.push(x);
    var s = {};
    out.forEach(function (v) { s[v] = (s[v] || 0) + 1; });
    return Object.keys(s).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return k + (s[k] > 1 ? '^' + s[k] : ''); }).join(' \u00d7 ');
  }

  function evalExpr(text, st) {
    var s = String(text == null ? '' : text);
    var i = 0, v;
    function err() { throw new Error('SyntaxError'); }
    function ws() { while (i < s.length && s.charAt(i) === ' ') i++; }
    function add() {
      ws(); var vv = mul();
      while (true) { ws(); var c = s.charAt(i);
        if (c === '+') { i++; vv = vv + mul(); }
        else if (isMinus(c)) { i++; vv = vv - mul(); }
        else break; }
      return vv;
    }
    function mul() {
      ws(); var vv = pow();
      while (true) { ws(); var c = s.charAt(i);
        if (c === '*' || c === '\u00d7' || c === '\u00b7') { i++; vv = vv * pow(); }
        else if (c === '/' || c === '\u00f7') { i++; vv = vv / pow(); }
        else break; }
      return vv;
    }
    function pow() {
      ws(); var vv = unary();
      while (true) { ws(); if (s.charAt(i) === '^') { i++; vv = Math.pow(vv, pow()); } else break; }
      return vv;
    }
    function unary() {
      ws(); var c = s.charAt(i);
      if (isMinus(c)) { i++; return -unary(); }
      if (c === '+') { i++; return unary(); }
      var vv = primary();
      while (s.charAt(i) === '!') { i++; vv = fact(vv); }
      return vv;
    }
    function args() {
      var a = []; ws();
      if (s.charAt(i) !== '(') return a;
      i++; a.push(add()); ws();
      if (s.charAt(i) === ')') i++;
      while (true) { ws();
        if (s.charAt(i) === '(') { i++; a.push(add()); ws(); if (s.charAt(i) === ')') i++; }
        else if (s.charAt(i) === ',') { i++; a.push(add()); ws(); if (s.charAt(i) === ')') i++; }
        else break; }
      return a;
    }
    function toRad(vv) { if (st.mode === 'RAD') return vv; if (st.mode === 'GRA') return vv * Math.PI / 200; return vv * Math.PI / 180; }
    function backRad(vv) { if (st.mode === 'RAD') return vv; if (st.mode === 'GRA') return vv * 200 / Math.PI; return vv * 180 / Math.PI; }
    function numberOrDMS() {
      ws();
      var t = '';
      while (i < s.length && ((s.charAt(i) >= '0' && s.charAt(i) <= '9') || s.charAt(i) === '.')) t += s.charAt(i++);
      var deg = parseFloat(t) || 0, m = 0, sec = 0;
      ws(); var c = s.charAt(i);
      if (c === '\u00b0' || c === '\'' || c === '\u2033') {
        i++; ws();
        var t2 = '';
        while (i < s.length && ((s.charAt(i) >= '0' && s.charAt(i) <= '9') || s.charAt(i) === '.')) t2 += s.charAt(i++);
        m = parseFloat(t2) || 0;
        ws();
        if (s.charAt(i) === '\'') { i++; ws(); var t3 = ''; while (i < s.length && ((s.charAt(i) >= '0' && s.charAt(i) <= '9') || s.charAt(i) === '.')) t3 += s.charAt(i++); sec = parseFloat(t3) || 0; }
      }
      return deg + m / 60 + sec / 3600;
    }
    function primary() {
      ws();
      var c = s.charAt(i);
      if (c === '(') { i++; var vv = add(); ws(); if (s.charAt(i) === ')') i++; return vv; }
      if ((c >= '0' && c <= '9') || c === '.') return numberOrDMS();
      if (c === '\u221a') { i++; var a = args(); return Math.sqrt(a[0] || 0); }
      if (c === '\u221b') { i++; var a = args(); return Math.cbrt(a[0] || 0); }
      if (s.indexOf('\u02e3\u221a', i) === i) { i += 3; var a = args(); return Math.pow(a[0], 1 / (a[1] || 1)); }
      var m = /^[A-Za-z\u2090\u03c0\u207b\u00b9]+/.exec(s.slice(i));
      if (!m) err();
      var id = m[0]; i += id.length;
      var a = args(); var v0 = a[0];
      switch (id) {
        case 'sin': case 'sin\u207b\u00b9': return Math.sin(toRad(v0 || 0));
        case 'cos': case 'cos\u207b\u00b9': return Math.cos(toRad(v0 || 0));
        case 'tan': case 'tan\u207b\u00b9': return Math.tan(toRad(v0 || 0));
        case 'asin': case 'arcsin': return backRad(Math.asin(v0 || 0));
        case 'acos': case 'arccos': return backRad(Math.acos(v0 || 0));
        case 'atan': case 'arctan': return backRad(Math.atan(v0 || 0));
        case 'sinh': return Math.sinh ? Math.sinh(v0 || 0) : 0;
        case 'cosh': return Math.cosh ? Math.cosh(v0 || 0) : 0;
        case 'tanh': return Math.tanh ? Math.tanh(v0 || 0) : 0;
        case 'log': return Math.log(v0 || 1) / Math.LN10;
        case 'ln': return Math.log(v0 || 1);
        case 'log\u2090': return a.length > 1 ? Math.log(a[1]) / Math.log(a[0] || 1) : 0;
        case 'Abs': return Math.abs(v0 || 0);
        case 'sqrt': return Math.sqrt(v0 || 0);
        case 'cbrt': return Math.cbrt(v0 || 0);
        case 'dms': return v0 || 0;
        case 'FACT': return factStr(v0 || 0);
        case 'GCD': return gcd(v0 || 0, a[1] || 0);
        case 'LCM': return lcm(v0 || 0, a[1] || 0);
        case 'Int': return Math.trunc(v0 || 0);
        case 'Intg': return Math.floor(v0 || 0);
        case 'Rnd': return Math.round(v0 || 0);
        case 'RanInt': return ranInt(v0 || 0, a[1] || 0);
        case 'Pol': return Math.sqrt((v0 || 0) * (v0 || 0) + (a[1] || 0) * (a[1] || 0));
        case 'Rec': return (v0 || 0) * Math.cos((a[1] || 0));
        case 'PreAns': return st.preAns != null ? st.preAns : (st.ansv || 0);
        case 'Ans': case 'An': return st.ansv || 0;
        case 'Ran#': return Math.random();
        case 'A': case 'B': case 'C': case 'D': case 'E': case 'F': case 'X': case 'Y':
          return st.vars[id] != null ? st.vars[id] : 0;
        case 'M': return st.mem || 0;
        case 'e': return Math.E;
        case '\u03c0': return Math.PI;
        default: err();
      }
      return 0;
    }
    try { v = add(); if (i < s.length) err(); } catch (e) { return NaN; }
    return v;
  }

  var KEYS = {
    sci: [
      [
        {label: 'Abs', act: 'ins:Abs(', s: '\u00f7R'},
        {label: 'x\u00b3', act: 'ins:^3', s: '\u00b3\u221a', actS: 'ins:\u221b('},
        null, null,
        {label: 'x\u207b\u00b9', act: 'ins:^(-1)', s: 'x!', actS: 'ins:!'},
        {label: 'log\u2090(b)', act: 'ins:log\u2090(', s: '\u2211', actS: 'ins:log\u2090('}
      ],
      [
        {label: 'a/b', act: 'ins:/', s: 'a b/c', actS: 'frac'},
        {label: '\u221a', act: 'ins:\u221a(', s: '\u221b', actS: 'ins:\u221a('},
        {label: 'x\u00b2', act: 'ins:^2', s: 'x\u00b3', actS: 'ins:^3'},
        {label: 'x\u02b8', act: 'ins:^', s: '\u02e3\u221a', actS: 'ins:^'},
        {label: 'log', act: 'ins:log(', s: '10\u02b8', actS: 'ins:10^('},
        {label: 'ln', act: 'ins:ln(', s: 'e\u02b8', actS: 'ins:e^(', a: 'e', actA: 'ins:e'}
      ],
      [
        {label: '(-)', act: 'ins:-', a: 'A', actA: 'ins:A'},
        {label: '\u00b0 \u2032 \u2033', act: 'ins:dms(', s: 'FACT', actS: 'ins:FACT(', a: 'B', actA: 'ins:B'},
        {label: 'hyp', act: 'hyp', a: 'C', actA: 'ins:C'},
        {label: 'sin', act: 'ins:sin(', s: 'sin\u207b\u00b9', actS: 'ins:sin\u207b\u00b9(', a: 'D', actA: 'ins:D'},
        {label: 'cos', act: 'ins:cos(', s: 'cos\u207b\u00b9', actS: 'ins:cos\u207b\u00b9(', a: 'E', actA: 'ins:E'},
        {label: 'tan', act: 'ins:tan(', s: 'tan\u207b\u00b9', actS: 'ins:tan\u207b\u00b9(', a: 'F', actA: 'ins:F'}
      ],
      [
        {label: 'RCL', act: 'ins:M', s: 'STO', actS: 'sto'},
        {label: 'ENG', act: 'eng', actS: 'eng'},
        {label: '(', act: 'ins:(', actS: 'ins:%'},
        {label: ')', act: 'ins:)', s: ',', actS: 'ins:\u201d', actA: 'ins:X'},
        {label: 'S<=>D', act: 'frac', s: 'a b/c\u21ccd/c', actS: 'frac', actA: 'ins:Y'},
        {label: 'M+', act: 'mem', s: 'M\u2212', actS: 'mem-', actA: 'ins:M'}
      ]
    ],
    num: [
      [
        {label: '7', act: 'ins:7', s: 'CLR', actS: 'ins:'},
        {label: '8', act: 'ins:8'},
        {label: '9', act: 'ins:9'},
        {label: 'DEL', act: 'del', s: 'INS', actS: 'del', cls: 'lime'},
        {label: 'AC', act: 'clr', s: 'OFF', actS: 'clr', cls: 'lime'}
      ],
      [
        {label: '4', act: 'ins:4'},
        {label: '5', act: 'ins:5'},
        {label: '6', act: 'ins:6'},
        {label: '\u00d7', act: 'ins:\u00d7', s: 'nPr', actS: 'ins:nPr', a: 'GCD', actA: 'ins:GCD'},
        {label: '\u00f7', act: 'ins:\u00f7', s: 'nCr', actS: 'ins:nCr', a: 'LCM', actA: 'ins:LCM'}
      ],
      [
        {label: '1', act: 'ins:1', s: 'STAT'},
        {label: '2', act: 'ins:2'},
        {label: '3', act: 'ins:3'},
        {label: '+', act: 'ins:+', s: 'Pol(', actS: 'ins:Pol(', a: 'Int', actA: 'ins:Int'},
        {label: '\u2212', act: 'ins:\u2212', s: 'Rec(', actS: 'ins:Rec(', a: 'Intg', actA: 'ins:Intg'}
      ],
      [
        {label: '0', act: 'ins:0', s: 'Rnd', actS: 'ins:Rnd()'},
        {label: '.', act: 'ins:.', s: 'Ran#', actS: 'ins:Ran#', a: 'RanInt', actA: 'ins:RanInt('},
        {label: '\u00d710\u02b8', act: 'ins:\u00d710^(', s: '\u03c0', actS: 'ins:\u03c0', a: 'e', actA: 'ins:e'},
        {label: 'Ans', act: 'ins:Ans', s: 'DRG\u25b8', actS: 'ins:DRG\u25b8', a: 'PreAns', actA: 'ins:PreAns'},
        {label: '=', act: 'eq'}
      ]
    ]
  };

  window.renderCasioCalc = function (container, api) {
    var A = api || {};
    if (!Array.isArray(A.hist)) A.hist = [];
    var H = A.hist;
    var st = {
      shift: false, alpha: false, mode: 'DEG', stat: false,
      expr: A.initialExpr || '', res: A.initialRes || '',
      mem: 0, ansv: 0, preAns: null, vars: {},
      showFrac: false, lastVal: null, storing: false, replayIdx: 0
    };

    function resText() {
      if (st.lastVal != null) {
        if (st.showFrac && typeof A.fracStr === 'function') return A.fracStr(st.lastVal);
        if (typeof A.fm === 'function') return A.fm(st.lastVal);
        return st.eng ? engStr(st.lastVal) : fmtNum(st.lastVal);
      }
      return st.res || '';
    }

    function compute() {
      if (!st.expr) return;
      var v = evalExpr(st.expr, st);
      var isStr = typeof v === 'string';
      if (!isStr && (isNaN(v) || !isFinite(v))) { st.res = 'Error'; st.lastVal = null; return; }
      if (isStr) st.lastVal = null; else { st.lastVal = v; st.ansv = v; st.preAns = v; }
      st.replayIdx = 0;
      var r = isStr ? v : resText();
      H.push({e: st.expr, r: r});
      if (typeof A.hsave === 'function') A.hsave();
      if (typeof A.onUpdate === 'function') A.onUpdate(st.expr, r);
      st.res = r;
    }

    function runAction(act) {
      if (!act) return;
      if (act === 'shift') st.shift = !st.shift;
      else if (act === 'alph') st.alpha = !st.alpha;
      else if (act === 'mode') st.mode = st.mode === 'DEG' ? 'RAD' : (st.mode === 'RAD' ? 'GRA' : 'DEG');
      else if (act === 'stat') st.stat = !st.stat;
      else if (act === 'eng') st.eng = !st.eng;
      else if (act === 'hyp') st.hyp = !st.hyp;
      else if (act === 'del') { if (st.expr) st.expr = st.expr.slice(0, -1); }
      else if (act === 'clr') { st.expr = ''; st.res = ''; st.lastVal = null; }
      else if (act === 'eq') compute();
      else if (act === 'frac') st.showFrac = !st.showFrac;
      else if (act === 'mem') { if (st.lastVal != null) { if (st.shift) st.mem -= st.lastVal; else st.mem += st.lastVal; } }
      else if (act === 'mem-') { if (st.lastVal != null) st.mem -= st.lastVal; }
      else if (act === 'sto') st.storing = true;
      else if (act.indexOf('ins:') === 0) st.expr += act.slice(4);
      refresh();
    }

    function invokeFrom(o) {
      var act = o.act;
      if (st.shift && o.actS) act = o.actS;
      else if (st.alpha && o.actA) act = o.actA;
      else if (st.hyp && (o.label === 'sin' || o.label === 'cos' || o.label === 'tan')) {
        act = 'ins:' + (o.label === 'sin' ? 'sinh(' : o.label === 'cos' ? 'cosh(' : 'tanh(');
      }
      if (st.storing && typeof act === 'string' && /^ins:[A-FYM]$/.test(act)) {
        var nm = act.slice(4);
        if (st.lastVal != null) st.vars[nm] = st.lastVal;
        st.storing = false;
        refresh();
        return;
      }
      runAction(act);
      if (act !== 'shift' && act !== 'alph') { st.shift = false; st.alpha = false; }
    }

    function invokeBtn(b) {
      invokeFrom({
        label: b.getAttribute('data-l') || '',
        act: b.getAttribute('data-a') || '',
        actS: b.getAttribute('data-s') || null,
        actA: b.getAttribute('data-al') || null
      });
    }

    function renderExpr(s) {
      var out = esc(s);
      out = out.replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g,
        '<span class="frac"><span class="num">$1</span><span class="den">$2</span></span>');
      out = out.replace(/(\S+)\^(\d+)/g, '$1<sup>$2</sup>');
      return out + '<span class="cursor"></span>';
    }

    function statusHtml() {
      var f = [];
      if (st.shift) f.push('S');
      if (st.alpha) f.push('A');
      if (st.mem) f.push('M');
      f.push(st.mode);
      f.push('Math');
      return f.join(' ');
    }

    function refresh() {
      var e = container.querySelector('.casio-expression');
      var r = container.querySelector('.casio-result');
      var t = container.querySelector('.casio-status');
      if (e) e.innerHTML = renderExpr(st.expr);
      if (r) r.textContent = resText();
      if (t) t.textContent = statusHtml();
      var ctrls = container.querySelectorAll('.ctrl-row .key');
      for (var i = 0; i < ctrls.length; i++) {
        var l = ctrls[i].getAttribute('data-l');
        ctrls[i].classList.toggle('active', (l === 'SHIFT' && st.shift) || (l === 'ALPHA' && st.alpha));
      }
    }

    function replay(dir) {
      if (dir === 1) {
        if (st.replayIdx < H.length) st.replayIdx++;
        var h = H[H.length - st.replayIdx];
        if (h) st.expr = h.e;
      } else if (dir === 4) {
        if (st.replayIdx > 0) st.replayIdx--;
        var h2 = st.replayIdx ? H[H.length - st.replayIdx] : null;
        st.expr = h2 ? h2.e : '';
      } else if (dir === 2) runAction('del');
      else if (dir === 3) runAction('eq');
      refresh();
    }

    function makeCell(k, cls) {
      var cell = document.createElement('div');
      cell.className = 'key-cell';
      if (!k) { cell.classList.add('empty'); return cell; }
      var row = document.createElement('div');
      row.className = 'sub-row';
      var gold = document.createElement('span');
      gold.className = 'sub-gold';
      gold.textContent = k.s || '';
      var pink = document.createElement('span');
      pink.className = 'sub-pink';
      pink.textContent = k.a || '';
      row.appendChild(gold);
      row.appendChild(pink);
      var b = document.createElement('button');
      b.className = (cls || 'sci-btn') + (k.cls ? ' ' + k.cls : '');
      b.setAttribute('data-l', k.label);
      b.setAttribute('data-a', k.act || '');
      if (k.actS) b.setAttribute('data-s', k.actS);
      if (k.actA) b.setAttribute('data-al', k.actA);
      b.textContent = k.label;
      b.addEventListener('click', function () { invokeBtn(b); });
      cell.appendChild(row);
      cell.appendChild(b);
      return cell;
    }

    (function build() {
      container.innerHTML =
        '<div class="casio-fx300">' +
        '<div class="bezel">' +
        '<div class="hdr"><span class="hdr-l">CASIO <span>fx-300ES PLUS NATURAL-V.P.A.M.</span></span><span class="hdr-r">2nd edition</span><div class="solar"></div></div>' +
        '<div class="casio-screen">' +
        '<div class="casio-status"></div>' +
        '<div class="casio-expression"></div>' +
        '<div class="casio-result"></div>' +
        '</div>' +
        '<div class="ctrl-row">' +
        '<button class="key c-shift" data-l="SHIFT" data-a="shift">SHIFT</button>' +
        '<button class="key c-alpha" data-l="ALPHA" data-a="alph">ALPHA</button>' +
        '<div class="dpad"><span class="d d-up">&#9650;</span><span class="d d-down">&#9660;</span><span class="d d-left">&#9664;</span><span class="d d-right">&#9654;</span></div>' +
        '<button class="key c-normal" data-l="MODE SETUP" data-a="mode">MODE SETUP</button>' +
        '<button class="key c-normal" data-l="ON" data-a="clr">ON</button>' +
        '</div>' +
        '<div class="sci-grid"></div>' +
        '<div class="num-grid"></div>' +
        '</div>' +
        '</div>';
      var sci = container.querySelector('.sci-grid');
      KEYS.sci.forEach(function (row) { row.forEach(function (k) { sci.appendChild(makeCell(k, 'sci-btn')); }); });
      var num = container.querySelector('.num-grid');
      KEYS.num.forEach(function (row) { row.forEach(function (k) { num.appendChild(makeCell(k, 'num-btn')); }); });
      Array.prototype.forEach.call(container.querySelectorAll('.ctrl-row .key'), function (b) {
        b.addEventListener('click', function () { invokeBtn(b); });
      });
      var dpad = container.querySelector('.dpad');
      if (dpad) {
        var ds = dpad.querySelectorAll('.d');
        if (ds.length > 0) ds[0].addEventListener('click', function () { replay(1); });
        if (ds.length > 1) ds[1].addEventListener('click', function () { replay(4); });
        if (ds.length > 2) ds[2].addEventListener('click', function () { replay(2); });
        if (ds.length > 3) ds[3].addEventListener('click', function () { replay(3); });
      }
    })();

    var kbHandler = function (e) {
      if (!container || container.offsetParent === null) return;
      var act = null, k = e.key;
      if (/^[0-9]$/.test(k)) act = 'ins:' + k;
      else if (k === '.') act = 'ins:.';
      else if (k === '+') act = 'ins:+';
      else if (isMinus(k)) act = 'ins:-';
      else if (k === 'Enter') act = 'eq';
      else if (k === 'Backspace') act = 'del';
      if (!act) return;
      invokeFrom({label: 'KB', act: act});
    };
    document.addEventListener('keydown', kbHandler);

    refresh();
    return container;
  };
})();
