// pedidos-proveedor.js
// Lógica del módulo Pedidos a Proveedores: crear/editar listas de pedido por proveedor

let proveedoresPedido = [];
let insumosPedido = [];
let pedidosLista = [];
let pedidoEnEdicionId = null;
let pedidoActualHeader = null;
let lineasRecibidoActual = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-nuevo-pedido").addEventListener("click", () => abrirVistaPedido());
  document.getElementById("btn-volver").addEventListener("click", volverALista);
  document.getElementById("f-proveedor-pedido").addEventListener("change", cargarInsumosDelProveedorSeleccionado);
  document.getElementById("btn-guardar-pedido").addEventListener("click", guardarPedido);
  document.getElementById("btn-generar-pdf").addEventListener("click", generarPdfPedido);
  document.getElementById("btn-marcar-recibido").addEventListener("click", abrirVistaRecibido);
  document.getElementById("btn-volver-recibido").addEventListener("click", volverALista);
  document.getElementById("f-total-factura").addEventListener("input", validarTotales);

  inicializar();
});

async function inicializar() {
  try {
    const res = await apiPost("bootstrapPedidosProveedor");
    const datos = res.data || {};

    proveedoresPedido = (datos.proveedores || []).filter(p => p.activo);
    insumosPedido = (datos.inventario || []).filter(i => i.activo);

    pedidosLista = datos.pedidos || [];
    renderTablaPedidos();
    document.getElementById("total-pedidos").textContent = pedidosLista.length;
  } catch (err) {
    console.error("Error cargando datos de pedidos:", err);
    document.getElementById("tabla-pedidos-body").innerHTML =
      `<tr><td colspan="5">Error al cargar los pedidos.</td></tr>`;
  }
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
  pedidoActualHeader = null;
  document.getElementById("vista-lista").style.display = "none";
  document.getElementById("vista-pedido").style.display = "block";
  document.getElementById("btn-marcar-recibido").style.display = "none";

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
  pedidoActualHeader = pedido;

  const select = document.getElementById("f-proveedor-pedido");
  select.innerHTML = proveedoresPedido
    .map(p => `<option value="${p.id_proveedor}">${escaparHtml(p.nombre)}</option>`)
    .join("");
  select.value = pedido.id_proveedor;
  select.disabled = true; // no se cambia el proveedor de un pedido existente

  document.getElementById("btn-marcar-recibido").style.display =
    pedido.estado === "solicitado" ? "inline-flex" : "none";

  renderListaInsumos(pedido.id_proveedor, lineas);
}

