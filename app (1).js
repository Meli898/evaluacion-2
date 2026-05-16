/**
 * LUMIÈRE — Salón de Belleza
 * Sistema de Reservas
 *
 * Estructura modular: cada módulo tiene responsabilidad única.
 * Seguridad: sanitización XSS, validación JS+HTML5 robusta.
 * DOM: modificación dinámica sin innerHTML con datos de usuario.
 *
 * IA utilizada: Claude claude-sonnet-4-20250514 (prompt de refactorización y
 * sugerencias de validaciones, estructura de objetos y manejo de errores).
 * Mejoras aplicadas: uso de textContent/createElement, normalización de
 * datos, validaciones semánticas adicionales, código modular con funciones
 * reutilizables.
 */

"use strict";

/* ══════════════════════════════════════════
   MÓDULO 1 — SEGURIDAD: Sanitización y validación
   XSS Prevention: nunca se usa innerHTML con datos del usuario.
   Se usa textContent y createElement para insertar contenido dinámico.
══════════════════════════════════════════ */
const Security = (() => {
  /**
   * Sanitiza un string eliminando caracteres peligrosos para XSS.
   * @param {string} str
   * @returns {string}
   */
  const sanitize = (str) => {
    if (typeof str !== "string") return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      .trim();
  };

  /**
   * Crea un elemento de texto seguro (sin riesgo de XSS).
   * @param {string} tag - Tag HTML
   * @param {string} text - Contenido de texto
   * @param {object} attrs - Atributos opcionales
   * @returns {HTMLElement}
   */
  const safeElement = (tag, text = "", attrs = {}) => {
    const el = document.createElement(tag);
    el.textContent = text; // Siempre textContent, nunca innerHTML
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  };

  /** Validaciones semánticas reutilizables */
  const Validators = {
    required: (val) => val.trim().length > 0,
    email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim()),
    minLength: (val, min) => val.trim().length >= min,
    maxLength: (val, max) => val.trim().length <= max,
    phone: (val) => val === "" || /^[+\d\s\-()]{7,15}$/.test(val.trim()),
    noScript: (val) => !/<script|javascript:|on\w+=/i.test(val),
    password: (val) =>
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(val),
    futureDate: (val) => {
      if (!val) return false;
      const d = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d >= today;
    },
  };

  return { sanitize, safeElement, Validators };
})();

