const $ = (id) => document.getElementById(id);
let pools = [];
let explorerBase = 'https://scan.bohr.life';

function updateNetworkBadge(chainId, chainName, explorerUrl) {
  const nameEl = $('network-name');
  const idEl = $('network-id');
  if (nameEl) nameEl.textContent = chainName || (chainId === 968 ? 'BOT Chain Testnet' : 'BOT Chain Mainnet');
  if (idEl) idEl.textContent = chainId;
  if (explorerUrl) explorerBase = explorerUrl;
  document.querySelectorAll('a[href^="https://scan.bohr.life/"]').forEach((a) => {
    a.href = a.href.replace('https://scan.bohr.life', explorerBase);
  });
  const shown = nameEl ? nameEl.textContent : 'BDEX Liquidity Sentinel';
  document.title = `BDEX Liquidity Sentinel · ${shown}`;
}
const short = (s) => s ? `${s.slice(0, 8)}…${s.slice(-5)}` : '—';
const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
async function get(url) { const r = await fetch(url); const body = await r.json(); if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`); return body; }
function getPoolAddress(p) { return p.pair ?? p.poolId ?? p.address; }
function displayMoney(value) {
  if (value === undefined || value === null || value === '') return '<span class="muted">Unavailable from API</span>';
  const n = Number(value);
  return Number.isFinite(n) ? `$${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)}` : escapeHtml(value);
}
function availableMetric(p, kind) {
  if (kind === 'liquidity') return p.tvlUsd ?? p.tvlUSD ?? p.tvlUSD24 ?? p.tvl ?? p.liquidityUsd ?? p.liquidityUSD;
  return p.volumeUsd24 ?? p.volumeUSD24 ?? p.volume24Usd ?? p.volume24USD ?? p.volume24 ?? p.volumeUSD ?? p.volumeUsd;
}
function changeMetric(p, kind) {
  const value = kind === 'liquidity' ? p.tvlChangePercent : p.volumeChangePercent;
  if (value === undefined || value === null || value === '' || !Number.isFinite(Number(value))) return null;
  return Number(value);
}
function changeBadge(value) {
  if (value === null) return '<span class="sub muted">Change unavailable</span>';
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '•';
  return `<span class="delta ${direction}">${arrow} ${value > 0 ? '+' : ''}${value.toFixed(2)}%</span><span class="sub">API-reported period change</span>`;
}
function sortUnavailableLast(items, metric) {
  const hasMetric = (item) => {
    const value = availableMetric(item, metric);
    return value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value));
  };
  return [...items].sort((a, b) => Number(hasMetric(b)) - Number(hasMetric(a)));
}
function renderRows() {
  const q = $('search').value.trim().toLowerCase();
  const type = $('type').value;
  const filtered = sortUnavailableLast(pools.filter((p) => (type === 'all' || p.poolType === type) && (!q || `${p.name} ${getPoolAddress(p)} ${p.token0} ${p.token1} ${p.baseTokenAddress} ${p.quoteTokenAddress}`.toLowerCase().includes(q))), 'volume');
  $('rows').innerHTML = filtered.length ? filtered.map((p) => { const address = getPoolAddress(p); const volume = availableMetric(p, 'volume'); const liquidity = availableMetric(p, 'liquidity'); return `<tr><td><a class="pool-link" href="/pool.html?address=${encodeURIComponent(address)}">${escapeHtml(p.name ?? `${short(p.token0)} / ${short(p.token1)}`)}</a><span class="sub">${escapeHtml(short(address))}</span></td><td><span class="chip">${escapeHtml((p.poolType ?? 'unknown').toUpperCase())}</span></td><td>${p.feeTier != null ? `${escapeHtml(p.feeTier)} (${(Number(p.feeTier) / 10000).toFixed(2)}%)` : '<span class="muted">Not reported</span>'}</td><td>${liquidity != null ? displayMoney(liquidity) : '<span class="muted">TVL unavailable from API</span>'}${changeBadge(changeMetric(p, 'liquidity'))}</td><td>${displayMoney(volume)}${changeBadge(changeMetric(p, 'volume'))}</td><td>${p.chainOk ? '<span class="ok">Read OK</span>' : '<a class="muted" href="/pool.html?address=' + encodeURIComponent(address) + '">Open for chain read</a>'}</td><td><a class="muted" href="${explorerBase}/address/${encodeURIComponent(address)}" target="_blank" rel="noreferrer">BOTScan ↗</a></td></tr>`; }).join('') : '<tr><td colspan="7" class="empty">No matching pools in the live response.</td></tr>';
}
async function load() {
  $('error').classList.add('hidden'); $('refresh').textContent = 'Refreshing…';
  try {
    const [health, directory] = await Promise.all([get('/api/health'), get('/api/pools?type=all')]);
    const summaryRows = directory.pools?.data;
    if (!Array.isArray(summaryRows)) throw new Error('Pool API returned an unexpected schema; values hidden rather than guessed.');
    if (directory.pairs?.success === false || !Array.isArray(directory.pairs?.data)) throw new Error(directory.pairs?.error ?? 'Pairs API unavailable or returned an unexpected schema.');
    const pairRows = directory.pairs.data;
    const poolsById = new Map(summaryRows.map((p) => [getPoolAddress(p)?.toLowerCase(), p]));
    pools = [...pairRows, ...summaryRows].map((item) => {
      const address = getPoolAddress(item)?.toLowerCase();
      const summary = poolsById.get(address);
      return { ...item, ...(summary ?? {}), pair: getPoolAddress(item), poolType: item.poolType ?? summary?.poolType, chainOk: false };
    }).filter((item, index, all) => all.findIndex((other) => getPoolAddress(other)?.toLowerCase() === getPoolAddress(item)?.toLowerCase()) === index);
    $('chain').textContent = health.network.correctChain ? `Connected · ${health.network.chainId}` : `Wrong chain · ${health.network.chainId}`;
    $('block').textContent = `Block ${health.network.blockNumber}`;
    $('v2-count').textContent = health.factories.v2Pairs ?? 'Unavailable';
    $('api-count').textContent = pools.length.toLocaleString();
    $('freshness').textContent = 'Live'; $('updated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
    const verified = health.contracts;
    $('contracts').innerHTML = Object.entries(verified).map(([key, c]) => `<div class="contract-row"><span>${escapeHtml(key)}</span><span class="${c.hasCode ? 'ok' : 'muted'}">${c.hasCode ? 'Code present' : 'Unavailable'} <code>${escapeHtml(short(c.address))}</code></span></div>`).join('');
    renderRows();
  } catch (error) {
    $('freshness').textContent = 'Unavailable'; $('updated').textContent = 'Provider failure — not zero';
    $('error').textContent = `Live source unavailable: ${error.message}. No fallback/mock metrics are displayed.`;
    $('error').classList.remove('hidden'); $('rows').innerHTML = '<tr><td colspan="7" class="empty">Live data unavailable. Retry when providers recover.</td></tr>';
  } finally { $('refresh').textContent = 'Refresh data'; }
}
$('refresh').addEventListener('click', load); $('search').addEventListener('input', renderRows); $('type').addEventListener('change', load);
fetch('/api/healthz').then((r) => r.json()).then((h) => updateNetworkBadge(h.chainId, h.chainName, h.explorerUrl)).catch(() => {});
load();
setInterval(load, 30000);