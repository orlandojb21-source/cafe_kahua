// planner.js
// Lógica del módulo Planner: línea administrativa de tareas internas
// Flujo: dueño/admin crea tarea con puntos -> administración marca puntos "hecho" ->
//        cuando todos los puntos están hechos la tarea pasa a "en_revision" ->
//        dueño/admin aprueba o corrige punto por punto -> si algún punto queda en
//        "correccion" la tarea vuelve a "en_progreso" hasta que se re-marque como hecho.

let tareasLista = [];
let subtabTareaActual = "todas";
let contadorFilasPunto = 0;
let tareaDetalleActual = null;

const ESTADOS_TAREA = {
  pendiente:    { label: "Pendiente",    bg: "#eee",                          color: "var(--kahua-texto)" },
  en_progreso:  { label: "En progreso",  bg: "rgba(224,166,57,0.18)",         color: "var(--kahua-terracota)" },
  en_revision:  { label: "En revisión",  bg: "rgba(139,90,60,0.15)",          color: "var(--kahua-terracota)" },
  completada:   { label: "Completada",   bg: "rgba(91,107,69,0.15)",          color: "var(--kahua-verde)" }
};

const ESTADOS_PUNTO = {
  pendiente:  { label: "Pendiente",          bg: "#eee",                   color: "var(--kahua-texto-secundario)" },
  hecho:      { label: "Hecho · esperando revisión", bg: "rgba(224,166,57,0.18)", color: "var(--kahua-terracota)" },
  aprobado:   { label: "Aprobado",           bg: "rgba(91,107,69,0.15)",   color: "var(--kahua-verde)" },
  correccion: { label: "Necesita corrección",bg: "rgba(194,59,46,0.12)",   color: "var(--kahua-rojo)" }
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-nueva-tarea").addEventListener("click", abrirVistaNuevaTarea);
  document.getElementById("btn-volver-nueva").addEventListener("click", volverALista);
  document.getElementById("btn-volver-detalle").addEventListener("click", volverALista);
  document.getElementById("btn-agregar-punto").addEventListener("click", () => agregarFilaPunto());
  document.getElementById("btn-guardar-tarea").addEventListener("click", guardarTarea);

  cargarTareas();
});

// ---------- Vista lista ----------

