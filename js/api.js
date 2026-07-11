// api.js
// Funciones genéricas para comunicarse con el backend (Google Apps Script Web App)

/**
 * Llama a una acción del backend vía POST.
 * @param {string} accion - nombre de la acción (ej. "listarInventario", "crearProducto")
 * @param {object} payload - datos a enviar
 * @returns {Promise<any>} respuesta del backend ya parseada
 */
async function apiPost(accion, payload = {}) {
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

    return data;
  } catch (err) {
    console.error(`apiPost(${accion}) falló:`, err);
    mostrarError(err.message || "Error de conexión con el servidor");
    throw err;
  }
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
