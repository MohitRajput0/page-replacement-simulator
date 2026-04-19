// CHART INSTANCES
const charts = {};

// NAVIGATION
function showHome() {
  document.getElementById('home-page').style.display = 'block';
  document.querySelectorAll('.sim-page').forEach(p => p.classList.remove('active'));
  setTab(0);
}

function showSim(a) {
  document.getElementById('home-page').style.display = 'none';
  document.querySelectorAll('.sim-page').forEach(p => p.classList.remove('active'));
  document.getElementById('sim-' + a).classList.add('active');
  const t = ['home', 'fifo', 'lru', 'optimal', 'lifo'];
  setTab(t.indexOf(a));
}

function setTab(idx) {
  document.querySelectorAll('.nav-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
}


// PAGE REPLACEMENT ALGORITHMS

function algoFIFO(pages, nf) {
  let frames = [], queue = [], steps = [];
  for (let p of pages) {
    let hit = frames.includes(p), rep = null;
    if (!hit) {
      if (frames.length < nf) { frames.push(p); queue.push(p); }
      else { rep = queue.shift(); frames[frames.indexOf(rep)] = p; queue.push(p); }
    }
    steps.push({ page: p, frames: [...frames], hit, replaced: rep });
  }
  return steps;
}

function algoLRU(pages, nf) {
  let frames = [], recent = [], steps = [];
  for (let p of pages) {
    let hit = frames.includes(p), rep = null;
    if (hit) { recent = recent.filter(x => x !== p); recent.push(p); }
    else {
      if (frames.length < nf) { frames.push(p); recent.push(p); }
      else { rep = recent.shift(); frames[frames.indexOf(rep)] = p; recent.push(p); }
    }
    steps.push({ page: p, frames: [...frames], hit, replaced: rep });
  }
  return steps;
}

function algoOPT(pages, nf) {
  let frames = [], steps = [];
  for (let i = 0; i < pages.length; i++) {
    let p = pages[i], hit = frames.includes(p), rep = null;
    if (!hit) {
      if (frames.length < nf) { frames.push(p); }
      else {
        let far = -1, vic = frames[0];
        for (let f of frames) {
          let nx = pages.slice(i + 1).indexOf(f);
          if (nx === -1) { vic = f; break; }
          if (nx > far) { far = nx; vic = f; }
        }
        rep = vic;
        frames[frames.indexOf(vic)] = p;
      }
    }
    steps.push({ page: p, frames: [...frames], hit, replaced: rep });
  }
  return steps;
}

function algoLIFO(pages, nf) {
  let frames = [], stack = [], steps = [];
  for (let p of pages) {
    let hit = frames.includes(p), rep = null;
    if (!hit) {
      if (frames.length < nf) { frames.push(p); stack.push(p); }
      else {
        let top = stack[stack.length - 1];
        rep = top;
        stack.pop();
        frames[frames.indexOf(top)] = p;
        stack.push(p);
      }
    }
    steps.push({ page: p, frames: [...frames], hit, replaced: rep });
  }
  return steps;
}

function getFn(a) {
  return { fifo: algoFIFO, lru: algoLRU, optimal: algoOPT, lifo: algoLIFO }[a];
}


// INPUT PARSING

function getInput(a) {
  const pstr = document.getElementById(a + '-pages').value.trim();
  const nf = parseInt(document.getElementById(a + '-frames').value);
  const pages = pstr.split(/\s+/).map(Number).filter(n => !isNaN(n));
  return { pages, nf, valid: pages.length > 0 && !isNaN(nf) && nf >= 1 && nf <= 10 };
}


// RUN SIMULATION

function runAlgo(a) {
  const { pages, nf, valid } = getInput(a);
  const err = document.getElementById(a + '-error');
  if (!valid) { err.classList.add('show'); return; }
  err.classList.remove('show');

  const steps = getFn(a)(pages, nf);
  renderStats(a, pages, steps);
  renderTable(a, nf, steps);
  renderGraph(a, steps);
  renderLearn(a, steps);

  document.getElementById(a + '-result').classList.add('show');
  document.getElementById(a + '-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// RENDER STATS

function renderStats(a, pages, steps) {
  const f = steps.filter(s => !s.hit).length;
  const h = steps.filter(s => s.hit).length;
  document.getElementById(a + '-tf').textContent = f;
  document.getElementById(a + '-th').textContent = h;
  document.getElementById(a + '-tr').textContent = ((f / pages.length) * 100).toFixed(1) + '%';
}


// RENDER TABLE

function renderTable(a, nf, steps) {
  const thead = document.getElementById(a + '-thead');
  const tbody = document.getElementById(a + '-tbody');

  let h = '<tr><th>Step</th><th>Page</th>';
  for (let f = 0; f < nf; f++) h += `<th>Frame ${f + 1}</th>`;
  h += '<th>Status</th><th>Replaced</th></tr>';
  thead.innerHTML = h;

  tbody.innerHTML = '';
  steps.forEach((s, i) => {
    let r = `<tr><td class="c-frame">${i + 1}</td><td class="c-ref">${s.page}</td>`;
    for (let f = 0; f < nf; f++) {
      const v = s.frames[f];
      let cls = 'c-empty', val = '—';
      if (v !== undefined) {
        val = v;
        cls = 'c-frame';
        if (v === s.page && !s.hit) cls = 'c-miss';
        else if (v === s.page && s.hit) cls = 'c-hit';
      }
      r += `<td class="${cls}">${val}</td>`;
    }
    r += `<td class="${s.hit ? 'c-hit' : 'c-miss'}">${s.hit ? 'HIT' : 'MISS'}</td>`;
    r += `<td class="c-replaced">${s.replaced !== null ? s.replaced : '—'}</td></tr>`;
    tbody.innerHTML += r;
  });
}


// RENDER GRAPH

function renderGraph(a, steps) {
  let cf = 0, ch = 0;
  const fd = steps.map(s => { if (!s.hit) cf++; return cf; });
  const hd = steps.map(s => { if (s.hit) ch++; return ch; });

  const ctx = document.getElementById(a + '-chart').getContext('2d');
  if (charts[a]) charts[a].destroy();

  charts[a] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: steps.map((_, i) => i + 1),
      datasets: [
        {
          label: 'Cumulative Faults',
          data: fd,
          borderColor: '#e53935',
          backgroundColor: 'rgba(229,57,53,0.08)',
          tension: 0.3,
          fill: true,
          pointRadius: 3
        },
        {
          label: 'Cumulative Hits',
          data: hd,
          borderColor: '#43a047',
          backgroundColor: 'rgba(67,160,71,0.06)',
          tension: 0.3,
          fill: true,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#666', font: { family: "'Roboto Mono',monospace", size: 11 } } },
        tooltip: { backgroundColor: '#fff', titleColor: '#222', bodyColor: '#555', borderColor: '#ddd', borderWidth: 1 }
      },
      scales: {
        x: {
          ticks: { color: '#999', font: { size: 10 } },
          grid: { color: 'rgba(0,0,0,0.05)' },
          title: { display: true, text: 'Reference Step', color: '#999', font: { size: 11 } }
        },
        y: {
          ticks: { color: '#999', stepSize: 1, font: { size: 10 } },
          grid: { color: 'rgba(0,0,0,0.07)' },
          title: { display: true, text: 'Count', color: '#999', font: { size: 11 } }
        }
      }
    }
  });
}


// LEARNING DATA

const learnData = {
  fifo: {
    how: `<h5>How FIFO Works</h5>
<p>FIFO treats memory frames like a <span class="hl">queue</span>. The page that entered memory first gets evicted when space is needed.</p>
<div class="code-block">Queue: [7, 0, 1]  ← oldest is 7
New page 2 arrives → evict 7
Queue: [0, 1, 2]</div>
<h5>Belady's Anomaly</h5>
<p class="bad">FIFO can suffer from Belady's Anomaly — adding MORE frames can sometimes cause MORE page faults. This is unique to FIFO.</p>`,
    pros: `<h5>Advantages</h5>
<p class="ok">+ Very simple to implement — just a queue</p>
<p class="ok">+ Low overhead — no need to track access times</p>
<h5>Disadvantages</h5>
<p class="bad">- Does not consider page usage frequency</p>
<p class="bad">- Susceptible to Belady's Anomaly</p>
<p class="bad">- Often performs worse than LRU on real workloads</p>`,
    exam: `<h5>Important Formulas</h5>
<div class="code-block">Fault Rate = Page Faults / Total References × 100%
Hit Rate  = 1 - Fault Rate</div>
<h5>Exam Points</h5>
<p>• Trace FIFO with N frames on a given string<br>
• Prove or disprove Belady's Anomaly<br>
• Compare FIFO vs LRU fault counts<br>
• FIFO is NOT a stack algorithm</p>`
  },


  lru: {
    how: `<h5>How LRU Works</h5>
<p>LRU evicts the page accessed <span class="hl">least recently</span>. It uses temporal locality — pages used recently are likely to be reused.</p>
<div class="code-block">Access order: [7,0,1,2,0,3]
After 0 reuse: 0 is "newest"
LRU evicts: oldest in recent order</div>`,
    pros: `<h5>Advantages</h5>
<p class="ok">+ Exploits temporal locality well</p>
<p class="ok">+ No Belady's Anomaly — it is a stack algorithm</p>
<p class="ok">+ Close to Optimal in real workloads</p>
<h5>Disadvantages</h5>
<p class="bad">- More overhead — must track access times</p>
<p class="bad">- Full hardware implementation is costly</p>`,
    exam: `<h5>Stack Algorithm Property</h5>
<div class="code-block">LRU: more frames → fewer or equal faults
(Monotone property — safe to increase frames)</div>
<h5>Exam Points</h5>
<p>• Trace LRU — show the "recent" queue at each step<br>
• Why is LRU preferred over FIFO?<br>
• What is the Clock algorithm? (approximates LRU)<br>
• LRU is a stack algorithm — no Belady's anomaly</p>`
  },


  optimal: {
    how: `<h5>How Optimal Works</h5>
<p>Optimal looks <span class="hl">into the future</span> to evict the page not needed for the longest time. Produces minimum page faults.</p>
<div class="code-block">Frames: {0,2,3}, new: 1
Future: 0 at t+2, 2 at t+5, 3 never
→ Evict 3 (never used again)</div>
<h5>Why It Cannot Be Implemented</h5>
<p class="bad">OS cannot know future page accesses. Used only as a benchmark to evaluate other algorithms.</p>`,
    pros: `<h5>Advantages</h5>
<p class="ok">+ Theoretically minimum page faults — gold standard</p>
<p class="ok">+ No Belady's Anomaly</p>
<p class="ok">+ Useful as benchmark</p>
<h5>Disadvantages</h5>
<p class="bad">- Requires future knowledge — impossible in real OS</p>
<p class="bad">- Only usable in simulation</p>`,
    exam: `<h5>Key Exam Points</h5>
<div class="code-block">Optimal faults ≤ LRU faults ≤ FIFO/LIFO faults (generally)
Acts as lower bound for faults</div>
<p>• Why can't Optimal be implemented?<br>
• If LRU faults = Optimal faults, LRU is perfect for that input<br>
• Prove Optimal gives minimum faults for any string</p>`
  },

  
  lifo: {
    how: `<h5>How LIFO Works</h5>
<p>LIFO treats frames like a <span class="hl">stack</span>. The most recently loaded page is evicted first when space is needed.</p>
<div class="code-block">Stack: [7, 0, 1]  ← top (newest) = 1
New page 2 → evict 1 (top)
Stack: [7, 0, 2]</div>
<h5>Why It Performs Poorly</h5>
<p class="bad">LIFO evicts the page just loaded — likely to be reused soon. Goes against temporal locality.</p>`,
    pros: `<h5>Advantages</h5>
<p class="ok">+ Simple to implement — just a stack</p>
<h5>Disadvantages</h5>
<p class="bad">- Poor performance on most workloads</p>
<p class="bad">- Evicts recently loaded pages — wastes the fault cost</p>
<p class="bad">- Almost never used in practice</p>`,
    exam: `<h5>LIFO vs FIFO</h5>
<div class="code-block">FIFO evicts oldest loaded page
LIFO evicts newest loaded page
Both ignore recency of USE</div>
<p>• Compare LIFO to FIFO — when does each fail?<br>
• Why is LIFO impractical for OS memory management?<br>
• Which algorithms exploit temporal locality? (LRU, Optimal)</p>`
  }
};


// RENDER LEARNING SECTION

function renderLearn(a, steps) {
  const el = document.getElementById(a + '-learn');
  const f = steps.filter(s => !s.hit).length;
  const h = steps.filter(s => s.hit).length;
  const timeline = steps.map(s =>
    `<div class="ft-step ${s.hit ? 'ft-hit' : 'ft-fault'}">${s.page}</div>`
  ).join('');

  el.innerHTML = `
    <button class="learn-toggle" onclick="toggleLearn('${a}')">
      <h4>Learning Notes — ${a.toUpperCase()}</h4>
      <span class="learn-arrow" id="${a}-larrow">▼</span>
    </button>
    <div class="learn-body" id="${a}-lbody">
      <div class="timeline-wrap">
        <div class="timeline-label">Your result timeline:</div>
        <div class="fault-timeline">${timeline}</div>
        <div class="timeline-meta">
          <span style="color:#2e7d32">H=${h}</span> &nbsp;
          <span style="color:#c62828">F=${f}</span> &nbsp;
          Hit Rate: ${((h / steps.length) * 100).toFixed(1)}%
        </div>
      </div>
      <div class="learn-tabs">
        <button class="learn-tab active" onclick="switchTab('${a}','how',this)">How It Works</button>
        <button class="learn-tab" onclick="switchTab('${a}','pros',this)">Pros &amp; Cons</button>
        <button class="learn-tab" onclick="switchTab('${a}','exam',this)">Exam Tips</button>
      </div>
      <div class="learn-content" id="${a}-lcontent">${learnData[a].how}</div>
    </div>`;
}

function toggleLearn(a) {
  const b = document.getElementById(a + '-lbody');
  const ar = document.getElementById(a + '-larrow');
  const open = b.classList.contains('show');
  b.classList.toggle('show', !open);
  ar.textContent = open ? '▼' : '▲';
}

function switchTab(a, tab, btn) {
  document.getElementById(a + '-lcontent').innerHTML = learnData[a][tab];
  btn.closest('.learn-body').querySelectorAll('.learn-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}


// AI SUGGESTION

async function runAI(a) {
  const { pages, nf, valid } = getInput(a);
  if (!valid) { alert('Enter valid input first.'); return; }

  const panel = document.getElementById(a + '-ai');
  panel.classList.add('show');
  panel.innerHTML = `
    <div class="ai-header">
      <span class="ai-badge">AI</span>
      <span class="ai-title">Analyzing...</span>
    </div>
    <div class="ai-loading">
      <div class="ai-dots">
        <div class="ai-dot"></div>
        <div class="ai-dot"></div>
        <div class="ai-dot"></div>
      </div>
      <span>Running all algorithms...</span>
    </div>`;

  const res = {
    fifo:    algoFIFO(pages, nf),
    lru:     algoLRU(pages, nf),
    optimal: algoOPT(pages, nf),
    lifo:    algoLIFO(pages, nf)
  };

  const faults = {};
  for (let k in res) faults[k] = res[k].filter(s => !s.hit).length;

  const sorted = Object.entries(faults).sort((a, b) => a[1] - b[1]);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const unique = new Set(pages).size;
  const loc = ((pages.length - unique) / pages.length) > 0.4;
  const names = { fifo: 'FIFO', lru: 'LRU', optimal: 'Optimal', lifo: 'LIFO' };

  let reason = '';
  if (best[0] === 'optimal')
    reason = `<b>Optimal</b> always achieves minimum faults using future knowledge. In practice, use <b>LRU</b> (${faults.lru} faults) as the best real-world alternative.`;
  else if (best[0] === 'lru')
    reason = `<b>LRU</b> performs best here with ${faults.lru} faults. Your reference string shows ${loc ? 'high' : 'moderate'} temporal locality.`;
  else
    reason = `<b>${names[best[0]]}</b> performs best here with ${best[1]} faults for this particular input.`;

  if (faults.lru === faults.optimal)
    reason += ` <span class="ok">LRU matches Optimal perfectly for this input!</span>`;

  await new Promise(r => setTimeout(r, 500));

  const cards = sorted.map(([al, f]) => {
    const iB = al === best[0];
    const isW = al === worst[0] && best[0] !== worst[0];
    const badge = iB
      ? '<div class="ai-abadge">Best</div>'
      : isW ? '<div class="ai-abadge">Worst</div>' : '';
    return `<div class="ai-acard ${iB ? 'best' : isW ? 'worst' : ''}">
      <div class="ai-aname">${names[al]}</div>
      <div class="ai-afaults">${f}</div>
      <div class="ai-alabel">faults</div>
      ${badge}
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="ai-header">
      <span class="ai-badge">AI</span>
      <span class="ai-title">Results for ${pages.length} pages, ${nf} frames</span>
    </div>
    <div class="ai-cards-grid">${cards}</div>
    <div class="ai-reason">${reason}</div>`;
}