async function cargarTareas() {
  const tbody = document.getElementById("tabla-tareas-body");
  tbody.innerHTML = `<tr><td colspan="6">Cargando...</td></tr>`;

  try {
    const res = await apiPost("listarTareas");
    tareasLista = res.data || [];
    renderTablaTareas();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Error al cargar las tareas.</td></tr>`;
  }
}

function cambiarSubtab(estado) {
  subtabTareaActual = estado;

  ["todas", "pendiente", "en_progreso", "en_revision", "completada"].forEach(t => {
    const btn = document.getElementById(`subtab-${t}`);
    if (t === estado) {
      btn.style.background = "var(--kahua-verde)";
      btn.style.color = "var(--kahua-crema)";
    } else {
      btn.style.background = "#eee";
      btn.style.color = "var(--kahua-texto)";
    }
  });

  renderTablaTareas();
}

function renderTablaTareas() {
  const tbody = document.getElementById("tabla-tareas-body");

  const filtradas = subtabTareaActual === "todas"
    ? tareasLista
    : tareasLista.filter(t => t.estado === subtabTareaActual);

  if (filtradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No hay tareas en este filtro.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtradas.map(t => {
    const puntos = t.puntos || [];
    const aprobados = puntos.filter(p => p.estado === "aprobado").length;
    const estadoInfo = ESTADOS_TAREA[t.estado] || ESTADOS_TAREA.pendiente;

    return `
      <tr>
        <td>${escaparHtml(t.titulo)}</td>
        <td>${escaparHtml(t.creado_por)}</td>
        <td>${formatearFecha(t.fecha_creacion)}</td>
        <td>${aprobados}/${puntos.length} puntos</td>
        <td><span class="badge" style="background:${estadoInfo.bg}; color:${estadoInfo.color};">${estadoInfo.label}</span></td>
        <td>
          <button class="btn" style="background:#eee; padding:6px 10px;" onclick="abrirDetalleTarea('${t.id_tarea}')">Ver</button>
        </td>
      </tr>
    `;
  }).join("");
}

function volverALista() {
  document.getElementById("vista-nueva-tarea").style.display = "none";
  document.getElementById("vista-detalle").style.display = "none";
  document.getElementById("vista-lista").style.display = "block";
  cargarTareas();
}

// ---------- Vista nueva tarea ----------

function abrirVistaNuevaTarea() {
  document.getElementById("vista-lista").style.display = "none";
  document.getElementById("vista-nueva-tarea").style.display = "block";

  document.getElementById("f-titulo-tarea").value = "";
  document.getElementById("f-descripcion-tarea").value = "";
  document.getElementById("lista-puntos-nueva").innerHTML = "";
  contadorFilasPunto = 0;

  agregarFilaPunto();
}

function agregarFilaPunto() {
  contadorFilasPunto++;
  const idFila = `fila-punto-${contadorFilasPunto}`;

  const div = document.createElement("div");
  div.id = idFila;
  div.style.cssText = "display:flex; gap:8px; align-items:center; margin-bottom:8px;";
  div.innerHTML = `
    <input type="text" class="input-punto-descripcion" placeholder="Descripción del punto/paso" style="flex:1; padding:8px;" />
    <input type="date" class="input-punto-fecha" style="padding:8px;" />
    <button type="button" class="btn" style="background:none; border:none; color:var(--kahua-rojo); font-size:18px; padding:4px 8px;" onclick="document.getElementById('${idFila}').remove()" title="Quitar punto">✕</button>
  `;

  document.getElementById("lista-puntos-nueva").appendChild(div);
}

async function guardarTarea() {
  const titulo = document.getElementById("f-titulo-tarea").value.trim();
  if (!titulo) {
    alert("El título de la tarea es obligatorio.");
    return;
  }

  const filas = document.querySelectorAll("#lista-puntos-nueva > div");
  const puntos = Array.from(filas)
    .map(fila => ({
      descripcion: fila.querySelector(".input-punto-descripcion").value.trim(),
      fecha_limite: fila.querySelector(".input-punto-fecha").value
    }))
    .filter(p => p.descripcion);

  if (puntos.length === 0) {
    alert("Agrega al menos un punto/paso con descripción.");
    return;
  }

  const payload = {
    titulo,
    descripcion: document.getElementById("f-descripcion-tarea").value.trim(),
    puntos
  };

  setLoading("btn-guardar-tarea", true);
  try {
    const res = await apiPost("crearTarea", payload);
    if (res.error) {
      alert(res.error);
      return;
    }
    volverALista();
  } finally {
    setLoading("btn-guardar-tarea", false);
  }
}

// ---------- Vista detalle ----------

async function abrirDetalleTarea(idTarea) {
  document.getElementById("vista-lista").style.display = "none";
  document.getElementById("vista-detalle").style.display = "block";

  tareaDetalleActual = tareasLista.find(t => String(t.id_tarea) === String(idTarea));
  renderDetalleTarea();
}

function renderDetalleTarea() {
  const t = tareaDetalleActual;
  if (!t) return;

  const estadoInfo = ESTADOS_TAREA[t.estado] || ESTADOS_TAREA.pendiente;

  document.getElementById("detalle-titulo").textContent = t.titulo;
  document.getElementById("detalle-descripcion").textContent = t.descripcion || "";
  document.getElementById("detalle-creado-por").textContent = t.creado_por;
  document.getElementById("detalle-fecha-creacion").textContent = formatearFecha(t.fecha_creacion);
  document.getElementById("detalle-estado-badge").innerHTML =
    `<span class="badge" style="background:${estadoInfo.bg}; color:${estadoInfo.color};">${estadoInfo.label}</span>`;

  const contenedor = document.getElementById("lista-puntos-detalle");
  const puntos = (t.puntos || []).slice().sort((a, b) => Number(a.orden) - Number(b.orden));

  if (puntos.length === 0) {
    contenedor.innerHTML = `<p style="color:var(--kahua-texto-secundario);">Esta tarea no tiene puntos.</p>`;
    return;
  }

  contenedor.innerHTML = puntos.map(p => {
    const estadoInfoPunto = ESTADOS_PUNTO[p.estado] || ESTADOS_PUNTO.pendiente;

    const puedeMarcarHecho = p.estado === "pendiente" || p.estado === "correccion";
    const puedeRevisar = p.estado === "hecho" && t.estado === "en_revision";

    return `
      <div style="border-bottom:1px solid var(--kahua-borde); padding:12px 0;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px; flex-wrap:wrap;">
          <div style="flex:1; min-width:200px;">
            <p style="margin:0 0 4px; font-weight:600;">${escaparHtml(p.descripcion)}</p>
            ${p.fecha_limite ? `<p style="margin:0; font-size:13px; color:var(--kahua-texto-secundario);">Fecha límite: ${formatearFecha(p.fecha_limite)}</p>` : ""}
            ${p.estado === "correccion" && p.comentario_correccion
              ? `<p style="margin:6px 0 0; font-size:13px; color:var(--kahua-rojo); background:rgba(194,59,46,0.08); padding:6px 10px; border-radius:6px;">✎ ${escaparHtml(p.comentario_correccion)}</p>`
              : ""}
          </div>
          <span class="badge" style="background:${estadoInfoPunto.bg}; color:${estadoInfoPunto.color};">${estadoInfoPunto.label}</span>
        </div>

        <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
          ${puedeMarcarHecho
            ? `<button class="btn btn-primary" style="padding:6px 12px; font-size:13px;" onclick="accionMarcarHecho('${p.id_punto}')">✓ Marcar hecho</button>`
            : ""}
          ${puedeRevisar
            ? `<button class="btn" style="background:var(--kahua-verde); color:#fff; padding:6px 12px; font-size:13px;" onclick="accionRevisar('${p.id_punto}', 'aprobado')">Aprobar</button>
               <button class="btn" style="background:var(--kahua-rojo); color:#fff; padding:6px 12px; font-size:13px;" onclick="accionRevisar('${p.id_punto}', 'correccion')">Enviar corrección</button>`
            : ""}
        </div>
      </div>
    `;
  }).join("");
}

async function accionMarcarHecho(idPunto) {
  try {
    const res = await apiPost("marcarPuntoHecho", { id_punto: idPunto });
    if (res.error) {
      alert(res.error);
      return;
    }
    await refrescarTareaDetalle();
  } catch (err) {
    console.error("Error marcando punto como hecho:", err);
  }
}

async function accionRevisar(idPunto, decision) {
  let comentario = "";
  if (decision === "correccion") {
    comentario = prompt("Describe qué debe corregirse en este punto:");
    if (comentario === null) return; // canceló
    if (!comentario.trim()) {
      alert("Debes indicar un comentario para enviar la corrección.");
      return;
    }
  }

  try {
    const res = await apiPost("revisarPunto", { id_punto: idPunto, decision, comentario });
    if (res.error) {
      alert(res.error);
      return;
    }
    await refrescarTareaDetalle();
  } catch (err) {
    console.error("Error revisando punto:", err);
  }
}

async function refrescarTareaDetalle() {
  const idTarea = tareaDetalleActual.id_tarea;
  const res = await apiPost("listarTareas");
  tareasLista = res.data || [];
  tareaDetalleActual = tareasLista.find(t => String(t.id_tarea) === String(idTarea));
  renderDetalleTarea();
}
