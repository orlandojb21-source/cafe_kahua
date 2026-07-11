// utils.js
// Funciones de formateo y validación compartidas por todos los módulos

function formatearMoneda(valor) {
  const num = Number(valor) || 0;
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: APP_CONFIG.moneda || "USD"
  });
}

function formatearFecha(fecha) {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-PA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function generarId(prefijo = "id") {
  return `${prefijo}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function esStockBajo(stockActual, stockMinimo) {
  return Number(stockActual) <= Number(stockMinimo);
}

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}
