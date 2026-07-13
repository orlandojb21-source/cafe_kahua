// api.js
// Funciones genéricas para comunicarse con el backend (Google Apps Script Web App)
//
// Incluye un caché del lado del navegador (sessionStorage): las acciones de solo
// lectura (listarX / bootstrapX) se guardan por unos minutos, así que volver a un
// menú ya visitado en la misma sesión no dispara una llamada de red nueva.
// Cuando se ejecuta una acción de escritura (crear/editar/marcar/revisar/desactivar),
// se invalidan automáticamente las cachés de lectura que ese cambio pudo afectar.

const CACHE_CLIENTE_TTL_MS = 180000; // 3 minutos

// Acciones de solo lectura que se pueden cachear en el navegador (sin parámetros).
const ACCIONES_CACHEABLES = [
  "listarInventario", "listarCategorias", "listarProveedores",
  "listarRegistroTarjeta", "listarPedidosProveedor", "listarTareas",
  "listarUsuarios", "bootstrapInventario", "bootstrapPedidosProveedor"
];

// Qué cachés de lectura debe borrar cada acción de escritura al completarse
// (espejo, del lado del navegador, del CACHE_KEYS/invalidarCache que ya existe en Code.gs).
const MAPA_INVALIDACION_CLIENTE = {
  crearInsumo:          ["listarInventario", "bootstrapInventario", "bootstrapPedidosProveedor"],
  editarInsumo:         ["listarInventario", "bootstrapInventario", "bootstrapPedidosProveedor"],
  desactivarInsumo:     ["listarInventario", "bootstrapInventario", "bootstrapPedidosProveedor"],

  crearProveedor:       ["listarProveedores", "listarPedidosProveedor", "bootstrapInventario", "bootstrapPedidosProveedor"],
  editarProveedor:      ["listarProveedores", "listarPedidosProveedor", "bootstrapInventario", "bootstrapPedidosProveedor"],
  desactivarProveedor:  ["listarProveedores", "listarPedidosProveedor", "bootstrapInventario", "bootstrapPedidosProveedor"],

  crearRegistroTarjeta: ["listarRegistroTarjeta"],
  editarRegistroTarjeta:["listarRegistroTarjeta"],

  crearPedidoProveedor: ["listarPedidosProveedor", "bootstrapPedidosProveedor"],
  editarPedidoProveedor:["listarPedidosProveedor", "bootstrapPedidosProveedor"],
  marcarPedidoRecibido: ["listarPedidosProveedor", "bootstrapPedidosProveedor", "listarInventario", "bootstrapInventario"],

  crearTarea:           ["listarTareas"],
  marcarPuntoHecho:     ["listarTareas"],
  revisarPunto:         ["listarTareas"]
};

/**
 * Llama a una acción del backend vía POST, usando caché de navegador cuando aplica.
 * @param {string} accion - nombre de la acción (ej. "listarInventario", "crearProducto")
 * @param {object} payload - datos a enviar
 * @returns {Promise<any>} respuesta del backend ya parseada
 */
async function apiPost(accion, payload = {}) {
  const esCacheable = ACCIONES_CACHEABLES.includes(accion) && Object.keys(payload).length === 0;

  if (esCacheable) {
    const cacheado = leerCacheCliente(accion);
    if (cacheado) return cacheado;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ accion, ...payload })
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    if (esCacheable) {
      guardarCacheCliente(accion, data);
    }

    if (MAPA_INVALIDACION_CLIENTE[accion]) {
      invalidarCacheCliente(MAPA_INVALIDACION_CLIENTE[accion]);
    }

    return data;
  } catch (err) {
    console.error(`apiPost(${accion}) falló:`, err);
    mostrarError(err.message || "Error de conexión con el servidor");
    throw err;
  }
}

// ---------- Caché de navegador (sessionStorage) ----------

function claveCacheCliente(accion) {
  return `kahua_cache_${accion}`;
}

function leerCacheCliente(accion) {
  try {
    const raw = sessionStorage.getItem(claveCacheCliente(accion));
    if (!raw) return null;

    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_CLIENTE_TTL_MS) {
      sessionStorage.removeItem(claveCacheCliente(accion));
      return null;
    }

    return data;
  } catch (err) {
    return null; // si algo sale mal leyendo el caché, simplemente seguimos sin él
  }
}

function guardarCacheCliente(accion, data) {
  try {
    sessionStorage.setItem(claveCacheCliente(accion), JSON.stringify({ timestamp: Date.now(), data }));
  } catch (err) {
    // sessionStorage lleno o no disponible (ej. modo incógnito estricto): no es crítico
  }
}

function invalidarCacheCliente(acciones) {
  acciones.forEach(accion => sessionStorage.removeItem(claveCacheCliente(accion)));
}

/**
 * Muestra un mensaje de error simple. Ajusta según tu sistema de notificaciones/toasts.
 */
function mostrarError(mensaje) {
  console.error(mensaje);
  // TODO: reemplazar por un toast/notificación visual cuando esté el sistema de UI
  alert(mensaje);
}

/**
 * Muestra un loading state simple mientras se espera respuesta del backend.
 */
function setLoading(elementoId, isLoading) {
  const el = document.getElementById(elementoId);
  if (!el) return;
  el.disabled = isLoading;
  el.dataset.originalText = el.dataset.originalText || el.textContent;
  el.textContent = isLoading ? "Cargando..." : el.dataset.originalText;
}
