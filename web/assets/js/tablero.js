/* Tablero interactivo de brecha catastral por colonia (hn-distrito-central).
   Lee geovisor/data/tablero_colonias.geojson y geovisor/data/tablero_sectores.json.
   Solo agregados por colonia y por sector: no usa datos por predio. */
(function () {
  "use strict";

  var BASE = document.body.getAttribute("data-baseurl") || "/";
  var URL_COL = BASE + "geovisor/data/tablero_colonias.geojson";
  var URL_SEC = BASE + "geovisor/data/tablero_sectores.json";

  var PRIO = {
    1: { label: "Prioridad 1", color: "#b2182b" },
    2: { label: "Prioridad 2", color: "#ef8a62" },
    3: { label: "Prioridad 3", color: "#fddbc7" },
    4: { label: "Seguimiento", color: "#d9dde3" }
  };
  var TIPO = {
    A: { label: "A · Formal consolidado", color: "#1a9850" },
    B: { label: "B · Catastrado con brecha", color: "#fee08b" },
    C: { label: "C · Informal consolidado", color: "#f46d43" },
    D: { label: "D · Ocupación reciente", color: "#d73027" },
    E: { label: "E · Condición crítica", color: "#67001f" }
  };
  var ESTATUS = ["Brecha predominante", "Rezago alto", "Rezago moderado", "Rezago bajo"];

  var state = {
    sectores: new Set(),
    prioridades: new Set([1, 2, 3, 4]),
    estatus: new Set(ESTATUS),
    alertaCritica: false,
    alertaReciente: false,
    q: "",
    sortKey: "f",
    sortDir: -1,
    limit: 50,
    selected: null
  };
  var DATA = { features: [], sectores: {} };
  var map = null;
  var mapReady = false;

  function $(id) { return document.getElementById(id); }
  function fmt(n) {
    var v = Math.round(n), neg = v < 0, t = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (neg ? "-" : "") + t;
  }
  function pct(a, b) { return b > 0 ? (100 * a / b).toFixed(1).replace(".", ",") + " %" : "—"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function normalize(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  // ---------- Filtros
  function passesNonSector(p) {
    if (!state.prioridades.has(p.p)) return false;
    if (!state.estatus.has(p.est)) return false;
    if (state.alertaCritica && p.al.indexOf("critica") < 0) return false;
    if (state.alertaReciente && p.al.indexOf("reciente") < 0) return false;
    if (state.q) {
      var q = normalize(state.q);
      if (normalize(p.c).indexOf(q) < 0 && normalize(p.cod).indexOf(q) < 0) return false;
    }
    return true;
  }
  function passes(p) {
    if (state.sectores.size && !state.sectores.has(p.sec)) return false;
    return passesNonSector(p);
  }
  function filtered() { return DATA.features.filter(function (f) { return passes(f.properties); }); }

  // ---------- Indicadores
  function renderKpis(list) {
    var e = 0, f = 0, c = { 1: 0, 2: 0, 3: 0, 4: 0 };
    list.forEach(function (ft) { var p = ft.properties; e += p.e; f += p.f; c[p.p] += 1; });
    $("tb-kpi-colonias").textContent = fmt(list.length);
    $("tb-kpi-edif").textContent = fmt(e);
    $("tb-kpi-fuera").textContent = fmt(f);
    $("tb-kpi-pct").textContent = pct(f, e);
    $("tb-kpi-prio").innerHTML = [1, 2, 3].map(function (k) {
      return '<span class="tb-chip" style="background:' + PRIO[k].color + ";color:" + (k === 1 ? "#fff" : "#1f2a36") + '">P' + k + ": " + c[k] + "</span>";
    }).join(" ");
    var sel = state.sectores.size ? Array.from(state.sectores).sort().join(", ") : "todos";
    $("tb-kpi-scope").textContent = "Sectores: " + sel;
    var sf = 0, se = 0;
    sectorKeys().forEach(function (k) { var d = DATA.sectores[k] || {}; sf += d.sin_col_fuera || 0; se += d.sin_col_edif || 0; });
    $("tb-sincol").textContent = se > 0
      ? "Además, ≈ " + fmt(se) + " edificaciones (" + fmt(sf) + " fuera de predio) de " + (state.sectores.size ? "estos sectores" : "la ciudad") + " están fuera de cualquier polígono de colonia AMDC y no se cuentan arriba."
      : "";
  }

  // ---------- Gráficos SVG
  var SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs, text) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (text != null) el.textContent = text;
    return el;
  }

  function renderSectorChart() {
    var box = $("tb-chart-sector");
    var agg = {};
    DATA.features.forEach(function (ft) {
      var p = ft.properties;
      if (!p.sec || !passesNonSector(p)) return;
      agg[p.sec] = (agg[p.sec] || 0) + p.f;
    });
    var rows = Object.keys(agg).map(function (k) { return [k, agg[k]]; })
      .filter(function (r) { return r[1] >= 1; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 15);
    box.innerHTML = "";
    if (!rows.length) { box.innerHTML = '<p class="tb-empty">Sin datos para los filtros actuales.</p>'; return; }
    var W = box.clientWidth || 420, rowH = 22, padL = 70, padR = 56, H = rows.length * rowH + 8;
    var max = rows[0][1];
    var svg = svgEl("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Edificaciones fuera de predio por sector" });
    rows.forEach(function (r, i) {
      var y = 4 + i * rowH, w = Math.max(2, (W - padL - padR) * r[1] / max);
      var on = state.sectores.size === 0 || state.sectores.has(r[0]);
      var g = svgEl("g", { class: "tb-bar", tabindex: "0", role: "button", "aria-pressed": state.sectores.has(r[0]) ? "true" : "false" });
      g.appendChild(svgEl("rect", { x: 0, y: y - 2, width: W, height: rowH, fill: "transparent" }));
      g.appendChild(svgEl("text", { x: padL - 8, y: y + 13, "text-anchor": "end", class: "tb-axis" }, "Sector " + r[0]));
      g.appendChild(svgEl("rect", { x: padL, y: y + 2, width: w, height: rowH - 6, rx: 2, fill: on ? "#a50f15" : "#e3c4c6" }));
      g.appendChild(svgEl("text", { x: padL + w + 6, y: y + 13, class: "tb-val" }, fmt(r[1])));
      var tt = svgEl("title", {}, "Sector " + r[0] + ": " + fmt(r[1]) + " edificaciones fuera de predio (clic para filtrar)");
      g.appendChild(tt);
      var toggle = function () { toggleSector(r[0]); };
      g.addEventListener("click", toggle);
      g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggle(); } });
      svg.appendChild(g);
    });
    box.appendChild(svg);
  }

  function sectorKeys() {
    return state.sectores.size ? Array.from(state.sectores) : Object.keys(DATA.sectores);
  }

  function renderTipoChart() {
    var box = $("tb-chart-tipo");
    var cnt = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    sectorKeys().forEach(function (s) {
      var t = (DATA.sectores[s] || {}).tipo || {};
      Object.keys(cnt).forEach(function (k) { cnt[k] += t[k] || 0; });
    });
    var total = Object.keys(cnt).reduce(function (a, k) { return a + cnt[k]; }, 0);
    box.innerHTML = "";
    if (!total) { box.innerHTML = '<p class="tb-empty">Sin celdas clasificadas en los sectores elegidos.</p>'; return; }
    var W = box.clientWidth || 420, rowH = 24, padL = 170, padR = 70, H = 5 * rowH + 6;
    var max = Math.max.apply(null, Object.keys(cnt).map(function (k) { return cnt[k]; }));
    var svg = svgEl("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Celdas por tipología A–E" });
    Object.keys(cnt).forEach(function (k, i) {
      var y = 3 + i * rowH, w = Math.max(cnt[k] ? 2 : 0, (W - padL - padR) * cnt[k] / max);
      svg.appendChild(svgEl("text", { x: padL - 8, y: y + 15, "text-anchor": "end", class: "tb-axis" }, TIPO[k].label));
      svg.appendChild(svgEl("rect", { x: padL, y: y + 3, width: w, height: rowH - 8, rx: 2, fill: TIPO[k].color, stroke: k === "B" ? "#c9b25c" : "none" }));
      svg.appendChild(svgEl("text", { x: padL + w + 6, y: y + 15, class: "tb-val" }, fmt(cnt[k]) + " (" + pct(cnt[k], total) + ")"));
    });
    box.appendChild(svg);
  }

  function renderAnioChart() {
    var box = $("tb-chart-anio");
    var years = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"];
    var ha = {}; years.forEach(function (y) { ha[y] = 0; });
    sectorKeys().forEach(function (s) {
      var a = (DATA.sectores[s] || {}).anio || {};
      years.forEach(function (y) { ha[y] += a[y] || 0; });
    });
    var total = years.reduce(function (t, y) { return t + ha[y]; }, 0);
    box.innerHTML = "";
    var W = box.clientWidth || 420, H = 170, padB = 22, padT = 18;
    var max = Math.max(1, Math.max.apply(null, years.map(function (y) { return ha[y]; })));
    var bw = (W - 10) / years.length;
    var svg = svgEl("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Nueva huella construida por año (ha)" });
    years.forEach(function (y, i) {
      var h = (H - padB - padT) * ha[y] / max, x = 5 + i * bw;
      svg.appendChild(svgEl("rect", { x: x + bw * 0.18, y: H - padB - h, width: bw * 0.64, height: Math.max(h, ha[y] > 0 ? 1 : 0), rx: 2, fill: +y <= 2021 ? "#fd8d3c" : "#bd0026" }));
      svg.appendChild(svgEl("text", { x: x + bw / 2, y: H - padB - h - 4, "text-anchor": "middle", class: "tb-val" }, ha[y] >= 1 ? fmt(ha[y]) : (ha[y] > 0 ? "<1" : "0")));
      svg.appendChild(svgEl("text", { x: x + bw / 2, y: H - 6, "text-anchor": "middle", class: "tb-axis" }, y));
    });
    box.appendChild(svg);
    $("tb-anio-total").textContent = "≈ " + fmt(total) + " ha nuevas entre 2018 y 2025";
  }

  // ---------- Tabla
  var COLS = [
    ["p", "Prior."], ["c", "Colonia"], ["cod", "Código"], ["sec", "Sector"], ["e", "Edif. (≈)"],
    ["f", "Fuera de predio (≈)"], ["pct", "% fuera"], ["est", "Estatus"], ["al", "Alertas"], ["acc", "Acción sugerida"]
  ];
  function alertText(al) {
    return al.map(function (a) { return a === "critica" ? "Condición crítica" : "Crecimiento reciente"; }).join(", ") || "—";
  }
  function renderTable(list) {
    var rows = list.slice().sort(function (a, b) {
      var x = a.properties[state.sortKey], y = b.properties[state.sortKey];
      if (Array.isArray(x)) { x = x.length; y = y.length; }
      if (typeof x === "string") return state.sortDir * x.localeCompare(y, "es");
      return state.sortDir * ((x || 0) - (y || 0));
    });
    var head = "<tr>" + COLS.map(function (c) {
      var arrow = state.sortKey === c[0] ? (state.sortDir < 0 ? " ▼" : " ▲") : "";
      return '<th scope="col"><button type="button" data-sort="' + c[0] + '">' + esc(c[1]) + arrow + "</button></th>";
    }).join("") + "</tr>";
    var body = rows.slice(0, state.limit).map(function (ft) {
      var p = ft.properties;
      return '<tr data-id="' + p.id + '"' + (state.selected === p.id ? ' class="is-selected"' : "") + ">" +
        '<td><span class="tb-dot" style="background:' + PRIO[p.p].color + '"></span>' + (p.p <= 3 ? p.p : "—") + "</td>" +
        "<td>" + esc(p.c) + (p.n ? ' <span class="tb-num">' + p.n + "</span>" : "") + "</td>" +
        "<td>" + esc(p.cod || "sin código") + "</td><td>" + esc(p.sec) + "</td>" +
        '<td class="num">' + fmt(p.e) + '</td><td class="num"><strong>' + fmt(p.f) + '</strong></td><td class="num">' + p.pct + " %</td>" +
        "<td>" + esc(p.est) + "</td><td>" + esc(alertText(p.al)) + "</td><td>" + esc(p.acc) + "</td></tr>";
    }).join("");
    $("tb-table").innerHTML = "<thead>" + head + "</thead><tbody>" + body + "</tbody>";
    $("tb-table-count").textContent = "Mostrando " + Math.min(state.limit, rows.length) + " de " + rows.length + " colonias";
    $("tb-more").hidden = rows.length <= state.limit;
  }

  function downloadCsv() {
    var list = filtered();
    var header = ["prioridad", "colonia", "codigo", "sector", "edificaciones_est", "fuera_predio_est", "pct_fuera", "estatus", "alertas", "accion_sugerida", "n_mapa"];
    var lines = [header.join(",")].concat(list.map(function (ft) {
      var p = ft.properties;
      return [p.p <= 3 ? p.p : "seguimiento", p.c, p.cod, p.sec, p.e, p.f, p.pct, p.est, alertText(p.al), p.acc, p.n || ""]
        .map(function (v) { v = String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(",");
    }));
    var blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "colonias_brecha_catastral_filtradas.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  // ---------- Mapa
  function bboxOf(list) {
    var b = [180, 90, -180, -90];
    function walk(c) {
      if (typeof c[0] === "number") { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }
      else c.forEach(walk);
    }
    list.forEach(function (ft) { walk(ft.geometry.coordinates); });
    return b;
  }
  function initMap() {
    if (!window.maplibregl) { $("tb-map").innerHTML = '<p class="tb-empty">No se pudo cargar el mapa.</p>'; return; }
    var rasterStyle = {
      version: 8,
      sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "&copy; OpenStreetMap contributors" } },
      layers: [{ id: "osm", type: "raster", source: "osm" }]
    };
    try {
      map = new window.maplibregl.Map({ container: "tb-map", style: "https://tiles.openfreemap.org/styles/positron", center: [-87.2, 14.08], zoom: 11, attributionControl: true });
    } catch (err) {
      $("tb-map").innerHTML = '<p class="tb-empty">Este navegador no permite mostrar el mapa (WebGL desactivado). El resto del tablero funciona normalmente.</p>';
      return;
    }
    var fellBack = false;
    map.on("error", function () {
      if (!mapReady && !fellBack) { fellBack = true; map.setStyle(rasterStyle); }
    });
    map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("style.load", function () {
      if (!map.getSource("colonias")) {
        map.addSource("colonias", { type: "geojson", data: { type: "FeatureCollection", features: DATA.features }, promoteId: "id" });
        map.addLayer({ id: "col-fill", type: "fill", source: "colonias", paint: {
          "fill-color": ["match", ["get", "p"], 1, PRIO[1].color, 2, PRIO[2].color, 3, PRIO[3].color, PRIO[4].color],
          "fill-opacity": 0.78 } });
        map.addLayer({ id: "col-line", type: "line", source: "colonias", paint: { "line-color": "#7a1c1c", "line-width": 0.4, "line-opacity": 0.5 } });
        map.addLayer({ id: "col-sel", type: "line", source: "colonias", paint: { "line-color": "#000A62", "line-width": 3 }, filter: ["==", ["get", "id"], -1] });
      }
      mapReady = true;
      applyMapFilter(false);
    });
    map.on("click", "col-fill", function (e) {
      var ft = e.features && e.features[0];
      if (ft) selectColonia(ft.properties.id, false, e.lngLat);
    });
    map.on("mouseenter", "col-fill", function () { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "col-fill", function () { map.getCanvas().style.cursor = ""; });
  }
  function applyMapFilter(fit) {
    if (!map || !mapReady) return;
    var list = filtered();
    var ids = list.map(function (ft) { return ft.properties.id; });
    var flt = ["in", ["get", "id"], ["literal", ids]];
    map.setFilter("col-fill", flt);
    map.setFilter("col-line", flt);
    if (fit && list.length) {
      var b = bboxOf(list);
      map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 30, maxZoom: 15, duration: 600 });
    }
  }
  var popup = null;
  function selectColonia(id, fly, lngLat) {
    state.selected = id;
    var ft = DATA.features[id];
    if (!ft) return;
    var p = ft.properties;
    if (map && mapReady) {
      map.setFilter("col-sel", ["==", ["get", "id"], id]);
      if (fly) {
        var b = bboxOf([ft]);
        map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 60, maxZoom: 16, duration: 600 });
      }
      var at = lngLat || [(bboxOf([ft])[0] + bboxOf([ft])[2]) / 2, (bboxOf([ft])[1] + bboxOf([ft])[3]) / 2];
      if (popup) popup.remove();
      popup = new window.maplibregl.Popup({ maxWidth: "300px" }).setLngLat(at).setHTML(
        '<div class="tb-pop"><strong>' + esc(p.c) + "</strong><br>" +
        "Sector " + esc(p.sec) + (p.cod ? " · código " + esc(p.cod) : "") + "<br>" +
        (p.p <= 3 ? "Prioridad " + p.p + (p.n ? " (n.° " + p.n + " del mapa)" : "") : "Seguimiento") + "<br>" +
        "Edificaciones ≈ " + fmt(p.e) + " · fuera de predio ≈ " + fmt(p.f) + " (" + p.pct + " %)<br>" +
        "Estatus: " + esc(p.est) + "<br>Alertas: " + esc(alertText(p.al)) + "<br><em>" + esc(p.acc) + "</em></div>").addTo(map);
    }
    renderTable(filtered());
    var row = document.querySelector('#tb-table tr[data-id="' + id + '"]');
    if (row) row.scrollIntoView({ block: "nearest" });
  }

  // ---------- Interacción
  function toggleSector(s) {
    if (state.sectores.has(s)) state.sectores.delete(s); else state.sectores.add(s);
    syncSectorSelect();
    refresh(true);
  }
  function syncSectorSelect() {
    var sel = $("tb-f-sector");
    Array.from(sel.options).forEach(function (o) { o.selected = state.sectores.has(o.value); });
  }
  function refresh(fit) {
    state.limit = 50;
    var list = filtered();
    renderKpis(list);
    renderSectorChart();
    renderTipoChart();
    renderAnioChart();
    renderTable(list);
    applyMapFilter(fit);
  }

  function bind() {
    var secs = Array.from(new Set(DATA.features.map(function (f) { return f.properties.sec; }).filter(Boolean))).sort();
    $("tb-f-sector").innerHTML = secs.map(function (s) { return '<option value="' + esc(s) + '">Sector ' + esc(s) + "</option>"; }).join("");
    $("tb-f-sector").addEventListener("change", function () {
      state.sectores = new Set(Array.from(this.selectedOptions).map(function (o) { return o.value; }));
      refresh(true);
    });
    document.querySelectorAll("[data-prio]").forEach(function (el) {
      el.addEventListener("change", function () {
        var k = +el.getAttribute("data-prio");
        if (el.checked) state.prioridades.add(k); else state.prioridades.delete(k);
        refresh(true);
      });
    });
    document.querySelectorAll("[data-est]").forEach(function (el) {
      el.addEventListener("change", function () {
        var k = el.getAttribute("data-est");
        if (el.checked) state.estatus.add(k); else state.estatus.delete(k);
        refresh(true);
      });
    });
    $("tb-f-critica").addEventListener("change", function () { state.alertaCritica = this.checked; refresh(true); });
    $("tb-f-reciente").addEventListener("change", function () { state.alertaReciente = this.checked; refresh(true); });
    var t = null;
    $("tb-f-q").addEventListener("input", function () {
      var v = this.value; clearTimeout(t);
      t = setTimeout(function () { state.q = v.trim(); refresh(true); }, 250);
    });
    $("tb-reset").addEventListener("click", function () {
      state.sectores.clear(); state.prioridades = new Set([1, 2, 3, 4]); state.estatus = new Set(ESTATUS);
      state.alertaCritica = false; state.alertaReciente = false; state.q = ""; state.selected = null;
      document.querySelectorAll("[data-prio],[data-est]").forEach(function (el) { el.checked = true; });
      $("tb-f-critica").checked = false; $("tb-f-reciente").checked = false; $("tb-f-q").value = "";
      syncSectorSelect();
      if (map && mapReady) { map.setFilter("col-sel", ["==", ["get", "id"], -1]); if (popup) popup.remove(); }
      refresh(true);
    });
    $("tb-only-prio").addEventListener("click", function () {
      state.prioridades = new Set([1, 2, 3]);
      document.querySelectorAll("[data-prio]").forEach(function (el) { el.checked = +el.getAttribute("data-prio") <= 3; });
      refresh(true);
    });
    $("tb-table").addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-sort]");
      if (b) {
        var k = b.getAttribute("data-sort");
        if (state.sortKey === k) state.sortDir *= -1; else { state.sortKey = k; state.sortDir = (k === "c" || k === "cod" || k === "sec" || k === "est" || k === "acc") ? 1 : -1; }
        renderTable(filtered()); return;
      }
      var tr = ev.target.closest("tr[data-id]");
      if (tr) selectColonia(+tr.getAttribute("data-id"), true);
    });
    $("tb-more").addEventListener("click", function () { state.limit += 100; renderTable(filtered()); });
    $("tb-csv").addEventListener("click", downloadCsv);
    var rt = null;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { renderSectorChart(); renderTipoChart(); renderAnioChart(); }, 200);
    });
  }

  function start() {
    Promise.all([fetch(URL_COL).then(function (r) { return r.json(); }), fetch(URL_SEC).then(function (r) { return r.json(); })])
      .then(function (res) {
        DATA.features = res[0].features.sort(function (a, b) { return a.properties.id - b.properties.id; });
        DATA.sectores = res[1].sectores || {};
        bind();
        refresh(false);
        initMap();
        $("tb-loading").hidden = true;
      })
      .catch(function (err) {
        $("tb-loading").textContent = "No se pudieron cargar los datos del tablero (" + err + ").";
      });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