function volverALista() {
  document.getElementById("vista-pedido").style.display = "none";
  document.getElementById("vista-recibido").style.display = "none";
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

// ---------- Generar PDF para enviar al proveedor ----------

function generarPdfPedido() {
  const idProveedor = document.getElementById("f-proveedor-pedido").value;
  if (!idProveedor) {
    alert("Selecciona un proveedor primero.");
    return;
  }

  const proveedor = proveedoresPedido.find(p => String(p.id_proveedor) === String(idProveedor));
  const inputs = document.querySelectorAll(".input-cantidad-pedido");

  const items = Array.from(inputs)
    .map(input => {
      const insumo = insumosPedido.find(i => String(i.id_insumo) === String(input.dataset.idInsumo));
      return { nombre: insumo ? insumo.nombre_insumo : "", unidad: insumo ? insumo.unidad_medida : "", cantidad: input.value };
    })
    .filter(item => Number(item.cantidad) > 0);

  if (items.length === 0) {
    alert("Ingresa al menos una cantidad para generar el PDF.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(27, 59, 51);
  doc.text("Kahua | Panama Coffee Bar", 14, 18);

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(`Pedido a: ${proveedor.nombre}`, 14, 26);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-PA")}`, 14, 32);

  doc.autoTable({
    startY: 38,
    head: [["Insumo", "Cantidad solicitada"]],
    body: items.map(item => [item.nombre, `${item.cantidad} ${item.unidad}`]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [27, 59, 51] }
  });

  const nombreArchivo = `Pedido_${proveedor.nombre.replace(/\s+/g, "_")}_${fechaArchivoPedido()}.pdf`;
  doc.save(nombreArchivo);
}

function fechaArchivoPedido() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- Marcar recibido ----------

function abrirVistaRecibido() {
  if (!pedidoActualHeader) return;

  document.getElementById("vista-pedido").style.display = "none";
  document.getElementById("vista-recibido").style.display = "block";

  apiPost("obtenerPedidoDetalle", { id_pedido: pedidoActualHeader.id_pedido }).then(res => {
    const { lineas } = res.data;
    lineasRecibidoActual = lineas;
    renderListaRecibido(lineas);
    document.getElementById("f-total-factura").value = "";
    validarTotales();
  });
}

function renderListaRecibido(lineas) {
  const contenedor = document.getElementById("lista-recibido");

  contenedor.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Insumo</th>
          <th>Solicitado</th>
          <th style="width:130px;">Cant. recibida</th>
          <th style="width:130px;">Precio unitario (factura)</th>
          <th style="width:100px;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${lineas.map(l => `
          <tr>
            <td>${escaparHtml(l.nombre_insumo)}</td>
            <td>${l.cantidad_solicitada} ${escaparHtml(l.unidad_medida)}</td>
            <td>
              <input type="number" min="0" step="0.01" class="input-cantidad-recibida"
                data-id-detalle="${l.id_detalle}"
                value="${l.cantidad_solicitada}"
                style="width:100%; padding:6px;" />
            </td>
            <td>
              <input type="number" min="0" step="0.01" class="input-precio-factura"
                data-id-detalle="${l.id_detalle}" data-id-insumo="${l.id_insumo}"
                value=""
                placeholder="0.00"
                style="width:100%; padding:6px;" />
            </td>
            <td class="subtotal-linea" data-id-detalle="${l.id_detalle}">$0.00</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  // Prefill del precio con el costo_unitario actual de Inventario, y listeners para recalcular
  lineas.forEach(l => {
    const insumo = insumosPedido.find(i => String(i.id_insumo) === String(l.id_insumo));
    const inputPrecio = contenedor.querySelector(`.input-precio-factura[data-id-detalle="${l.id_detalle}"]`);
    if (insumo && inputPrecio) {
      inputPrecio.value = insumo.costo_unitario;
    }
  });

  contenedor.querySelectorAll(".input-cantidad-recibida, .input-precio-factura")
    .forEach(input => input.addEventListener("input", validarTotales));

  validarTotales();
}

function validarTotales() {
  const filas = document.querySelectorAll("#lista-recibido tbody tr");
  let totalCalculado = 0;

  filas.forEach(fila => {
    const inputCantidad = fila.querySelector(".input-cantidad-recibida");
    const inputPrecio = fila.querySelector(".input-precio-factura");
    if (!inputCantidad || !inputPrecio) return;

    const cantidad = Number(inputCantidad.value) || 0;
    const precio = Number(inputPrecio.value) || 0;
    const subtotal = cantidad * precio;
    totalCalculado += subtotal;

    const idDetalle = inputCantidad.dataset.idDetalle;
    const celdaSubtotal = document.querySelector(`.subtotal-linea[data-id-detalle="${idDetalle}"]`);
    if (celdaSubtotal) celdaSubtotal.textContent = formatearMoneda(subtotal);
  });

  document.getElementById("total-calculado").textContent = formatearMoneda(totalCalculado);

  const totalFactura = Number(document.getElementById("f-total-factura").value) || 0;
  const diferencia = Math.abs(totalCalculado - totalFactura);
  const mensaje = document.getElementById("mensaje-validacion");
  const btnConfirmar = document.getElementById("btn-confirmar-recibido");

  if (totalFactura === 0) {
    mensaje.textContent = "Ingresa el total según la factura.";
    btnConfirmar.disabled = true;
  } else if (diferencia > 0.01) {
    mensaje.textContent = `No cuadra (diferencia de ${formatearMoneda(diferencia)}). Ajusta cantidades o precios.`;
    btnConfirmar.disabled = true;
  } else {
    mensaje.textContent = "Los totales cuadran ✓";
    mensaje.style.color = "var(--kahua-verde)";
    btnConfirmar.disabled = false;
    return;
  }
  mensaje.style.color = "var(--kahua-rojo)";
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-confirmar-recibido").addEventListener("click", confirmarRecibido);
});

async function confirmarRecibido() {
  const filas = document.querySelectorAll("#lista-recibido tbody tr");
  const lineas = Array.from(filas).map(fila => {
    const inputCantidad = fila.querySelector(".input-cantidad-recibida");
    const inputPrecio = fila.querySelector(".input-precio-factura");
    return {
      id_detalle: inputCantidad.dataset.idDetalle,
      id_insumo: inputPrecio.dataset.idInsumo,
      cantidad_recibida: inputCantidad.value,
      precio_factura: inputPrecio.value
    };
  });

  const totalFactura = document.getElementById("f-total-factura").value;

  setLoading("btn-confirmar-recibido", true);
  try {
    const res = await apiPost("marcarPedidoRecibido", {
      id_pedido: pedidoActualHeader.id_pedido,
      lineas,
      total_factura: totalFactura
    });

    if (res.error) {
      alert(res.error);
      return;
    }

    alert("Pedido marcado como recibido. Inventario actualizado.");
    document.getElementById("vista-recibido").style.display = "none";
    document.getElementById("vista-lista").style.display = "block";
    await cargarPedidos();
  } finally {
    setLoading("btn-confirmar-recibido", false);
  }
}