/* ══════════════════════════════════════════
   MÓDULO 2 — DATOS: Arreglos y Objetos
   Estructura coherente y escalable para clientes, reservas y servicios.
══════════════════════════════════════════ */
const Store = (() => {
  // ── Datos de servicios (escalable: se puede cargar desde API)
  const SERVICIOS = [
    { id: "s1", nombre: "Corte de Cabello", precio: 15000, duracion: 45, emoji: "✂️", desc: "Corte personalizado para todo tipo de cabello con lavado incluido." },
    { id: "s2", nombre: "Coloración", precio: 35000, duracion: 120, emoji: "🎨", desc: "Tinte completo o rayitos con productos premium sin amoníaco." },
    { id: "s3", nombre: "Manicure", precio: 12000, duracion: 60, emoji: "💅", desc: "Manicure clásica con esmaltado tradicional o semipermanente." },
    { id: "s4", nombre: "Pedicure", precio: 14000, duracion: 60, emoji: "🦶", desc: "Pedicure completa con masaje relajante incluido." },
    { id: "s5", nombre: "Masaje Relajante", precio: 25000, duracion: 60, emoji: "💆", desc: "Masaje cuerpo completo con aceites esenciales naturales." },
    { id: "s6", nombre: "Tratamiento Facial", precio: 28000, duracion: 90, emoji: "🌿", desc: "Limpieza profunda e hidratación con tecnología ultrasónica." },
    { id: "s7", nombre: "Peinado & Styling", precio: 18000, duracion: 60, emoji: "💇", desc: "Peinado para eventos especiales, ondas, recogidos y más." },
    { id: "s8", nombre: "Depilación", precio: 10000, duracion: 30, emoji: "🌸", desc: "Depilación con cera tibia de alta calidad." },
  ];

  // ── Reservas: arreglo de objetos con estructura consistente
  let reservas = [
    { id: "r1", nombre: "Ana Martínez", email: "ana@email.com", telefono: "+56 9 8765 4321", servicioId: "s1", fecha: hoy(0), hora: "10:00", notas: "Prefiere corte recto", estado: "confirmada", creadaEn: new Date().toISOString() },
    { id: "r2", nombre: "Carla Vega", email: "carla@email.com", telefono: "+56 9 1234 5678", servicioId: "s3", fecha: hoy(0), hora: "11:30", notas: "", estado: "pendiente", creadaEn: new Date().toISOString() },
    { id: "r3", nombre: "Sofía Reyes", email: "sofia@email.com", telefono: "", servicioId: "s5", fecha: hoy(1), hora: "14:00", notas: "Alérgica a aceite de nuez", estado: "pendiente", creadaEn: new Date().toISOString() },
    { id: "r4", nombre: "Valentina Ríos", email: "vale@email.com", telefono: "+56 9 5555 0000", servicioId: "s2", fecha: hoy(-2), hora: "09:00", notas: "", estado: "completada", creadaEn: new Date().toISOString() },
  ];

  // ── Usuarios (demo)
  const USUARIOS = [
    { email: "admin@lumiere.cl", password: "Admin123!", nombre: "Administrador", rol: "admin" },
    { email: "recep@lumiere.cl", password: "Recep123!", nombre: "Recepción", rol: "recepcion" },
  ];

  /** Genera fecha relativa a hoy en formato YYYY-MM-DD */
  function hoy(diasOffset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + diasOffset);
    return d.toISOString().split("T")[0];
  }

  /** Genera ID único */
  const generarId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // ── API del Store ──────────────────────────────────────────

  const getServicios = () => [...SERVICIOS];
  const getServicio = (id) => SERVICIOS.find((s) => s.id === id) || null;

  const getReservas = () => [...reservas];

  const agregarReserva = (datos) => {
    const nueva = { id: generarId("r"), ...datos, creadaEn: new Date().toISOString(), estado: "pendiente" };
    reservas.unshift(nueva);
    return nueva;
  };

  const actualizarEstado = (id, nuevoEstado) => {
    const r = reservas.find((r) => r.id === id);
    if (r) r.estado = nuevoEstado;
    return !!r;
  };

  const eliminarReserva = (id) => {
    const prev = reservas.length;
    reservas = reservas.filter((r) => r.id !== id);
    return reservas.length < prev;
  };

  const buscarReservas = (query, filtroStatus, filtroServicio) => {
    const q = query.toLowerCase().trim();
    return reservas.filter((r) => {
      const matchQuery =
        !q ||
        r.nombre.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.fecha.includes(q);
      const matchStatus = !filtroStatus || r.estado === filtroStatus;
      const matchServicio = !filtroServicio || r.servicioId === filtroServicio;
      return matchQuery && matchStatus && matchServicio;
    });
  };

  const getClientes = () => {
    // Agrupa reservas por email → lista de clientes únicos
    const map = {};
    reservas.forEach((r) => {
      if (!map[r.email]) {
        map[r.email] = { nombre: r.nombre, email: r.email, telefono: r.telefono, total: 0 };
      }
      map[r.email].total++;
    });
    return Object.values(map);
  };

  const autenticar = (email, password) =>
    USUARIOS.find((u) => u.email === email.trim().toLowerCase() && u.password === password) || null;

  return { getServicios, getServicio, getReservas, agregarReserva, actualizarEstado, eliminarReserva, buscarReservas, getClientes, autenticar, generarId };
})();

