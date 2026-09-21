const API = "../api/?endpoint=";
let charts = [];

const fmt = n => "$" + Number(n).toLocaleString(undefined, {maximumFractionDigits: 0});
const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

async function fetchData(endpoint, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const r = await fetch(API + endpoint + "&" + qs);
  if (!r.ok) throw new Error("API error: " + r.status);
  return r.json();
}

function makeChart(ctx, cfg) {
  charts.push(new Chart(ctx, cfg));
}
function destroyCharts() { charts.forEach(c => c.destroy()); charts = []; }
function el(html) { const d = document.createElement("div"); d.innerHTML = html; return d.firstElementChild; }

/* ---------------- Pages ---------------- */

async function renderOverview(year) {
  const [s, tr] = await Promise.all([fetchData("summary", {year}), fetchData("regions", {year})]);
  const t = await fetchData("trends", {year});
  const c = document.getElementById("content");
  const deltaClass = s.yoy_growth_pct >= 0 ? "up" : "down";
  c.innerHTML = "";
  c.appendChild(el(`<div class="cards">
    <div class="card"><div class="label">Total Sales</div><div class="value">${fmt(s.total_sales)}</div>
      <div class="delta ${deltaClass}">${s.yoy_growth_pct}% vs ${year-1}</div></div>
    <div class="card"><div class="label">Total Profit</div><div class="value">${fmt(s.total_profit)}</div></div>
    <div class="card"><div class="label">Margin</div><div class="value">${s.margin_pct}%</div></div>
    <div class="card"><div class="label">Orders</div><div class="value">${s.order_count.toLocaleString()}</div></div>
  </div>`));

  const panel = el(`<div class="panel"><h2>Monthly Sales & Profit</h2><canvas id="trendChart"></canvas></div>`);
  c.appendChild(panel);
  makeChart(document.getElementById("trendChart"), {
    type: "line",
    data: { labels: t.map(r => months[r.month - 1]),
      datasets: [
        { label: "Sales", data: t.map(r => r.sales), borderColor: "#2563eb", backgroundColor: "#2563eb22", fill: true, tension: .3 },
        { label: "Profit", data: t.map(r => r.profit), borderColor: "#059669", tension: .3 }]},
    options: { responsive: true, interaction: { mode: "index", intersect: false } }
  });

  const best = tr[0], worst = tr[tr.length - 1];
  c.appendChild(el(`<div class="panel"><h2>Key Insights</h2><ul id="insights">
    <li><b>${best.region}</b> leads all regions with <b>${fmt(best.actual_sales)}</b> in sales.</li>
    <li><b>${worst.region}</b> is the lowest performer (${worst.variance_pct}% vs target).</li>
    <li>Profit margin of <b>${s.margin_pct}%</b> ${s.margin_pct > 25 ? "exceeds" : "is below"} the 25% benchmark.</li>
  </ul></div>`));
}

async function renderTrends(year) {
  const t = await fetchData("trends", {year});
  const c = document.getElementById("content");
  c.innerHTML = "";
  const panel = el(`<div class="panel"><h2>Sales Trend with 3-Month Moving Average</h2><canvas id="c1"></canvas></div>`);
  c.appendChild(panel);
  makeChart(document.getElementById("c1"), {
    type: "line",
    data: { labels: t.map(r => months[r.month - 1]),
      datasets: [
        { label: "Sales", data: t.map(r => r.sales), borderColor: "#2563eb", tension: .3 },
        { label: "3-mo MA", data: t.map(r => r.moving_avg), borderColor: "#f59e0b", borderDash: [6,4], tension: .3 }]},
  });
  const rows = t.map((r, i) => {
    const mom = i === 0 ? "" : ((r.sales / t[i-1].sales - 1) * 100).toFixed(1) + "%";
    return `<tr><td>${months[r.month-1]}</td><td>${fmt(r.sales)}</td><td>${fmt(r.profit)}</td><td>${mom}</td></tr>`;
  }).join("");
  c.appendChild(el(`<div class="panel"><h2>Month-over-Month</h2><table>
    <tr><th>Month</th><th>Sales</th><th>Profit</th><th>MoM %</th></tr>${rows}</table></div>`));
}

