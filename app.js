const $ = selector => document.querySelector(selector);
const fmt = n => Number(n).toLocaleString('en-US');
let state = null;

function render(next) {
  state = next;
  $('#tick').textContent = `TICK ${String(next.meta.tick).padStart(3, '0')}`;
  $('#motifs').textContent = String(next.pulse.neuronMotifs).padStart(2, '0');
  $('#wallets').textContent = String(next.pulse.watchedWallets).padStart(2, '0');
  $('#fresh').textContent = String(next.pulse.freshAddresses).padStart(2, '0');
  $('#enabled').checked = next.config.enabled;
  $('#min-score').value = next.config.minScore;
  $('#max-position').value = next.config.maxPosition;
  $('#score-output').textContent = next.config.minScore;
  $('#size-output').textContent = `$${fmt(next.config.maxPosition)}`;
  $('#paper-pnl').textContent = `${next.pulse.paperPnl >= 0 ? '+' : '-'}$${Math.abs(next.pulse.paperPnl).toFixed(2)}`;
  renderSignal(next.signals[0]);
  renderTape(next.transfers);
  renderPositions(next.positions);
  renderMemory(next.memory);
  renderTrace(next);
  drawGraph(next.network);
}

function renderSignal(signal) {
  $('#signal-empty').classList.toggle('hidden', !!signal);
  $('#signal').classList.toggle('hidden', !signal);
  if (!signal) return;
  $('#signal-status').textContent = signal.status;
  $('#signal-score').textContent = signal.score;
  $('#signal-token').textContent = `$${signal.token}`;
  $('#signal-name').textContent = signal.name;
  $('#signal-time').textContent = new Date(signal.at).toLocaleTimeString([], { hour12: false });
  $('#evidence').innerHTML = signal.evidence.map(e => `<span>${e}</span>`).join('');
  $('#memory').textContent = `${signal.memory.hitRate}% hit · ${signal.memory.medianReturn}× median`;
}

function renderTape(transfers) {
  $('#tape').innerHTML = transfers.slice(0, 7).map((t, i) => `<div class="tape-row ${i === 0 ? 'new' : ''}"><span class="alias">${t.alias}</span><span>${t.fresh}</span><span class="route">${t.hop > 1 ? 'fund → relay' : 'direct'} → $${t.token}</span><span class="value">$${fmt(t.amount)}</span></div>`).join('');
}

function renderPositions(positions) {
  $('#positions').innerHTML = positions.length ? positions.slice(0, 5).map(p => `<div class="position"><strong>$${p.token}</strong><span>$${fmt(p.size)}</span><span class="${p.pnl >= 0 ? 'profit' : 'loss'}">${p.pnl >= 0 ? '+' : '-'}$${Math.abs(p.pnl).toFixed(2)}</span></div>`).join('') : `<p>${state.config.enabled ? 'Armed. Waiting for threshold.' : 'No positions. Autosnipe is disarmed.'}</p>`;
}

function renderMemory(items) {
  $('#cohorts').innerHTML = items.map(c => `<article class="cohort"><p>${c.members.join(' + ')}</p><div><span>PAST RUNS</span><strong>${c.runs}</strong></div><div><span>HIT RATE</span><strong>${c.hitRate}%</strong></div><div><span>MEDIAN</span><strong>${c.medianReturn}×</strong></div></article>`).join('');
}

