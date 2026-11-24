/* Shared test tools: calculator, history, formula sheet, drawing pad, image zoom.
   Add <script src="tools.js"></script> at the end of the body.
   Test pages can call zoomImg(src) to open the zoom viewer. */
(function () {
  if (window.__grade12ToolsLoaded) return;
  window.__grade12ToolsLoaded = true;

  const FORMULA_TABS = [
    {
      name: "Physics 12",
      sections: [
        {
          title: "Kinematics",
          items: [
            "v = u + at",
            "s = ut + ½at²",
            "v² = u² + 2as",
            "s = ((u + v) / 2)t",
            "Average velocity = Δd / Δt",
            "Average acceleration = Δv / Δt"
          ]
        },
        {
          title: "Dynamics & Forces",
          items: [
            "Fnet = ma",
            "Fg = mg",
            "Ff = μN",
            "Fnet = Fapplied − Ffriction",
            "Weight = mg",
            "Hooke's law: F = kx"
          ]
        },
        {
          title: "Energy, Work & Power",
          items: [
            "W = Fd cos θ",
            "Ek = ½mv²",
            "Ep = mgh",
            "P = W / t",
            "Efficiency = useful output / total input × 100%"
          ]
        },
        {
          title: "Momentum",
          items: [
            "p = mv",
            "Impulse = FΔt = Δp",
            "m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′",
            "Elastic collision: Ek before = Ek after"
          ]
        },
        {
          title: "Circular Motion & Gravitation",
          items: [
            "ac = v² / r",
            "Fc = mv² / r",
            "Fg = Gm₁m₂ / r²",
            "g = GM / r²",
            "v = 2πr / T"
          ]
        },
        {
          title: "Electricity & Circuits",
          items: [
            "E = F / q",
            "V = ΔE / q",
            "I = Q / t",
            "V = IR",
            "P = IV = I²R = V² / R",
            "Series: Rtotal = R₁ + R₂ + …",
            "Parallel: 1/Rtotal = 1/R₁ + 1/R₂ + …"
          ]
        },
        {
          title: "Magnetism & Induction",
          items: [
            "Fm = qvB sin θ",
            "Fm = ILB sin θ",
            "ε = BLv",
            "ε = NΔΦ / Δt",
            "Φ = BA cos θ"
          ]
        },
        {
          title: "Waves",
          items: [
            "v = fλ",
            "T = 1 / f",
            "f = 1 / T"
          ]
        }
      ]
    },
    {
      name: "Biology 12",
      sections: [
        {
          title: "Cell Size & Magnification",
          items: [
            "Magnification = image size / actual size",
            "Actual size = image size / magnification",
            "Surface area to volume ratio = SA / V",
            "As cell size increases, SA:V ratio decreases"
          ]
        },
        {
          title: "Cardiovascular",
          items: [
            "Cardiac output = heart rate × stroke volume",
            "Stroke volume = end-diastolic volume − end-systolic volume",
            "Blood pressure = systolic pressure / diastolic pressure"
          ]
        },
        {
          title: "Respiratory",
          items: [
            "Minute ventilation = breathing rate × tidal volume",
            "Vital capacity = inspiratory reserve + tidal volume + expiratory reserve"
          ]
        },
        {
          title: "Metabolism",
          items: [
            "Photosynthesis: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂",
            "Aerobic respiration: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP",
            "Anaerobic respiration in muscle: glucose → lactate + ATP",
            "Net ATP from glycolysis = 2 ATP",
            "Aerobic ATP yield ≈ 30–32 ATP per glucose in eukaryotes"
          ]
        },
        {
          title: "Solutions & Water Potential",
          items: [
            "Water potential: Ψ = Ψs + Ψp",
            "Solute potential: Ψs = −iCRT",
            "Water moves from high Ψ to low Ψ"
          ]
        },
        {
          title: "Rates",
          items: [
            "Rate = change in quantity / time",
            "Rate of diffusion ∝ surface area × concentration gradient / distance"
          ]
        }
      ]
    }
  ];

  let calcHistory = [];
  try {
    calcHistory = JSON.parse(localStorage.getItem("g12CalcHistory") || "[]").slice(0, 20);
  } catch (e) {
    calcHistory = [];
  }

  function saveHistory() {
    try {
      localStorage.setItem("g12CalcHistory", JSON.stringify(calcHistory.slice(0, 20)));
    } catch (e) {}
  }

  function injectStyles() {
    const css = `
      .g12-tools{position:fixed;right:16px;bottom:16px;z-index:99998;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:calc(100vw - 32px)}
      .g12-tool-btn{appearance:none;border:1px solid #d7dce8;background:#fff;color:#0f172a;border-radius:12px;padding:10px 12px;font:600 13px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 6px 18px rgba(15,23,42,.12);cursor:pointer}
      .g12-tool-btn:hover{background:#f8fafc}
      .g12-modal{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.45);padding:16px}
      .g12-modal.open{display:flex}
      .g12-panel{background:#fff;border-radius:18px;width:min(720px,100%);max-height:min(88vh,760px);display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(15,23,42,.25);overflow:hidden}
      .g12-panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #e6e9f0}
      .g12-panel-title{margin:0;font:700 17px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
      .g12-close{appearance:none;border:0;background:#f1f5f9;color:#0f172a;width:36px;height:36px;border-radius:999px;font-size:22px;line-height:1;cursor:pointer}
      .g12-panel-body{padding:16px;overflow:auto;background:#fff}
      .g12-calc-display{background:#0f172a;color:#fff;border-radius:14px;padding:16px;font:600 28px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-align:right;overflow-wrap:anywhere;min-height:64px}
      .g12-calc-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
      .g12-calc-grid button{appearance:none;border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:14px 0;font:600 17px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer}
      .g12-calc-grid button:hover{background:#eef2f7}
      .g12-calc-grid .g12-eq{grid-column:span 4;background:#2563eb;border-color:#2563eb;color:#fff}
      .g12-calc-history{margin-top:16px;border-top:1px solid #e6e9f0;padding-top:12px}
      .g12-calc-history h4{margin:0 0 8px;font:700 13px system-ui;color:#64748b;text-transform:uppercase;letter-spacing:.04em}
      .g12-calc-history ul{margin:0;padding-left:18px;color:#0f172a;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
      .g12-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
      .g12-tab{appearance:none;border:1px solid #d7dce8;background:#fff;border-radius:999px;padding:8px 14px;font:600 13px system-ui;cursor:pointer}
      .g12-tab.active{background:#2563eb;border-color:#2563eb;color:#fff}
      .g12-formula-content section{margin-bottom:18px}
      .g12-formula-content h4{margin:0 0 6px;font:700 14px system-ui;color:#1d4ed8}
      .g12-formula-content ul{margin:0;padding-left:20px}
      .g12-formula-content li{margin:5px 0;font:14px/1.45 system-ui}
      .g12-draw-tools{display:flex;gap:8px;margin-bottom:10px}
      .g12-draw-tools button{appearance:none;border:1px solid #d7dce8;background:#f8fafc;border-radius:10px;padding:8px 12px;font:600 13px system-ui;cursor:pointer}
      .g12-canvas{width:100%;height:340px;border:1px solid #d7dce8;border-radius:14px;background:#fff;touch-action:none;display:block}
      .g12-zoom{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.9);padding:24px}
      .g12-zoom.open{display:flex}
      .g12-zoom img{max-width:100%;max-height:90vh;border-radius:12px;background:#fff}
      .g12-zoom-close{position:absolute;top:16px;right:16px;appearance:none;border:0;background:#fff;color:#0f172a;width:42px;height:42px;border-radius:999px;font-size:26px;cursor:pointer}
      @media(max-width:520px){.g12-tool-btn{padding:8px 10px;font-size:12px}.g12-panel-body{padding:12px}}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  let modal = null;
  let panelTitle = null;
  let panelBody = null;

  function ensureModal() {
    if (modal) return;
    modal = document.createElement("div");
    modal.className = "g12-modal";
    modal.innerHTML = `
      <div class="g12-panel" role="dialog" aria-modal="true">
        <div class="g12-panel-head">
          <h3 class="g12-panel-title"></h3>
          <button class="g12-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="g12-panel-body"></div>
      </div>
    `;
    document.body.appendChild(modal);
    panelTitle = modal.querySelector(".g12-panel-title");
    panelBody = modal.querySelector(".g12-panel-body");
    modal.querySelector(".g12-close").addEventListener("click", closePanel);
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closePanel();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePanel();
    });
  }

  function closePanel() {
    if (modal) modal.classList.remove("open");
  }

  function openPanel(kind) {
    ensureModal();
    modal.classList.add("open");
    panelBody.innerHTML = "";
    if (kind === "calc") {
      panelTitle.textContent = "Calculator";
      buildCalculator();
    } else if (kind === "formulas") {
      panelTitle.textContent = "Formula Sheet";
      buildFormulas();
    } else if (kind === "draw") {
      panelTitle.textContent = "Drawing Pad";
      buildDraw();
    }
  }

  function buildCalculator() {
    panelBody.innerHTML = `
      <div class="g12-calc-display" id="g12CalcDisplay">0</div>
      <div class="g12-calc-grid">
        <button type="button" data-k="C">C</button>
        <button type="button" data-k="⌫">⌫</button>
        <button type="button" data-k="(">(</button>
        <button type="button" data-k=")">)</button>
        <button type="button" data-k="7">7</button>
        <button type="button" data-k="8">8</button>
        <button type="button" data-k="9">9</button>
        <button type="button" data-k="÷">÷</button>
        <button type="button" data-k="4">4</button>
        <button type="button" data-k="5">5</button>
        <button type="button" data-k="6">6</button>
        <button type="button" data-k="×">×</button>
        <button type="button" data-k="1">1</button>
        <button type="button" data-k="2">2</button>
        <button type="button" data-k="3">3</button>
        <button type="button" data-k="−">−</button>
        <button type="button" data-k="0">0</button>
        <button type="button" data-k=".">.</button>
        <button type="button" data-k="%">%</button>
        <button type="button" data-k="+">+</button>
        <button type="button" class="g12-eq" data-k="=">=</button>
      </div>
      <div class="g12-calc-history">
        <h4>History</h4>
        <ul id="g12CalcHistory"></ul>
      </div>
    `;

    const display = panelBody.querySelector("#g12CalcDisplay");
    const historyEl = panelBody.querySelector("#g12CalcHistory");
    let expr = "";
    let justEvaluated = false;

    function updateDisplay() {
      display.textContent = expr || "0";
    }

    function renderHistory() {
      historyEl.innerHTML = "";
      if (!calcHistory.length) {
        const li = document.createElement("li");
        li.textContent = "No calculations yet";
        li.style.color = "#94a3b8";
        historyEl.appendChild(li);
        return;
      }
      calcHistory.forEach(function (item) {
        const li = document.createElement("li");
        li.textContent = item;
        historyEl.appendChild(li);
      });
    }

    function press(key) {
      if (key === "C") {
        expr = "";
        justEvaluated = false;
      } else if (key === "⌫") {
        expr = expr.slice(0, -1);
        justEvaluated = false;
      } else if (key === "=") {
        const raw = expr;
        const cleaned = raw
          .replace(/×/g, "*")
          .replace(/÷/g, "/")
          .replace(/−/g, "-")
          .replace(/%/g, "%");
        if (!cleaned.trim()) return;
        if (!/^[0-9+\-*/().%\s]+$/.test(cleaned)) {
          display.textContent = "Error";
          expr = "";
          justEvaluated = false;
          return;
        }
        try {
          const result = Function("return (" + cleaned + ")")();
          if (!Number.isFinite(result)) throw new Error("not finite");
          const out = String(result);
          calcHistory.unshift(raw + " = " + out);
          calcHistory = calcHistory.slice(0, 20);
          saveHistory();
          expr = out;
          justEvaluated = true;
        } catch (err) {
          display.textContent = "Error";
          expr = "";
          justEvaluated = false;
          return;
        }
      } else {
        if (justEvaluated && /[0-9.]/.test(key)) {
          expr = "";
        }
        justEvaluated = false;
        expr += key;
      }
      updateDisplay();
      renderHistory();
    }

    panelBody.querySelectorAll("[data-k]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        press(btn.getAttribute("data-k"));
      });
    });

    updateDisplay();
    renderHistory();
  }

  function buildFormulas() {
    panelBody.innerHTML = `
      <div class="g12-tabs" id="g12FormulaTabs"></div>
      <div class="g12-formula-content" id="g12FormulaContent"></div>
    `;
    const tabs = panelBody.querySelector("#g12FormulaTabs");
    const content = panelBody.querySelector("#g12FormulaContent");

    function renderTab(tab) {
      content.innerHTML = tab.sections
        .map(function (section) {
          return (
            "<section><h4>" +
            section.title +
            "</h4><ul>" +
            section.items.map(function (item) {
              return "<li>" + item + "</li>";
            }).join("") +
            "</ul></section>"
          );
        })
        .join("");
    }

    FORMULA_TABS.forEach(function (tab, index) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "g12-tab" + (index === 0 ? " active" : "");
      btn.textContent = tab.name;
      btn.addEventListener("click", function () {
        tabs.querySelectorAll(".g12-tab").forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        renderTab(tab);
      });
      tabs.appendChild(btn);
    });

    renderTab(FORMULA_TABS[0]);
  }

  function buildDraw() {
    panelBody.innerHTML = `
      <div class="g12-draw-tools">
        <button type="button" id="g12ClearDraw">Clear</button>
        <button type="button" id="g12SaveDraw">Save PNG</button>
      </div>
      <canvas id="g12Canvas" class="g12-canvas"></canvas>
    `;

    const canvas = panelBody.querySelector("#g12Canvas");
    const ctx = canvas.getContext("2d");
    let drawing = false;
    let last = null;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";
    }

    requestAnimationFrame(resize);

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    canvas.addEventListener("pointerdown", function (e) {
      drawing = true;
      last = pos(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });

    canvas.addEventListener("pointermove", function (e) {
      if (!drawing) return;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    });

    canvas.addEventListener("pointerup", function () {
      drawing = false;
    });

    canvas.addEventListener("pointercancel", function () {
      drawing = false;
    });

    panelBody.querySelector("#g12ClearDraw").addEventListener("click", function () {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    });

    panelBody.querySelector("#g12SaveDraw").addEventListener("click", function () {
      const link = document.createElement("a");
      link.download = "drawing.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  }

  let zoomOverlay = null;

  function ensureZoom() {
    if (zoomOverlay) return zoomOverlay;
    zoomOverlay = document.createElement("div");
    zoomOverlay.className = "g12-zoom";
    zoomOverlay.innerHTML = `
      <button class="g12-zoom-close" type="button" aria-label="Close zoom">×</button>
      <img alt="Zoomed image" />
    `;
    document.body.appendChild(zoomOverlay);
    zoomOverlay.addEventListener("click", function (e) {
      if (e.target === zoomOverlay || e.target.classList.contains("g12-zoom-close")) {
        zoomOverlay.classList.remove("open");
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") zoomOverlay.classList.remove("open");
    });
    return zoomOverlay;
  }

  function zoomImg(src) {
    if (!src) return;
    const overlay = ensureZoom();
    overlay.querySelector("img").src = src;
    overlay.classList.add("open");
  }

  window.zoomImg = zoomImg;

  function init() {
    injectStyles();

    const toolbar = document.createElement("div");
    toolbar.className = "g12-tools";

    [
      { label: "🧮 Calculator", kind: "calc" },
      { label: "📐 Formulas", kind: "formulas" },
      { label: "✏️ Draw", kind: "draw" },
      { label: "🔍 Zoom", kind: "zoom" }
    ].forEach(function (item) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "g12-tool-btn";
      btn.textContent = item.label;
      btn.addEventListener("click", function () {
        if (item.kind === "zoom") {
          const src = prompt("Enter image URL to zoom:");
          if (src) zoomImg(src);
        } else {
          openPanel(item.kind);
        }
      });
      toolbar.appendChild(btn);
    });

    document.body.appendChild(toolbar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();