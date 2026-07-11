// proveedores.js
// Lógica del módulo Proveedores: listar, crear, editar, desactivar

let proveedoresLista = [];

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-nuevo-proveedor").addEventListener("click", () => abrirModal());
  document.getElementById("btn-cancelar").addEventListener("click", cerrarModal);
  document.getElementById("form-proveedor").addEventListener("submit", guardarProveedor);

  cargarProveedoresLista();
});

async function cargarProveedoresLista() {
  const tbody = document.getElementById("tabla-proveedores-body");
  tbody.innerHTML = `<tr><td colspan="7">Cargando...</td></tr>`;

  try {
    const res = await apiPost("listarProveedores");
    proveedoresLista = (res.data || []).filter(p => p.activo);
    renderTabla();
    document.getElementById("total-proveedores").textContent = proveedoresLista.length;
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7">Error al cargar proveedores.</td></tr>`;
  }
}

function renderTabla() {
  const tbody = document.getElementById("tabla-proveedores-body");

  if (proveedoresLista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">No hay proveedores registrados todavía.</td></tr>`;
    return;
  }

  tbody.innerHTML = proveedoresLista.map(p => {
    try {
      return `
    <tr>
      <td>${escaparHtml(p.nombre)}</td>
      <td>${escaparHtml(p.categoria_principal)}</td>
      <td>${escaparHtml(p.contacto_nombre)}</td>
      <td>
        ${p.telefono_whatsapp
          ? `<a href="${linkWhatsapp(p.telefono_whatsapp)}" target="_blank" rel="noopener" style="color:var(--kahua-verde); text-decoration:none;" title="Abrir WhatsApp">
               💬 ${escaparHtml(String(p.telefono_whatsapp))}
             </a>`
          : "-"}
      </td>
      <td>
        ${p.email
          ? `<a href="mailto:${escaparHtml(String(p.email))}" style="color:var(--kahua-verde); text-decoration:none;" title="Enviar correo">
               ✉️ ${escaparHtml(String(p.email))}
             </a>`
          : "-"}
      </td>
      <td>${escaparHtml(p.dias_entrega)}</td>
      <td>
        <button class="btn" style="background:#eee; padding:6px 10px;" onclick="abrirModal('${p.id_proveedor}')">Editar</button>
      </td>
    </tr>
  `;
    } catch (err) {
      console.error("Error renderizando proveedor:", p, err);
      return `<tr><td colspan="7">Error mostrando "${escaparHtml(p.nombre || "un proveedor")}"</td></tr>`;
    }
  }).join("");
}

function linkWhatsapp(telefono) {
  // Quita todo lo que no sea número (espacios, guiones, +, paréntesis)
  // Se fuerza a String() por si el valor viene como número desde el Sheet
  const soloNumeros = String(telefono).replace(/\D/g, "");
  return `https://wa.me/${soloNumeros}`;
}

function abrirModal(idProveedor) {
  const modal = document.getElementById("modal-proveedor");
  const form = document.getElementById("form-proveedor");
  form.reset();

  if (idProveedor) {
    const p = proveedoresLista.find(x => String(x.id_proveedor) === String(idProveedor));
    document.getElementById("modal-titulo").textContent = "Editar proveedor";
    document.getElementById("f-id-proveedor").value = p.id_proveedor;
    document.getElementById("f-nombre").value = p.nombre;
    document.getElementById("f-categoria-principal").value = p.categoria_principal;
    document.getElementById("f-contacto").value = p.contacto_nombre;
    document.getElementById("f-whatsapp").value = p.telefono_whatsapp;
    document.getElementById("f-email").value = p.email;
    document.getElementById("f-direccion").value = p.direccion;
    document.getElementById("f-dias-entrega").value = p.dias_entrega;
    document.getElementById("f-notas").value = p.notas;
  } else {
    document.getElementById("modal-titulo").textContent = "Nuevo proveedor";
    document.getElementById("f-id-proveedor").value = "";
  }

  modal.style.display = "flex";
}

function cerrarModal() {
  document.getElementById("modal-proveedor").style.display = "none";
}

async function guardarProveedor(ev) {
  ev.preventDefault();

  const idProveedor = document.getElementById("f-id-proveedor").value;

  const payload = {
    nombre: document.getElementById("f-nombre").value.trim(),
    categoria_principal: document.getElementById("f-categoria-principal").value.trim(),
    contacto_nombre: document.getElementById("f-contacto").value.trim(),
    telefono_whatsapp: document.getElementById("f-whatsapp").value.trim(),
    email: document.getElementById("f-email").value.trim(),
    direccion: document.getElementById("f-direccion").value.trim(),
    dias_entrega: document.getElementById("f-dias-entrega").value.trim(),
    notas: document.getElementById("f-notas").value.trim()
  };

  setLoading("btn-guardar-proveedor", true);
  try {
    if (idProveedor) {
      payload.id_proveedor = idProveedor;
      await apiPost("editarProveedor", payload);
    } else {
      await apiPost("crearProveedor", payload);
    }
    cerrarModal();
    await cargarProveedoresLista();
  } finally {
    setLoading("btn-guardar-proveedor", false);
  }
}