function drawGraph(network) {
  const canvas = $('#graph');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; }
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
  const token = network.nodes.find(n => n.type === 'token');
  if (!token) return;
  const positions = new Map([[token.id, { x: width * .78, y: height * .5 }]]);
  const hunters = network.nodes.filter(n => n.type === 'hunter');
  const fresh = network.nodes.filter(n => n.type === 'fresh');
  hunters.forEach((n, i) => positions.set(n.id, { x: width * .13, y: 55 + i * Math.min(55, (height - 100) / Math.max(1, hunters.length - 1)) }));
  fresh.forEach((n, i) => positions.set(n.id, { x: width * (.43 + (i % 2) * .1), y: 45 + i * Math.min(46, (height - 80) / Math.max(1, fresh.length - 1)) }));
  for (const edge of network.edges) {
    const a = positions.get(edge.from), b = positions.get(edge.to); if (!a || !b) continue;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); const bend = (a.x + b.x) / 2; ctx.bezierCurveTo(bend, a.y, bend, b.y, b.x, b.y);
    ctx.strokeStyle = edge.pulse ? 'rgba(200,255,0,.8)' : 'rgba(150,160,120,.24)'; ctx.lineWidth = edge.pulse ? 1.5 : .75; ctx.stroke();
    if (edge.pulse) { const t = (Date.now() % 1800) / 1800; const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t; ctx.fillStyle = '#c8ff00'; ctx.shadowBlur = 12; ctx.shadowColor = '#c8ff00'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
  }
  for (const node of network.nodes) {
    const p = positions.get(node.id); if (!p) continue;
    const r = node.type === 'token' ? 20 : node.type === 'hunter' ? 5 : 3.5;
    ctx.fillStyle = node.type === 'token' ? '#c8ff00' : node.type === 'hunter' ? '#f4f5ed' : '#727a5d';
    if (node.type === 'token') { ctx.shadowBlur = 25; ctx.shadowColor = '#c8ff00'; }
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = node.type === 'token' ? '#080905' : '#aeb49e'; ctx.font = `${node.type === 'token' ? 11 : 9}px ui-monospace,monospace`; ctx.textAlign = node.type === 'token' ? 'center' : 'left'; ctx.fillText(node.label, node.type === 'token' ? p.x : p.x + 10, p.y + 3);
  }
}

async function config(patch) {
  const response = await fetch('/api/config', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
  render(await response.json());
}
$('#enabled').addEventListener('change', e => config({ enabled: e.target.checked }));
$('#min-score').addEventListener('input', e => { $('#score-output').textContent = e.target.value; });
$('#min-score').addEventListener('change', e => config({ minScore: Number(e.target.value) }));
$('#max-position').addEventListener('input', e => { $('#size-output').textContent = `$${e.target.value}`; });
$('#max-position').addEventListener('change', e => config({ maxPosition: Number(e.target.value) }));
$('#reset').addEventListener('click', async () => render(await (await fetch('/api/reset', { method: 'POST' })).json()));
setInterval(() => { $('#clock').textContent = new Date().toISOString().slice(11, 19) + ' UTC'; }, 1000);
new EventSource('/api/stream').onmessage = event => render(JSON.parse(event.data));

// Live Robinhood token explorer ------------------------------------------------
const tokenUI = { items: [], selected: null, holders: [], filter: 'ALL', traceWallet: null, view: 'overview' };
const safe = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const money = value => value == null ? '—' : Number(value) >= 1_000_000 ? `$${(Number(value) / 1_000_000).toFixed(2)}M` : Number(value) >= 1000 ? `$${(Number(value) / 1000).toFixed(1)}K` : `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
const short = address => `${address.slice(0, 7)}…${address.slice(-5)}`;

async function loadTokens(query = '') {
  $('#token-loading').classList.remove('hidden');
  $('#token-loading').textContent = query ? `Searching Robinhood Chain for “${query}”…` : 'Reading recent Pons V2 launches…';
  $('#token-list').innerHTML = '';
  try {
    const response = await fetch(`/api/tokens${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    const data = await response.json();
    tokenUI.items = data.items || [];
    $('#live-status').textContent = data.mode;
    $('#live-source').textContent = data.source;
    $('#live-dot').style.background = data.mode === 'LIVE' ? '#c8ff00' : '#ff594d';
    $('#token-count').textContent = `${tokenUI.items.length} FOUND`;
    $('#token-loading').classList.add('hidden');
    renderTokens();
    if (tokenUI.items.length) await selectToken(tokenUI.items[0]);
    else $('#token-loading').classList.remove('hidden'), $('#token-loading').textContent = 'No Robinhood token matched that ticker or contract.';
  } catch (error) {
    $('#live-status').textContent = 'DEGRADED';
    $('#token-loading').textContent = `Live source unavailable: ${error.message}`;
  }
}

