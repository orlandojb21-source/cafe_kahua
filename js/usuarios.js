// usuarios.js
// Vista de solo lectura de la hoja Usuarios. Todavía no hay login/autenticación,
// así que esto solo muestra lo que ya está cargado en el Sheet como referencia.

const ROLES_LABEL = {
  dueño: "Dueño",
  admin: "Admin",
  soporte: "Soporte",
  administracion: "Administración",
  cajero: "Cajero",
  cocina: "Cocina",
  despacho: "Despacho"
};

const ROLES_BADGE_COLOR = {
  dueño:          { bg: "rgba(91,107,69,0.15)",  color: "var(--kahua-verde)" },
  admin:          { bg: "rgba(91,107,69,0.15)",  color: "var(--kahua-verde)" },
  soporte:        { bg: "rgba(91,107,69,0.15)",  color: "var(--kahua-verde)" },
  administracion: { bg: "rgba(224,166,57,0.18)", color: "var(--kahua-terracota)" },
  cajero:         { bg: "#eee",                  color: "var(--kahua-texto)" },
  cocina:         { bg: "#eee",                  color: "var(--kahua-texto)" },
  despacho:       { bg: "#eee",                  color: "var(--kahua-texto)" }
};

document.addEventListener("DOMContentLoaded", cargarUsuarios);

async function cargarUsuarios() {
  const tbody = document.getElementById("tabla-usuarios-body");
  tbody.innerHTML = `<tr><td colspan="4">Cargando...</td></tr>`;

  try {
    const res = await apiPost("listarUsuarios");
    const usuarios = res.data || [];

    document.getElementById("total-usuarios").textContent = usuarios.length;

    if (usuarios.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4">No hay usuarios registrados todavía.</td></tr>`;
      return;
    }

    tbody.innerHTML = usuarios.map(u => {
      const rolInfo = ROLES_BADGE_COLOR[u.rol] || { bg: "#eee", color: "var(--kahua-texto)" };
      const rolLabel = ROLES_LABEL[u.rol] || escaparHtml(u.rol || "-");

      return `
        <tr>
          <td>${escaparHtml(u.nombre) || "-"}</td>
          <td>${escaparHtml(u.email) || "-"}</td>
          <td><span class="badge" style="background:${rolInfo.bg}; color:${rolInfo.color};">${rolLabel}</span></td>
          <td>
            ${u.activo
              ? `<span class="badge badge-ok">Activo</span>`
              : `<span class="badge badge-alerta">Inactivo</span>`}
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">Error al cargar los usuarios.</td></tr>`;
  }
}