/* ══════════════════════════════════════════
   MÓDULO 3 — DOM: Manipulación dinámica y eventos
   Modificación eficiente del DOM. Sin innerHTML con datos de usuario.
   Eventos centralizados con delegación.
══════════════════════════════════════════ */
const DOM = (() => {
  /** Referencia a elementos del DOM (caché para eficiencia) */
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /** Limpia todos los hijos de un elemento de forma eficiente */
  const limpiar = (el) => {
    while (el.firstChild) el.removeChild(el.firstChild);
  };

  /** Muestra/oculta error en campo */
  const setError = (grupoId, msg) => {
    const grupo = $(`#${grupoId}`);
    const errEl = $(`#err-${grupoId.replace("fg-", "")}`);
    if (!grupo || !errEl) return;
    if (msg) {
      grupo.classList.add("error");
      errEl.textContent = msg;
    } else {
      grupo.classList.remove("error");
      errEl.textContent = "";
    }
  };

  /** Toast de notificación */
  const toast = (msg, tipo = "default", duracion = 3000) => {
    const el = $("#toast");
    el.textContent = msg;
    el.className = `toast ${tipo}`;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), duracion);
  };

  /** Modal genérico: recibe función constructora del contenido */
  const abrirModal = (buildFn) => {
    const body = $("#modal-body");
    limpiar(body);
    buildFn(body);
    $("#modal-overlay").classList.remove("hidden");
  };

  const cerrarModal = () => $("#modal-overlay").classList.add("hidden");

  return { $, $$, limpiar, setError, toast, abrirModal, cerrarModal };
})();