function renderTokens() {
  $('#token-list').innerHTML = tokenUI.items.map((token, index) => `<button class="token-card ${index === 0 ? 'active' : ''}" data-address="${safe(token.address)}"><span class="token-dot">${safe((token.symbol || '?').slice(0, 2))}</span><span><strong>$${safe(token.symbol)}</strong><small>${safe(token.name)}</small></span><span><b>${safe(token.phase || 'TOKEN')}</b>${token.blocksAgo != null ? `${token.blocksAgo} blocks` : safe(token.protocol)}</span></button>`).join('');
  document.querySelectorAll('.token-card').forEach(card => card.addEventListener('click', () => {
    const item = tokenUI.items.find(token => token.address.toLowerCase() === card.dataset.address.toLowerCase());
    document.querySelectorAll('.token-card').forEach(x => x.classList.toggle('active', x === card));
    if (item) selectToken(item);
  }));
}

async function selectToken(token) {
  tokenUI.selected = token;
  tokenUI.traceWallet = null;
  $('#detail-empty').classList.add('hidden');
  $('#detail-content').classList.remove('hidden');
  $('#detail-symbol').textContent = `$${token.symbol}`;
  $('#detail-name').textContent = token.name;
  $('#token-avatar').textContent = (token.symbol || '?').slice(0, 2);
  $('#token-protocol').textContent = token.protocol || 'ROBINHOOD ERC-20';
  $('#detail-address').textContent = token.address;
  $('#detail-price').textContent = token.priceUsd ? money(token.priceUsd) : 'CURVE';
  $('#detail-liquidity').textContent = money(token.liquidityUsd);
  $('#detail-volume').textContent = money(token.volume24h);
  $('#detail-phase').textContent = token.phase || 'UNKNOWN';
  $('#detail-deployer').textContent = token.deployer ? short(token.deployer) : 'UNKNOWN';
  $('#detail-block').textContent = token.blockNumber ? fmt(token.blockNumber) : 'INDEXED TOKEN';
  $('#explorer-link').href = token.explorerUrl;
  showTokenView('overview');
  tokenUI.holders = [];
  $('#holders-loading').classList.remove('hidden');
  $('.bubble-layout').classList.add('hidden');
  await fetch('/api/focus', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ symbol: token.symbol, name: token.name, liquidity: token.liquidityUsd }) });
  try {
    const response = await fetch(`/api/token/${token.address}/holders`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'holder read failed');
    tokenUI.holders = data.items || [];
    $('#holder-coverage').textContent = `${data.mode} · ${data.coverage} · ${tokenUI.holders.length} active`;
    $('#holder-note').textContent = `${data.heuristic}. Age is an activity heuristic, not a creation date.`;
    $('#holders-loading').classList.add('hidden');
    $('.bubble-layout').classList.remove('hidden');
    renderHolders();
  } catch (error) {
    $('#holders-loading').textContent = `Holder graph unavailable: ${error.message}`;
  }
}

function filteredHolders() {
  if (tokenUI.filter === 'ALL') return tokenUI.holders;
  if (tokenUI.filter === 'ESTABLISHED') return tokenUI.holders.filter(h => h.kind === 'ESTABLISHED' || h.kind === 'WARM');
  if (tokenUI.filter === 'CONTRACT') return tokenUI.holders.filter(h => h.accountType === 'CONTRACT');
  return tokenUI.holders.filter(h => h.kind === tokenUI.filter);
}

function renderHolders() {
  const holders = filteredHolders();
  $('#holder-list').innerHTML = holders.length ? holders.slice(0, 20).map((holder, index) => `<a class="holder-row" href="${safe(holder.explorerUrl)}" target="_blank" rel="noreferrer"><span class="holder-rank">${String(index + 1).padStart(2, '0')}</span><span><strong>${safe(short(holder.address))}</strong><small><b class="wallet-kind ${safe(holder.kind)}">${safe(holder.kind)}</b>${safe(holder.accountType)} · ${holder.nonce} outgoing tx</small></span><span>${holder.percentage.toFixed(2)}%</span></a>`).join('') : '<div class="token-loading">No holders match this filter.</div>';
  drawHolderMap(holders.slice(0, 28));
}

