// registro-tarjeta.js
// Lógica del módulo Registro de Tarjeta: listar y crear registros

let registros = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-nuevo-registro").addEventListener("click", abrirModal);
  document.getElementById("btn-cancelar").addEventListener("click", cerrarModal);
  document.getElementById("form-registro").addEventListener("submit", guardarRegistro);

  cargarRegistros();
});

async function cargarRegistros() {
  const tbody = document.getElementById("tabla-registros-body");
  tbody.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;

  try {
    const res = await apiPost("listarRegistroTarjeta");
    registros = res.data || [];
    registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    renderTabla();
    actualizarTotalMes();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Error al cargar los registros.</td></tr>`;
  }
}

function renderTabla() {
  const tbody = document.getElementById("tabla-registros-body");

  if (registros.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No hay registros todavía.</td></tr>`;
    return;
  }

  tbody.innerHTML = registros.map(r => `
    <tr>
      <td>${formatearFecha(r.fecha)}</td>
      <td>${escaparHtml(r.comercio)}</td>
      <td>${formatearMoneda(r.monto)}</td>
      <td>${escaparHtml(r.descripcion)}</td>
      <td>${escaparHtml(r.observacion)}</td>
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

function abrirModal() {
  document.getElementById("form-registro").reset();
  document.getElementById("f-fecha").valueAsDate = new Date();
  document.getElementById("modal-registro").style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal-registro").style.display = "none";
}

async function guardarRegistro(ev) {
  ev.preventDefault();

  const payload = {
    fecha: document.getElementById("f-fecha").value,
    comercio: document.getElementById("f-comercio").value.trim(),
    monto: document.getElementById("f-monto").value,
    descripcion: document.getElementById("f-descripcion").value.trim(),
    observacion: document.getElementById("f-observacion").value.trim()
  };

  setLoading("btn-guardar-registro", true);
  try {
    await apiPost("crearRegistroTarjeta", payload);
    cerrarModal();
    await cargarRegistros();
  } finally {
    setLoading("btn-guardar-registro", false);
  }
}