async function renderProducts(year) {
  const p = await fetchData("products", {year, n: 10});
  const c = document.getElementById("content");
  c.innerHTML = "";
  const grid = el(`<div class="grid2">
    <div class="panel"><h2>Top 10 Products by Sales</h2><canvas id="bar"></canvas></div>
    <div class="panel"><h2>Cumulative Share (Pareto)</h2><canvas id="pareto"></canvas></div></div>`);
  c.appendChild(grid);
  makeChart(document.getElementById("bar"), {
    type: "bar",
    data: { labels: p.map(r => r.name),
      datasets: [{ data: p.map(r => r.sales), backgroundColor: "#2563eb" }]},
    options: { indexAxis: "y" }
  });
  makeChart(document.getElementById("pareto"), {
    type: "bar",
    data: { labels: p.map(r => r.name),
      datasets: [{ data: p.map(r => r.cum_share_pct), backgroundColor: "#059669" }]},
  });
  const rows = p.map(r => `<tr><td>${r.name}</td><td>${r.category}</td><td>${fmt(r.sales)}</td>
    <td>${fmt(r.profit)}</td><td>${r.sales_share_pct}%</td><td>${r.cum_share_pct}%</td></tr>`).join("");
  c.appendChild(el(`<div class="panel"><h2>Detail</h2><table>
    <tr><th>Product</th><th>Category</th><th>Sales</th><th>Profit</th><th>Share</th><th>Cum.</th></tr>${rows}</table></div>`));
}

async function renderRegions(year) {
  const r = await fetchData("regions", {year});
  const c = document.getElementById("content");
  c.innerHTML = "";
  const panel = el(`<div class="panel"><h2>Actual vs Target by Region</h2><canvas id="rg"></canvas></div>`);
  c.appendChild(panel);
  makeChart(document.getElementById("rg"), {
    type: "bar",
    data: { labels: r.map(x => x.region),
      datasets: [
        { label: "Actual", data: r.map(x => x.actual_sales), backgroundColor: "#2563eb" },
        { label: "Target", data: r.map(x => x.target_sales), backgroundColor: "#d1d5db" }]},
  });
  const rows = r.map(x => `<tr><td>${x.region}</td><td>${fmt(x.actual_sales)}</td>
    <td>${fmt(x.target_sales)}</td>
    <td class="${x.variance >= 0 ? "up" : "down"}">${x.variance >= 0 ? "+" : ""}${x.variance_pct}%</td></tr>`).join("");
  c.appendChild(el(`<div class="panel"><h2>Variance Detail</h2><table>
    <tr><th>Region</th><th>Actual</th><th>Target</th><th>Variance</th></tr>${rows}</table></div>`));
}

async function renderTargets(year) {
  const v = await fetchData("variance", {year});
  const regions = [...new Set(v.map(r => r.region))];
  const c = document.getElementById("content");
  c.innerHTML = "";
  const panel = el(`<div class="panel"><h2>Monthly Actual vs Target</h2>
    <select id="regionSel">${regions.map(r => `<option>${r}</option>`).join("")}</select>
    <canvas id="tv" style="margin-top:12px"></canvas></div>`);
  c.appendChild(panel);
  function draw(region) {
    destroyCharts();
    const d = v.filter(x => x.region === region);
    makeChart(document.getElementById("tv"), {
      type: "line",
      data: { labels: d.map(x => x.month),
        datasets: [
          { label: "Actual", data: d.map(x => x.actual_sales), borderColor: "#2563eb", tension: .3 },
          { label: "Target", data: d.map(x => x.target_sales), borderColor: "#dc2626", borderDash: [6,4], tension: .3 }]},
    });
  }
  document.getElementById("regionSel").addEventListener("change", e => draw(e.target.value));
  draw(regions[0]);
}

/* ---------------- Router ---------------- */

const pages = { overview: renderOverview, trends: renderTrends,
                products: renderProducts, regions: renderRegions, targets: renderTargets };
let currentPage = "overview";

async function load() {
  destroyCharts();
  document.getElementById("content").innerHTML = "<p>Loading...</p>";
  try { await pages[currentPage](document.getElementById("year").value); }
  catch (e) { document.getElementById("content").innerHTML =
    `<div class="panel"><b>Error:</b> ${e.message}. Is the PHP API running and the database imported?</div>`; }
}

document.getElementById("nav").addEventListener("click", e => {
  if (e.target.tagName !== "BUTTON") return;
  document.querySelectorAll("#nav button").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");
  currentPage = e.target.dataset.page;
  load();
});
document.getElementById("year").addEventListener("change", load);
load();