function drawHolderMap(holders) {
  const canvas = $('#holder-map');
  const dpr = Math.min(devicePixelRatio || 1, 2), width = canvas.clientWidth, height = canvas.clientHeight;
  canvas.width = width * dpr; canvas.height = height * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  if (!holders.length) { ctx.fillStyle = '#777d69'; ctx.font = '13px ui-monospace'; ctx.textAlign = 'center'; ctx.fillText('NO MATCHING HOLDERS', width / 2, height / 2); return; }
  const bubbles = holders.map((holder, index) => {
    const angle = index * 2.39996, distance = 26 + Math.sqrt(index) * 47;
    return { holder, r: Math.max(15, Math.min(58, 14 + Math.sqrt(Math.max(holder.percentage, .02)) * 12)), x: width / 2 + Math.cos(angle) * distance, y: height / 2 + Math.sin(angle) * distance * .74 };
  });
  for (let pass = 0; pass < 70; pass++) for (let i = 0; i < bubbles.length; i++) for (let j = i + 1; j < bubbles.length; j++) {
    const a = bubbles[i], b = bubbles[j], dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy) || 1, min = a.r + b.r + 5;
    if (dist < min) { const push = (min - dist) / 2; a.x -= dx / dist * push; a.y -= dy / dist * push; b.x += dx / dist * push; b.y += dy / dist * push; }
  }
  bubbles.forEach(({ holder, r, x, y }, index) => {
    x = Math.max(r + 5, Math.min(width - r - 5, x)); y = Math.max(r + 5, Math.min(height - r - 5, y));
    const isNew = holder.kind === 'NEW', isContract = holder.accountType === 'CONTRACT';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = isNew ? 'rgba(200,255,0,.22)' : isContract ? 'rgba(255,255,255,.08)' : 'rgba(116,126,89,.13)';
    ctx.strokeStyle = isNew ? '#c8ff00' : isContract ? '#d8dacd' : '#68704f'; ctx.lineWidth = index < 3 ? 2 : 1; ctx.fill(); ctx.stroke();
    ctx.fillStyle = isNew ? '#c8ff00' : '#f4f5ed'; ctx.textAlign = 'center'; ctx.font = `${index < 3 ? 12 : 10}px ui-monospace`; ctx.fillText(`#${index + 1}`, x, y - 3);
    ctx.fillStyle = '#8f967b'; ctx.font = '9px ui-monospace'; ctx.fillText(`${holder.percentage.toFixed(1)}%`, x, y + 11);
  });
}

$('#token-search').addEventListener('submit', event => { event.preventDefault(); loadTokens($('#token-query').value.trim().replace(/^\$/, '')); });
$('.holder-filters').addEventListener('click', event => {
  const button = event.target.closest('button[data-filter]'); if (!button) return;
  tokenUI.filter = button.dataset.filter;
  document.querySelectorAll('.holder-filters button').forEach(item => item.classList.toggle('active', item === button));
  renderHolders();
});
$('#copy-address').addEventListener('click', async () => {
  if (!tokenUI.selected) return;
  await navigator.clipboard.writeText(tokenUI.selected.address);
  $('#copy-address').textContent = 'COPIED'; setTimeout(() => $('#copy-address').textContent = 'COPY', 1200);
});
function showTokenView(view) {
  tokenUI.view = view;
  $('#overview-view').classList.toggle('hidden', view !== 'overview');
  $('#trace-view').classList.toggle('hidden', view !== 'trace');
  $('#bubble-view').classList.toggle('hidden', view !== 'bubbles');
  $('#overview-button').classList.toggle('active', view === 'overview');
  $('#trace-button').classList.toggle('active', view === 'trace');
  $('#bubble-button').classList.toggle('active', view === 'bubbles');
  if (view === 'trace' && state) renderTrace(state);
  if (view === 'bubbles' && tokenUI.holders.length) drawHolderMap(filteredHolders().slice(0, 28));
}
$('#overview-button').addEventListener('click', () => showTokenView('overview'));
$('#trace-button').addEventListener('click', () => showTokenView('trace'));
$('#bubble-button').addEventListener('click', () => showTokenView('bubbles'));
window.addEventListener('resize', () => tokenUI.holders.length && drawHolderMap(filteredHolders().slice(0, 28)));
loadTokens();