/* ══════════════════════════════════════════
   MÓDULO 4 — UI: Renderizado de vistas
   Funciones pequeñas, reutilizables, con nombres semánticos.
══════════════════════════════════════════ */
const UI = (() => {
  /** Formatea precio en CLP */
  const formatPrecio = (n) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

  /** Formatea fecha legible */
  const formatFecha = (iso) => {
    const [y, m, d] = iso.split("-");
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${d} ${meses[+m - 1]} ${y}`;
  };

  /** Rellena selects de servicios de forma reutilizable */
  const poblarSelectServicios = (...selectIds) => {
    const servicios = Store.getServicios();
    selectIds.forEach((id) => {
      const sel = DOM.$(`#${id}`);
      if (!sel) return;
      // Conserva la opción placeholder
      const placeholder = sel.options[0];
      DOM.limpiar(sel);
      sel.appendChild(placeholder);
      servicios.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.nombre} — ${formatPrecio(s.precio)}`;
        sel.appendChild(opt);
      });
    });
  };

  /** Rellena select de horas disponibles */
  const poblarSelectHoras = () => {
    const sel = DOM.$("#r-hora");
    const placeholder = sel.options[0];
    DOM.limpiar(sel);
    sel.appendChild(placeholder);
    for (let h = 9; h <= 19; h++) {
      ["00", "30"].forEach((min) => {
        if (h === 19 && min === "30") return;
        const opt = document.createElement("option");
        opt.value = `${String(h).padStart(2, "0")}:${min}`;
        opt.textContent = `${String(h).padStart(2, "0")}:${min}`;
        sel.appendChild(opt);
      });
    }
  };

  /** Renderiza tabla de reservas (DOM puro, sin innerHTML) */
  const renderizarTablaReservas = (lista) => {
    const tbody = DOM.$("#tbody-reservas");
    const empty = DOM.$("#empty-reservas");
    DOM.limpiar(tbody);

    if (lista.length === 0) {
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");

    lista.forEach((r, i) => {
      const servicio = Store.getServicio(r.servicioId);
      const tr = document.createElement("tr");
      tr.dataset.id = r.id;

      // # — número de fila
      const tdNum = document.createElement("td");
      tdNum.textContent = i + 1;

      // Cliente
      const tdCliente = document.createElement("td");
      const strong = document.createElement("strong");
      strong.textContent = r.nombre;
      const small = document.createElement("small");
      small.style.display = "block";
      small.style.color = "#8a7a6e";
      small.textContent = r.email;
      tdCliente.appendChild(strong);
      tdCliente.appendChild(small);

      // Servicio
      const tdServicio = document.createElement("td");
      tdServicio.textContent = servicio ? servicio.nombre : "—";

      // Fecha
      const tdFecha = document.createElement("td");
      tdFecha.textContent = formatFecha(r.fecha);

      // Hora
      const tdHora = document.createElement("td");
      tdHora.textContent = r.hora;

      // Estado (badge)
      const tdEstado = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `badge badge-${r.estado}`;
      badge.textContent = r.estado;
      tdEstado.appendChild(badge);

      // Acciones
      const tdAcciones = document.createElement("td");
      tdAcciones.style.whiteSpace = "nowrap";

      const crearBtn = (cls, texto, accion) => {
        const btn = document.createElement("button");
        btn.className = `btn-action ${cls}`;
        btn.textContent = texto;
        btn.dataset.accion = accion;
        btn.dataset.id = r.id;
        return btn;
      };

      tdAcciones.appendChild(crearBtn("btn-edit", "Ver", "ver"));
      if (r.estado === "pendiente") tdAcciones.appendChild(crearBtn("btn-conf", "Confirmar", "confirmar"));
      if (r.estado === "confirmada") tdAcciones.appendChild(crearBtn("btn-comp", "Completar", "completar"));
      if (r.estado !== "cancelada" && r.estado !== "completada")
        tdAcciones.appendChild(crearBtn("btn-del", "Cancelar", "cancelar"));
      tdAcciones.appendChild(crearBtn("btn-del", "Eliminar", "eliminar"));

      tr.append(tdNum, tdCliente, tdServicio, tdFecha, tdHora, tdEstado, tdAcciones);
      tbody.appendChild(tr);
    });
  };

  /** Renderiza servicios como tarjetas */
  const renderizarServicios = () => {
    const grid = DOM.$("#services-grid");
    DOM.limpiar(grid);
    Store.getServicios().forEach((s) => {
      const card = document.createElement("div");
      card.className = "service-card";

      const emoji = Security.safeElement("span", s.emoji, { class: "service-emoji" });
      const nombre = Security.safeElement("h3", s.nombre, { class: "service-name" });
      const desc = Security.safeElement("p", s.desc, { class: "service-desc" });
      const precio = Security.safeElement("span", formatPrecio(s.precio), { class: "service-price" });
      const dur = Security.safeElement("span", `  ${s.duracion} min`, { class: "service-duration" });

      card.append(emoji, nombre, desc, precio, dur);
      grid.appendChild(card);
    });
  };

  /** Renderiza tabla de clientes */
  const renderizarClientes = () => {
    const tbody = DOM.$("#tbody-clientes");
    const empty = DOM.$("#empty-clientes");
    const clientes = Store.getClientes();
    DOM.limpiar(tbody);

    if (clientes.length === 0) { empty.classList.remove("hidden"); return; }
    empty.classList.add("hidden");

    clientes.forEach((c) => {
      const tr = document.createElement("tr");

      const nombre = document.createElement("td");
      nombre.textContent = c.nombre;

      const email = document.createElement("td");
      const a = document.createElement("a");
      a.href = `mailto:${Security.sanitize(c.email)}`;
      a.textContent = c.email;
      a.style.color = "var(--rose)";
      email.appendChild(a);

      const tel = document.createElement("td");
      tel.textContent = c.telefono || "—";

      const total = document.createElement("td");
      const pill = Security.safeElement("span", c.total, { class: "badge badge-confirmada" });
      total.appendChild(pill);

      tr.append(nombre, email, tel, total);
      tbody.appendChild(tr);
    });
  };

  /** Actualiza estadísticas del dashboard */
  const actualizarStats = () => {
    const hoy = new Date().toISOString().split("T")[0];
    const reservas = Store.getReservas();
    DOM.$("#stat-total").textContent = reservas.length;
    DOM.$("#stat-hoy").textContent = reservas.filter((r) => r.fecha === hoy).length;
    DOM.$("#stat-pendientes").textContent = reservas.filter((r) => r.estado === "pendiente").length;
    DOM.$("#stat-completadas").textContent = reservas.filter((r) => r.estado === "completada").length;
  };

  /** Modal detalle de reserva */
  const modalDetalleReserva = (r) => {
    const servicio = Store.getServicio(r.servicioId);
    DOM.abrirModal((body) => {
      const titulo = Security.safeElement("h3", `Reserva — ${r.nombre}`);
      body.appendChild(titulo);

      const detalles = [
        ["Cliente", r.nombre],
        ["Email", r.email],
        ["Teléfono", r.telefono || "No registrado"],
        ["Servicio", servicio ? `${servicio.nombre} (${formatPrecio(servicio.precio)})` : "—"],
        ["Fecha", formatFecha(r.fecha)],
        ["Hora", r.hora],
        ["Estado", r.estado],
        ["Notas", r.notas || "Sin notas"],
      ];

      detalles.forEach(([label, valor]) => {
        const p = document.createElement("p");
        p.className = "modal-detail";
        const strong = document.createElement("strong");
        strong.textContent = label + ": ";
        p.appendChild(strong);
        p.appendChild(document.createTextNode(valor));
        body.appendChild(p);
      });
    });
  };

  return { poblarSelectServicios, poblarSelectHoras, renderizarTablaReservas, renderizarServicios, renderizarClientes, actualizarStats, modalDetalleReserva };
})();

/* ══════════════════════════════════════════
   MÓDULO 5 — APP: Controlador principal & eventos
   Inicialización, routing de vistas, manejo de formularios.
══════════════════════════════════════════ */
const App = (() => {
  let usuarioActual = null;

  // ── Navegación entre vistas
  const cambiarVista = (vista) => {
    const titulos = {
      reservas: ["Reservas", "Gestiona todas las citas del salón"],
      nueva: ["Nueva Reserva", "Agrega una cita al sistema"],
      servicios: ["Servicios", "Catálogo de tratamientos disponibles"],
      clientes: ["Clientes", "Base de clientes registrados"],
    };

    // Actualiza nav
    DOM.$$(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === vista);
    });

    // Actualiza views
    DOM.$$(".view").forEach((v) => v.classList.remove("active"));
    const viewEl = DOM.$(`#view-${vista}`);
    if (viewEl) viewEl.classList.add("active");

    // Actualiza header
    const [titulo, subtitulo] = titulos[vista] || ["", ""];
    DOM.$("#view-title").textContent = titulo;
    DOM.$("#view-subtitle").textContent = subtitulo;

    // Renderiza según vista
    if (vista === "reservas") {
      UI.actualizarStats();
      refrescarTablaReservas();
    } else if (vista === "servicios") {
      UI.renderizarServicios();
    } else if (vista === "clientes") {
      UI.renderizarClientes();
    }
  };

  const refrescarTablaReservas = () => {
    const q = DOM.$("#global-search").value;
    const status = DOM.$("#filter-status").value;
    const servicio = DOM.$("#filter-servicio").value;
    const lista = Store.buscarReservas(q, status, servicio);
    UI.renderizarTablaReservas(lista);
  };

  // ── LOGIN ─────────────────────────────────────────────────

  const initLogin = () => {
    const form = DOM.$("#login-form");

    // Toggle visibilidad contraseña
    DOM.$("#toggle-pass").addEventListener("click", () => {
      const inp = DOM.$("#login-password");
      const esPassword = inp.type === "password";
      inp.type = esPassword ? "text" : "password";
      DOM.$("#toggle-pass").textContent = esPassword ? "🙈" : "👁";
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let valido = true;

      const email = DOM.$("#login-email").value;
      const pass = DOM.$("#login-password").value;

      // Validación JS+HTML5 (rúbrica punto 1)
      DOM.setError("fg-email", "");
      DOM.setError("fg-password", "");
      DOM.$("#err-general").textContent = "";

      if (!Security.Validators.required(email)) {
        DOM.setError("fg-email", "El correo es obligatorio.");
        valido = false;
      } else if (!Security.Validators.email(email)) {
        DOM.setError("fg-email", "Ingresa un correo válido.");
        valido = false;
      }

      if (!Security.Validators.required(pass)) {
        DOM.setError("fg-password", "La contraseña es obligatoria.");
        valido = false;
      } else if (pass.length < 6) {
        DOM.setError("fg-password", "Mínimo 6 caracteres.");
        valido = false;
      }

      if (!valido) return;

      // Simula loading (microinteracción)
      const btnText = DOM.$(".btn-text");
      const btnLoader = DOM.$(".btn-loader");
      btnText.classList.add("hidden");
      btnLoader.classList.remove("hidden");
      DOM.$("#btn-login").disabled = true;

      setTimeout(() => {
        const usuario = Store.autenticar(email, pass);
        btnText.classList.remove("hidden");
        btnLoader.classList.add("hidden");
        DOM.$("#btn-login").disabled = false;

        if (!usuario) {
          DOM.$("#err-general").textContent = "Credenciales incorrectas. Verifica e intenta nuevamente.";
          return;
        }

        usuarioActual = usuario;
        iniciarDashboard();
      }, 800);
    });
  };

  // ── DASHBOARD ─────────────────────────────────────────────

  const iniciarDashboard = () => {
    // Transición de pantallas
    DOM.$("#screen-login").classList.remove("active");
    DOM.$("#screen-dashboard").classList.add("active");

    // Info de usuario
    const inicial = usuarioActual.nombre.charAt(0).toUpperCase();
    DOM.$("#user-avatar").textContent = inicial;
    DOM.$("#user-name-display").textContent = usuarioActual.nombre;

    // Poblar selects (reutilizable)
    UI.poblarSelectServicios("r-servicio", "filter-servicio");
    UI.poblarSelectHoras();

    // Fecha mínima hoy
    DOM.$("#r-fecha").min = new Date().toISOString().split("T")[0];

    // Vista inicial
    cambiarVista("reservas");

    // Eventos de navegación (delegación)
    DOM.$$(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => cambiarVista(btn.dataset.view));
    });

    // Logout
    DOM.$("#btn-logout").addEventListener("click", () => {
      usuarioActual = null;
      DOM.$("#screen-dashboard").classList.remove("active");
      DOM.$("#screen-login").classList.add("active");
      DOM.$("#login-email").value = "";
      DOM.$("#login-password").value = "";
      DOM.toast("Sesión cerrada. ¡Hasta pronto!", "default");
    });

    // Búsqueda global (filtra en tiempo real)
    DOM.$("#global-search").addEventListener("input", refrescarTablaReservas);
    DOM.$("#filter-status").addEventListener("change", refrescarTablaReservas);
    DOM.$("#filter-servicio").addEventListener("change", refrescarTablaReservas);

    // Modal cerrar
    DOM.$("#modal-close").addEventListener("click", DOM.cerrarModal);
    DOM.$("#modal-overlay").addEventListener("click", (e) => {
      if (e.target === DOM.$("#modal-overlay")) DOM.cerrarModal();
    });

    initFormReserva();
    initTablaAcciones();
  };

  // ── FORMULARIO NUEVA RESERVA ──────────────────────────────

  const initFormReserva = () => {
    const form = DOM.$("#form-reserva");

    // Contador de caracteres en textarea
    DOM.$("#r-notas").addEventListener("input", (e) => {
      DOM.$("#char-notas").textContent = `${e.target.value.length}/300`;
    });

    form.addEventListener("reset", () => {
      // Limpia errores al resetear
      ["fg-nombre","fg-r-email","fg-telefono","fg-servicio","fg-fecha","fg-hora","fg-notas"].forEach((id) => {
        DOM.setError(id, "");
      });
      DOM.$("#char-notas").textContent = "0/300";
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validarFormReserva()) return;

      // Sanitización antes de guardar (prevención XSS)
      const datos = {
        nombre:    Security.sanitize(DOM.$("#r-nombre").value),
        email:     Security.sanitize(DOM.$("#r-email").value),
        telefono:  Security.sanitize(DOM.$("#r-telefono").value),
        servicioId: DOM.$("#r-servicio").value,
        fecha:     DOM.$("#r-fecha").value,
        hora:      DOM.$("#r-hora").value,
        notas:     Security.sanitize(DOM.$("#r-notas").value),
      };

      Store.agregarReserva(datos);
      form.reset();
      DOM.toast("✓ Reserva creada exitosamente", "success");
      cambiarVista("reservas");
    });
  };

  /** Validaciones completas del formulario de reserva (JS + semántica) */
  const validarFormReserva = () => {
    let valido = true;

    const campos = [
      { id: "fg-nombre",    val: DOM.$("#r-nombre").value,    tests: [
        [Security.Validators.required, "El nombre es obligatorio."],
        [(v) => Security.Validators.minLength(v, 3), "Mínimo 3 caracteres."],
        [Security.Validators.noScript, "Contenido no permitido."],
      ]},
      { id: "fg-r-email",  val: DOM.$("#r-email").value,     tests: [
        [Security.Validators.required, "El correo es obligatorio."],
        [Security.Validators.email, "Ingresa un correo válido."],
      ]},
      { id: "fg-telefono", val: DOM.$("#r-telefono").value,  tests: [
        [Security.Validators.phone, "Formato de teléfono inválido."],
        [Security.Validators.noScript, "Contenido no permitido."],
      ]},
      { id: "fg-servicio", val: DOM.$("#r-servicio").value,  tests: [
        [Security.Validators.required, "Selecciona un servicio."],
      ]},
      { id: "fg-fecha",    val: DOM.$("#r-fecha").value,     tests: [
        [Security.Validators.required, "La fecha es obligatoria."],
        [Security.Validators.futureDate, "La fecha debe ser hoy o futura."],
      ]},
      { id: "fg-hora",     val: DOM.$("#r-hora").value,      tests: [
        [Security.Validators.required, "Selecciona una hora."],
      ]},
    ];

    campos.forEach(({ id, val, tests }) => {
      let error = "";
      for (const [fn, msg] of tests) {
        if (!fn(val)) { error = msg; break; }
      }
      DOM.setError(id, error);
      if (error) valido = false;
    });

    return valido;
  };

  // ── ACCIONES EN TABLA (delegación de eventos) ─────────────

  const initTablaAcciones = () => {
    DOM.$("#tbody-reservas").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-accion]");
      if (!btn) return;

      const { accion, id } = btn.dataset;

      if (accion === "ver") {
        const r = Store.getReservas().find((r) => r.id === id);
        if (r) UI.modalDetalleReserva(r);
        return;
      }

      if (accion === "confirmar") {
        Store.actualizarEstado(id, "confirmada");
        DOM.toast("Reserva confirmada ✓", "success");
        refrescarTablaReservas();
        UI.actualizarStats();
        return;
      }

      if (accion === "completar") {
        Store.actualizarEstado(id, "completada");
        DOM.toast("Reserva marcada como completada ✓", "success");
        refrescarTablaReservas();
        UI.actualizarStats();
        return;
      }

      if (accion === "cancelar") {
        confirmarAccion("¿Cancelar esta reserva?", "Sí, cancelar", () => {
          Store.actualizarEstado(id, "cancelada");
          DOM.toast("Reserva cancelada.", "default");
          refrescarTablaReservas();
          UI.actualizarStats();
        });
        return;
      }

      if (accion === "eliminar") {
        confirmarAccion("¿Eliminar esta reserva permanentemente?", "Sí, eliminar", () => {
          Store.eliminarReserva(id);
          DOM.toast("Reserva eliminada.", "error");
          refrescarTablaReservas();
          UI.actualizarStats();
        });
        return;
      }
    });
  };

  /** Modal de confirmación reutilizable */
  const confirmarAccion = (mensaje, labelConfirm, onConfirm) => {
    DOM.abrirModal((body) => {
      const titulo = Security.safeElement("h3", "Confirmar acción");
      const msg = Security.safeElement("p", mensaje, { style: "margin-bottom:20px;color:var(--mid);" });

      const acciones = document.createElement("div");
      acciones.className = "modal-actions";

      const btnCancelar = Security.safeElement("button", "No, volver", { class: "btn-secondary" });
      btnCancelar.style.padding = "10px 20px";
      btnCancelar.addEventListener("click", DOM.cerrarModal);

      const btnConfirmar = Security.safeElement("button", labelConfirm, { class: "btn-primary" });
      btnConfirmar.style.cssText = "width:auto;padding:10px 20px;";
      btnConfirmar.addEventListener("click", () => {
        DOM.cerrarModal();
        onConfirm();
      });

      acciones.append(btnCancelar, btnConfirmar);
      body.append(titulo, msg, acciones);
    });
  };

  // ── INIT ──────────────────────────────────────────────────

  const init = () => {
    initLogin();
  };

  return { init };
})();

/* ══════════════════════════════════════════
   INICIO DE LA APLICACIÓN
══════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", App.init);
