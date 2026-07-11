// reportes.js
// Generación de reportes en PDF usando jsPDF + autotable

function iniciarPdf(titulo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(27, 59, 51);
  doc.text("Kahua | Panama Coffee Bar", 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(titulo, 14, 26);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado: ${new Date().toLocaleString("es-PA")}`, 14, 32);

  return doc;
}

function descargarPdf(doc, nombreArchivo) {
  doc.save(nombreArchivo);
}

// ---------- Reporte de Inventario ----------

async function generarReporteInventario() {
  const res = await apiPost("listarInventario");
  const insumos = (res.data || []).filter(i => i.activo);

  const resCategorias = await apiPost("listarCategorias");
  const categorias = resCategorias.data || [];

  const doc = iniciarPdf("Reporte de Inventario");

  const filas = insumos.map(i => {
    const cat = categorias.find(c => String(c.id_categoria) === String(i.id_categoria));
    return [
      i.nombre_insumo,
      cat ? cat.nombre : "-",
      `${i.stock_actual} ${i.unidad_medida}`,
      `${i.stock_minimo} ${i.unidad_medida}`,
      formatearMoneda(i.costo_unitario),
      esStockBajo(i.stock_actual, i.stock_minimo) ? "Stock bajo" : "OK"
    ];
  });

  doc.autoTable({
    startY: 38,
    head: [["Insumo", "Categoría", "Stock actual", "Stock mínimo", "Costo unitario", "Estado"]],
    body: filas,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [27, 59, 51] }
  });

  descargarPdf(doc, `Kahua_Inventario_${fechaArchivo()}.pdf`);
}

// ---------- Reporte de Proveedores ----------

async function generarReporteProveedores() {
  const res = await apiPost("listarProveedores");
  const proveedores = (res.data || []).filter(p => p.activo);

  const doc = iniciarPdf("Reporte de Proveedores");

  const filas = proveedores.map(p => [
    p.nombre,
    p.categoria_principal,
    p.contacto_nombre,
    p.telefono_whatsapp,
    p.dias_entrega
  ]);

  doc.autoTable({
    startY: 38,
    head: [["Nombre", "Categoría", "Contacto", "WhatsApp", "Días de entrega"]],
    body: filas,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [27, 59, 51] }
  });

  descargarPdf(doc, `Kahua_Proveedores_${fechaArchivo()}.pdf`);
}

// ---------- Reporte de Gastos con Tarjeta ----------

async function generarReporteTarjeta() {
  const res = await apiPost("listarRegistroTarjeta");
  let registros = res.data || [];

  const desde = document.getElementById("rep-fecha-desde").value;
  const hasta = document.getElementById("rep-fecha-hasta").value;

  if (desde) {
    registros = registros.filter(r => new Date(r.fecha) >= new Date(desde));
  }
  if (hasta) {
    registros = registros.filter(r => new Date(r.fecha) <= new Date(hasta));
  }

  registros.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  const doc = iniciarPdf("Reporte de Gastos con Tarjeta");

  const filas = registros.map(r => [
    formatearFecha(r.fecha),
    r.comercio,
    formatearMoneda(r.monto),
    r.descripcion,
    r.observacion
  ]);

  const total = registros.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);

  doc.autoTable({
    startY: 38,
    head: [["Fecha", "Comercio", "Monto", "Descripción", "Observación"]],
    body: filas,
    foot: [["", "Total", formatearMoneda(total), "", ""]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [27, 59, 51] },
    footStyles: { fillColor: [243, 236, 217], textColor: [27, 59, 51], fontStyle: "bold" }
  });

  descargarPdf(doc, `Kahua_GastosTarjeta_${fechaArchivo()}.pdf`);
}

function fechaArchivo() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
