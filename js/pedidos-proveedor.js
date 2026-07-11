// pedidos-proveedor.js
// Lógica del módulo Pedidos a Proveedores: crear/editar listas de pedido por proveedor

let proveedoresPedido = [];
let insumosPedido = [];
let pedidosLista = [];
let pedidoEnEdicionId = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-nuevo-pedido").addEventListener("click", () => abrirVistaPedido());
  document.getElementById("btn-volver").addEventListener("click", volverALista);
  document.getElementById("f-proveedor-pedido").addEventListener("change", cargarInsumosDelProveedorSeleccionado);
  document.getElementById("btn-guardar-pedido").addEventListener("click", guardarPedido);

  inicializar();
});

async function inicializar() {
  try {
    const res = await apiPost("listarProveedores");
    proveedoresPedido = (res.data || []).filter(p => p.activo);
  } catch (err) {
    console.error("Error cargando proveedores:", err);
  }

  try {
    const res = await apiPost("listarInventario");
    insumosPedido = (res.data || []).filter(i => i.activo);
  } catch (err) {
    console.error("Error cargando inventario:", err);
  }

  await cargarPedidos();
}

// ---------- Vista lista ----------

async function cargarPedidos() {
  const tbody = document.getElementById("tabla-pedidos-body");
  tbody.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;

  try {
    const res = await apiPost("listarPedidosProveedor");
    pedidosLista = res.data || [];
    renderTablaPedidos();
    document.getElementById("total-pedidos").textContent = pedidosLista.length;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Error al cargar los pedidos.</td></tr>`;
  }
}

function renderTablaPedidos() {
  const tbody = document.getElementById("tabla-pedidos-body");

  if (pedidosLista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No hay pedidos todavía.</td></tr>`;
    return;
  }

  tbody.innerHTML = pedidosLista.map(p => `
    <tr>
      <td>${formatearFecha(p.fecha_solicitud)}</td>
      <td>${escaparHtml(p.nombre_proveedor)}</td>
      <td>-</td>
      <td>
        ${p.estado === "solicitado"
          ? `<span class="badge badge-alerta">Solicitado</span>`
          : `<span class="badge badge-ok">${escaparHtml(p.estado)}</span>`}
      </td>
      <td>
        ${p.estado === "solicitado"
          ? `<button class="btn" style="background:#eee; padding:6px 10px;" onclick="editarPedido('${p.id_pedido}')">Editar</button>`
          : ""}
      </td>
    </tr>
  `).join("");
}

// ---------- Vista crear/editar ----------

function abrirVistaPedido() {
  pedidoEnEdicionId = null;
  document.getElementById("vista-lista").style.display = "none";
  document.getElementById("vista-pedido").style.display = "block";

  const select = document.getElementById("f-proveedor-pedido");
  select.innerHTML = `<option value="">-- Selecciona un proveedor --</option>` + proveedoresPedido
    .map(p => `<option value="${p.id_proveedor}">${escaparHtml(p.nombre)}</option>`)
    .join("");
  select.disabled = false;

  document.getElementById("lista-insumos-proveedor").innerHTML =
    `<p style="color:var(--kahua-texto-secundario);">Selecciona un proveedor para ver su lista de insumos.</p>`;
}

async function editarPedido(idPedido) {
  pedidoEnEdicionId = idPedido;
  document.getElementById("vista-lista").style.display = "none";
  document.getElementById("vista-pedido").style.display = "block";

  const res = await apiPost("obtenerPedidoDetalle", { id_pedido: idPedido });
  const { pedido, lineas } = res.data;

  const select = document.getElementById("f-proveedor-pedido");
  select.innerHTML = proveedoresPedido
    .map(p => `<option value="${p.id_proveedor}">${escaparHtml(p.nombre)}</option>`)
    .join("");
  select.value = pedido.id_proveedor;
  select.disabled = true; // no se cambia el proveedor de un pedido existente

  renderListaInsumos(pedido.id_proveedor, lineas);
}

function volverALista() {
  document.getElementById("vista-pedido").style.display = "none";
  document.getElementById("vista-lista").style.display = "block";
  cargarPedidos();
}

function cargarInsumosDelProveedorSeleccionado() {
  const idProveedor = document.getElementById("f-proveedor-pedido").value;
  if (!idProveedor) {
    document.getElementById("lista-insumos-proveedor").innerHTML =
      `<p style="color:var(--kahua-texto-secundario);">Selecciona un proveedor para ver su lista de insumos.</p>`;
    return;
  }
  renderListaInsumos(idProveedor, []);
}

function renderListaInsumos(idProveedor, lineasExistentes) {
  const insumosDelProveedor = insumosPedido.filter(i => String(i.id_proveedor) === String(idProveedor));
  const contenedor = document.getElementById("lista-insumos-proveedor");

  if (insumosDelProveedor.length === 0) {
    contenedor.innerHTML = `<p style="color:var(--kahua-texto-secundario);">Este proveedor no tiene insumos asignados en Inventario todavía.</p>`;
    return;
  }

  const mapaExistente = {};
  lineasExistentes.forEach(l => { mapaExistente[l.id_insumo] = l.cantidad_solicitada; });

  contenedor.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Insumo</th>
          <th>Stock actual</th>
          <th style="width:140px;">Cantidad a pedir</th>
        </tr>
      </thead>
      <tbody>
        ${insumosDelProveedor.map(i => `
          <tr>
            <td>${escaparHtml(i.nombre_insumo)}</td>
            <td>${i.stock_actual} ${escaparHtml(i.unidad_medida)}</td>
            <td>
              <input type="number" min="0" step="0.01"
                data-id-insumo="${i.id_insumo}"
                class="input-cantidad-pedido"
                value="${mapaExistente[i.id_insumo] || ""}"
                placeholder="0"
                style="width:100%; padding:6px;" />
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function guardarPedido() {
  const idProveedor = document.getElementById("f-proveedor-pedido").value;
  if (!idProveedor) {
    alert("Selecciona un proveedor primero.");
    return;
  }

  const inputs = document.querySelectorAll(".input-cantidad-pedido");
  const items = Array.from(inputs)
    .map(input => ({
      id_insumo: input.dataset.idInsumo,
      cantidad_solicitada: input.value
    }))
    .filter(item => Number(item.cantidad_solicitada) > 0);

  if (items.length === 0) {
    alert("Ingresa al menos una cantidad para agregar al pedido.");
    return;
  }

  setLoading("btn-guardar-pedido", true);
  try {
    if (pedidoEnEdicionId) {
      await apiPost("editarPedidoProveedor", { id_pedido: pedidoEnEdicionId, items });
    } else {
      await apiPost("crearPedidoProveedor", { id_proveedor: idProveedor, items });
    }
    volverALista();
  } finally {
    setLoading("btn-guardar-pedido", false);
  }
}
