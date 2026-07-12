// registro-tarjeta.js
// Lógica del módulo Registro de Tarjeta: listar y crear registros

let registros = [];
let subtabActual = "todos";
let modoPeriodo = "semana";
let offsetPeriodo = 0;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-nuevo-registro").addEventListener("click", () => abrirModal());
  document.getElementById("btn-cancelar").addEventListener("click", cerrarModal);
  document.getElementById("form-registro").addEventListener("submit", guardarRegistro);

  cargarRegistros();
});

async function cargarRegistros() {
  const tbody = document.getElementById("tabla-registros-body");
  tbody.innerHTML = `<tr><td colspan="7">Cargando...</td></tr>`;

  try {
    const res = await apiPost("listarRegistroTarjeta");
    registros = res.data || [];
    registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    renderTabla();
    actualizarTotalMes();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7">Error al cargar los registros.</td></tr>`;
  }
}

function cambiarSubtab(tipo) {
  subtabActual = tipo;

  ["todos", "tarjeta", "efectivo"].forEach(t => {
    const btn = document.getElementById(`subtab-${t}`);
    if (t === tipo) {
      btn.style.background = "var(--kahua-verde)";
      btn.style.color = "var(--kahua-crema)";
    } else {
      btn.style.background = "#eee";
      btn.style.color = "var(--kahua-texto)";
    }
  });

  renderTabla();
  actualizarTotalMes();
}
function cambiarModoPeriodo() {
  modoPeriodo = document.getElementById("f-modo-periodo").value;
  offsetPeriodo = 0;
  renderTabla();
  actualizarTotalMes();
}

function navegarPeriodo(direccion) {
  offsetPeriodo += direccion;
  renderTabla();
  actualizarTotalMes();
}

function obtenerRangoPeriodo() {
  const hoy = new Date();

  if (modoPeriodo === "semana") {
    // Semana de lunes a domingo
    const diaSemana = hoy.getDay(); // 0 = domingo
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diffLunes + offsetPeriodo * 7);
    lunes.setHours(0, 0, 0, 0);

    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);

    const label = `${lunes.toLocaleDateString("es-PA", { day: "2-digit", month: "2-digit" })} - ${domingo.toLocaleDateString("es-PA", { day: "2-digit", month: "2-digit" })}`;

    return { desde: lunes, hasta: domingo, label, etiquetaTotal: offsetPeriodo === 0 ? "gastado esta semana" : `gastado (${label})` };
  } else {
    const mes = new Date(hoy.getFullYear(), hoy.getMonth() + offsetPeriodo, 1);
    const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1, 0, 0, 0, 0);
    const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59, 999);

    const label = mes.toLocaleDateString("es-PA", { month: "long", year: "numeric" });

    return { desde: primerDia, hasta: ultimoDia, label, etiquetaTotal: offsetPeriodo === 0 ? "gastado este mes" : `gastado en ${label}` };
  }
}

function renderTabla() {
  const tbody = document.getElementById("tabla-registros-body");
  const { desde, hasta, label } = obtenerRangoPeriodo();

  document.getElementById("label-periodo").textContent = label;

  let filtrados = registros.filter(r => {
    const f = new Date(r.fecha);
    return f >= desde && f <= hasta;
  });

  if (subtabActual !== "todos") {
    filtrados = filtrados.filter(r => (r.tipo_pago || "efectivo") === subtabActual);
  }

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">No hay registros en este periodo/filtro.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados.map(r => `
    <tr>
      <td>${formatearFecha(r.fecha)}</td>
      <td>${escaparHtml(r.comercio)}</td>
      <td>${formatearMoneda(r.monto)}</td>
      <td>
        ${r.tipo_pago === "tarjeta"
          ? `<span class="badge" style="background:rgba(91,107,69,0.12); color:var(--kahua-verde);">Tarjeta</span>`
          : `<span class="badge" style="background:rgba(224,166,57,0.15); color:var(--kahua-terracota);">Efectivo</span>`}
      </td>
      <td>${escaparHtml(r.descripcion)}</td>
      <td>${escaparHtml(r.observacion)}</td>
      <td style="text-align:right;">
        <button class="btn" style="background:none; border:none; padding:4px 8px; cursor:pointer; font-size:16px;" onclick="abrirModal('${r.id_registro}')" title="Editar">✏️</button>
      </td>
    </tr>
  `).join("");
}

function actualizarTotalMes() {
  const { desde, hasta, etiquetaTotal } = obtenerRangoPeriodo();

  let base = registros.filter(r => {
    const f = new Date(r.fecha);
    return f >= desde && f <= hasta;
  });

  if (subtabActual !== "todos") {
    base = base.filter(r => (r.tipo_pago || "efectivo") === subtabActual);
  }

  const total = base.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);

  document.getElementById("total-gastado").textContent = formatearMoneda(total);
  document.getElementById("label-total-periodo").textContent = etiquetaTotal;
}

function abrirModal(idRegistro) {
  const form = document.getElementById("form-registro");
  form.reset();

  if (idRegistro) {
    const r = registros.find(x => String(x.id_registro) === String(idRegistro));
    document.getElementById("modal-titulo-registro").textContent = "Editar registro de tarjeta";
    document.getElementById("f-id-registro").value = r.id_registro;
    document.getElementById("f-fecha").value = formatearFechaInput(r.fecha);
    document.getElementById("f-comercio").value = r.comercio;
    document.getElementById("f-tipo-pago").value = r.tipo_pago || "efectivo";
    document.getElementById("f-monto").value = r.monto;
    document.getElementById("f-descripcion").value = r.descripcion;
    document.getElementById("f-observacion").value = r.observacion;
  } else {
    document.getElementById("modal-titulo-registro").textContent = "Nuevo registro de tarjeta";
    document.getElementById("f-id-registro").value = "";
    document.getElementById("f-fecha").valueAsDate = new Date();
    document.getElementById("f-tipo-pago").value = subtabActual === "tarjeta" ? "tarjeta" : "efectivo";
  }

  document.getElementById("modal-registro").style.display = "flex";
}

function formatearFechaInput(fecha) {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "";
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function cerrarModal() {
  document.getElementById("modal-registro").style.display = "none";
}

async function guardarRegistro(ev) {
  ev.preventDefault();

  const idRegistro = document.getElementById("f-id-registro").value;

  const payload = {
    fecha: document.getElementById("f-fecha").value,
    comercio: document.getElementById("f-comercio").value.trim(),
    tipo_pago: document.getElementById("f-tipo-pago").value,
    monto: document.getElementById("f-monto").value,
    descripcion: document.getElementById("f-descripcion").value.trim(),
    observacion: document.getElementById("f-observacion").value.trim()
  };

  setLoading("btn-guardar-registro", true);
  try {
    if (idRegistro) {
      payload.id_registro = idRegistro;
      await apiPost("editarRegistroTarjeta", payload);
    } else {
      await apiPost("crearRegistroTarjeta", payload);
    }
    cerrarModal();
    await cargarRegistros();
  } finally {
    setLoading("btn-guardar-registro", false);
  }
}