function renderTrace(snapshot) {
  if (!$('#trace-view') || !tokenUI.selected) return;
  const signal = snapshot.signals.find(item => item.token === tokenUI.selected.symbol) || snapshot.signals[0];
  const transfers = snapshot.transfers.filter(item => item.token === tokenUI.selected.symbol).slice(0, 6);
  const members = signal?.wallets?.length ? signal.wallets : [...new Set(transfers.map(item => item.alias))];
  const hunters = members.map(alias => snapshot.hunters.find(item => item.alias === alias)).filter(Boolean);
  if (!tokenUI.traceWallet || !members.includes(tokenUI.traceWallet)) tokenUI.traceWallet = members[0] || null;

  $('#trace-title').textContent = signal
    ? `${signal.cohortSize} known wallets are converging on $${tokenUI.selected.symbol}`
    : `Tracing fresh funding around $${tokenUI.selected.symbol}`;
  $('#trace-status').textContent = signal?.status || (transfers.length ? 'FORMING' : 'LISTENING');
  $('#trace-score').textContent = signal?.score ?? String(Math.min(69, transfers.length * 14)).padStart(2, '0');

  $('#funding-paths').innerHTML = transfers.length ? transfers.map((transfer, index) => `
    <button class="funding-path ${transfer.alias === tokenUI.traceWallet ? 'active' : ''}" data-trace-wallet="${safe(transfer.alias)}">
      <span class="path-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="path-node source"><b>${safe(transfer.alias)}</b><small>${safe(transfer.source)}</small></span>
      <i><em>${transfer.hop > 1 ? 'RELAY' : 'DIRECT'}</em></i>
      <span class="path-node fresh"><b>${safe(transfer.fresh)}</b><small>FRESH · $${fmt(transfer.amount)}</small></span>
      <i></i>
      <span class="path-token">$${safe(transfer.token)}</span>
    </button>`).join('') : '<div class="trace-empty">Listening for the first profitable-wallet transfer…</div>';

  $('#trace-wallets').innerHTML = hunters.length ? hunters.map(wallet => `<button data-trace-wallet="${safe(wallet.alias)}" class="${wallet.alias === tokenUI.traceWallet ? 'active' : ''}"><span>${safe(wallet.alias)}</span><strong>${wallet.winRate}%</strong><small>win rate</small></button>`).join('') : '<div class="trace-empty">Cohort not formed yet.</div>';
  const wallet = snapshot.hunters.find(item => item.alias === tokenUI.traceWallet);
  const route = transfers.find(item => item.alias === tokenUI.traceWallet);
  $('#wallet-dossier').innerHTML = wallet ? `
    <div><span>WALLET</span><strong>${safe(wallet.address)}</strong></div>
    <div><span>REALIZED PNL</span><strong class="lime">+${wallet.pnl}%</strong></div>
    <div><span>WIN RATE</span><strong>${wallet.winRate}%</strong></div>
    <div><span>LATEST FUNDING</span><strong>${route ? `$${fmt(route.amount)} → ${safe(route.fresh)}` : 'WAITING'}</strong></div>` : '<p>Select a wallet as the cohort forms.</p>';

  const history = signal?.memory?.history || snapshot.memory.find(item => item.members.some(member => members.includes(member)))?.history || [];
  $('#trace-history').innerHTML = history.length ? history.map(run => `<div class="history-row"><span><b>$${safe(run.token)}</b><small>${safe(run.age)} ago</small></span><span>EXIT <strong class="${run.result >= 0 ? 'profit' : 'loss'}">${run.result >= 0 ? '+' : ''}${run.result.toFixed(1)}×</strong></span><span>PEAK <strong>${run.peak.toFixed(1)}×</strong></span></div>`).join('') : '<div class="trace-empty">No matched formation in memory yet.</div>';
}

$('#trace-view').addEventListener('click', event => {
  const button = event.target.closest('[data-trace-wallet]');
  if (!button || !state) return;
  tokenUI.traceWallet = button.dataset.traceWallet;
  renderTrace(state);
});
