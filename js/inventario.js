// inventario.js
// Lógica del módulo Inventario: listar, crear, editar, desactivar insumos

let categorias = [];
let proveedores = [];
let insumos = [];

document.addEventListener("DOMContentLoaded", () => {
  // Los listeners se registran primero, sin depender de que la carga de datos funcione
  document.getElementById("btn-nuevo-insumo").addEventListener("click", () => abrirModal());
  document.getElementById("btn-cancelar").addEventListener("click", cerrarModal);
  document.getElementById("form-insumo").addEventListener("submit", guardarInsumo);

  inicializarDatos();
});

async function inicializarDatos() {
  try {
    await Promise.all([cargarCategorias(), cargarProveedores()]);
  } catch (err) {
    console.error("Error cargando categorías/proveedores:", err);
  }

  try {
    await cargarInventario();
  } catch (err) {
    console.error("Error cargando inventario:", err);
  }
}

async function cargarCategorias() {
  const res = await apiPost("listarCategorias");
  categorias = res.data || [];
  const select = document.getElementById("f-categoria");
  select.innerHTML = categorias
    .filter(c => c.activo)
    .map(c => `<option value="${c.id_categoria}">${escaparHtml(c.nombre)}</option>`)
    .join("");
}

async function cargarProveedores() {
  const res = await apiPost("listarProveedores");
  proveedores = res.data || [];
  const select = document.getElementById("f-proveedor");
  select.innerHTML = `<option value="">-- Sin proveedor --</option>` + proveedores
    .filter(p => p.activo)
    .map(p => `<option value="${p.id_proveedor}">${escaparHtml(p.nombre)}</option>`)
    .join("");
}

async function cargarInventario() {
  const tbody = document.getElementById("tabla-inventario-body");
  tbody.innerHTML = `<tr><td colspan="8">Cargando...</td></tr>`;

  const res = await apiPost("listarInventario");
  insumos = (res.data || []).filter(i => i.activo);

  renderTabla();
  actualizarResumen();
}

function nombreCategoria(id) {
  const cat = categorias.find(c => String(c.id_categoria) === String(id));
  return cat ? cat.nombre : "-";
}

function nombreProveedor(id) {
  const prov = proveedores.find(p => String(p.id_proveedor) === String(id));
  return prov ? prov.nombre : "-";
}

function renderTabla() {
  const tbody = document.getElementById("tabla-inventario-body");

  if (insumos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8">No hay insumos registrados todavía.</td></tr>`;
    return;
  }

  tbody.innerHTML = insumos.map(i => {
    const stockBajo = esStockBajo(i.stock_actual, i.stock_minimo);
    return `
      <tr>
        <td>${escaparHtml(i.nombre_insumo)}</td>
        <td>${escaparHtml(nombreCategoria(i.id_categoria))}</td>
        <td>${i.stock_actual} ${escaparHtml(i.unidad_medida)}</td>
        <td>${i.stock_minimo} ${escaparHtml(i.unidad_medida)}</td>
        <td>${formatearMoneda(i.costo_unitario)}</td>
        <td>${escaparHtml(nombreProveedor(i.id_proveedor))}</td>
        <td>
          ${stockBajo
            ? `<span class="badge badge-alerta">Stock bajo</span>`
            : `<span class="badge badge-ok">OK</span>`}
        </td>
        <td>
          <button class="btn" style="background:#eee; padding:6px 10px;" onclick="abrirModal('${i.id_insumo}')">Editar</button>
        </td>
      </tr>
    `;
  }).join("");
}

function actualizarResumen() {
  document.getElementById("total-insumos").textContent = insumos.length;
  const bajos = insumos.filter(i => esStockBajo(i.stock_actual, i.stock_minimo)).length;
  document.getElementById("total-stock-bajo").textContent =
    bajos > 0 ? `${bajos} con stock bajo` : "";
}

function abrirModal(idInsumo) {
  const modal = document.getElementById("modal-insumo");
  const form = document.getElementById("form-insumo");
  form.reset();

  if (idInsumo) {
    const insumo = insumos.find(i => String(i.id_insumo) === String(idInsumo));
    document.getElementById("modal-titulo").textContent = "Editar insumo";
    document.getElementById("f-id-insumo").value = insumo.id_insumo;
    document.getElementById("f-nombre").value = insumo.nombre_insumo;
    document.getElementById("f-categoria").value = insumo.id_categoria;
    document.getElementById("f-unidad").value = insumo.unidad_medida;
    document.getElementById("f-stock-actual").value = insumo.stock_actual;
    document.getElementById("f-stock-minimo").value = insumo.stock_minimo;
    document.getElementById("f-costo").value = insumo.costo_unitario;
    document.getElementById("f-proveedor").value = insumo.id_proveedor || "";
  } else {
    document.getElementById("modal-titulo").textContent = "Nuevo insumo";
    document.getElementById("f-id-insumo").value = "";
  }

  modal.style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal-insumo").style.display = "none";
}

async function guardarInsumo(ev) {
  ev.preventDefault();

  const idInsumo = document.getElementById("f-id-insumo").value;

  const payload = {
    nombre_insumo: document.getElementById("f-nombre").value.trim(),
    id_categoria: document.getElementById("f-categoria").value,
    unidad_medida: document.getElementById("f-unidad").value,
    stock_actual: document.getElementById("f-stock-actual").value,
    stock_minimo: document.getElementById("f-stock-minimo").value,
    costo_unitario: document.getElementById("f-costo").value,
    id_proveedor: document.getElementById("f-proveedor").value
  };

  setLoading("btn-guardar-insumo", true);
  try {
    if (idInsumo) {
      payload.id_insumo = idInsumo;
      await apiPost("editarInsumo", payload);
    } else {
      await apiPost("crearInsumo", payload);
    }
    cerrarModal();
    await cargarInventario();
  } finally {
    setLoading("btn-guardar-insumo", false);
  }
}
