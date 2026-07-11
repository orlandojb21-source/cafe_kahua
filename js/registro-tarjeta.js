// registro-tarjeta.js
// Lógica del módulo Registro de Tarjeta: listar y crear registros

let registros = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-nuevo-registro").addEventListener("click", () => abrirModal());
  document.getElementById("btn-cancelar").addEventListener("click", cerrarModal);
  document.getElementById("form-registro").addEventListener("submit", guardarRegistro);

  cargarRegistros();
});

async function cargarRegistros() {
  const tbody = document.getElementById("tabla-registros-body");
  tbody.innerHTML = `<tr><td colspan="6">Cargando...</td></tr>`;

  try {
    const res = await apiPost("listarRegistroTarjeta");
    registros = res.data || [];
    registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    renderTabla();
    actualizarTotalMes();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Error al cargar los registros.</td></tr>`;
  }
}

function renderTabla() {
  const tbody = document.getElementById("tabla-registros-body");

  if (registros.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No hay registros todavía.</td></tr>`;
    return;
  }

  tbody.innerHTML = registros.map(r => `
    <tr>
      <td>${formatearFecha(r.fecha)}</td>
      <td>${escaparHtml(r.comercio)}</td>
      <td>${formatearMoneda(r.monto)}</td>
      <td>${escaparHtml(r.descripcion)}</td>
      <td>${escaparHtml(r.observacion)}</td>
      <td style="text-align:right;">
        <button class="btn" style="background:none; border:none; padding:4px 8px; cursor:pointer; font-size:16px;" onclick="abrirModal('${r.id_registro}')" title="Editar">✏️</button>
      </td>
    </tr>
  `).join("");
}

function actualizarTotalMes() {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();

  const totalMes = registros
    .filter(r => {
      const f = new Date(r.fecha);
      return f.getMonth() === mesActual && f.getFullYear() === anioActual;
    })
    .reduce((sum, r) => sum + (Number(r.monto) || 0), 0);

  document.getElementById("total-gastado").textContent = formatearMoneda(totalMes);
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
    document.getElementById("f-monto").value = r.monto;
    document.getElementById("f-descripcion").value = r.descripcion;
    document.getElementById("f-observacion").value = r.observacion;
  } else {
    document.getElementById("modal-titulo-registro").textContent = "Nuevo registro de tarjeta";
    document.getElementById("f-id-registro").value = "";
    document.getElementById("f-fecha").valueAsDate = new Date();
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
