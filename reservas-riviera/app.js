let experiencias = [];
let reservas = [];
let textoBusqueda = "";
let categoriaActual = "todas";
let precioMaximo = "todos";
let ordenActual = "normal";

// Referencias al DOM
const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const selectorPrecio = document.querySelector("#precioMaximo");
const ordenPrecio = document.querySelector("#ordenPrecio");
const estado = document.querySelector("#estado");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const totalPersonas = document.querySelector("#totalPersonas");
const contadorExperiencias = document.querySelector("#contadorExperiencias");
const contadorReservas = document.querySelector("#contadorReservas");
const mensajeReserva = document.querySelector("#mensajeReserva");
const botonVaciar = document.querySelector("#vaciarReservacion");

const formatoMoneda = cantidad =>
    cantidad.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function mostrarMensaje(mensaje, esError = false) {
    mensajeReserva.textContent = mensaje;
    mensajeReserva.classList.toggle("error", esError);
}

async function cargarExperiencias() {
    try {
        estado.textContent = "Cargando experiencias...";
        const respuesta = await fetch("./data/experiencias.json");

        if (!respuesta.ok) {
            throw new Error("No fue posible cargar el archivo JSON.");
        }

        experiencias = await respuesta.json();
        contadorExperiencias.textContent = experiencias.length;
        actualizarCatalogo();
    } catch (error) {
        estado.textContent = "No se pudieron cargar las experiencias. Inicia el proyecto con Live Server y revisa la ruta del JSON.";
        console.error(error);
    }
}

function obtenerResultados() {

    let resultados = [...experiencias];

    if (categoriaActual !== "todas") {
        resultados = resultados.filter(experiencia => experiencia.categoria === categoriaActual);
    }

    if (textoBusqueda !== "") {
        resultados = resultados.filter(experiencia =>
            experiencia.nombre.toLowerCase().includes(textoBusqueda)
        );
    }

    if (precioMaximo !== "todos") {
        resultados = resultados.filter(experiencia => experiencia.precio <= Number(precioMaximo));
    }

    if (ordenActual === "ascendente") {
        resultados.sort((a, b) => a.precio - b.precio);
    } else if (ordenActual === "descendente") {
        resultados.sort((a, b) => b.precio - a.precio);
    }

    return resultados;
}

function actualizarCatalogo() {
    const resultados = obtenerResultados();

    if (resultados.length === 0) {
        catalogo.innerHTML = '<p class="sin-resultados">No se encontraron experiencias con esos criterios. Prueba otros filtros.</p>';
        estado.textContent = "0 resultados";
        return;
    }

    catalogo.innerHTML = resultados.map(experiencia => {
        const reserva = reservas.find(item => item.experienciaId === experiencia.id);
        const personasReservadas = reserva ? reserva.cantidad : 0;
        const maximoDisponible = experiencia.cupo - personasReservadas;

        return `
        <article class="tarjeta">
        <div class="imagen" aria-hidden="true">${experiencia.icono}</div>
        <div class="informacion">
            <span class="categoria">${nombreCategoria(experiencia.categoria)}</span>
            <h3>${experiencia.nombre}</h3>
            <p class="cupo">Cupo disponible: ${maximoDisponible}</p>
            <p class="precio">${formatoMoneda(experiencia.precio)} <small>por persona</small></p>
            <label class="campo-personas" for="cantidad-${experiencia.id}">
            Personas
            <input type="number" id="cantidad-${experiencia.id}" min="1" max="${maximoDisponible}" value="1" ${maximoDisponible === 0 ? "disabled" : ""}>
            </label>
            <button class="btn-principal btn-reservar" data-id="${experiencia.id}" type="button" ${maximoDisponible === 0 ? "disabled" : ""}>
            ${maximoDisponible === 0 ? "Cupo completo" : "Agregar a mi reservación"}
            </button>
        </div>
        </article>
    `;
    }).join("");

    estado.textContent = `${resultados.length} de ${experiencias.length} experiencias mostradas`;
    agregarEventosReservar();
}

function nombreCategoria(categoria) {
    const nombres = {
        naturaleza: "Naturaleza",
        cultura: "Cultura",
        aventura: "Aventura",
        gastronomia: "Gastronomía",
        mar: "Mar y arrecife"
    };
    return nombres[categoria] || categoria;
}

function agregarEventosReservar() {
    document.querySelectorAll(".btn-reservar").forEach(boton => {
        boton.addEventListener("click", () => agregarReserva(Number(boton.dataset.id)));
    });
}

function agregarReserva(id) {
    const experiencia = experiencias.find(item => item.id === id);
    if (!experiencia) return;

    const entradaCantidad = document.querySelector(`#cantidad-${id}`);
    const cantidad = Number(entradaCantidad.value);
    const reservaExistente = reservas.find(item => item.experienciaId === id);
    const cantidadActual = reservaExistente ? reservaExistente.cantidad : 0;

    if (!Number.isInteger(cantidad) || cantidad < 1) {
        mostrarMensaje("Escribe una cantidad válida de personas.", true);
        return;
    }

    if (cantidadActual + cantidad > experiencia.cupo) {
        mostrarMensaje(`No hay cupo suficiente. El máximo para esta experiencia es ${experiencia.cupo} personas.`, true);
        return;
    }

    if (reservaExistente) {
        reservaExistente.cantidad += cantidad;
        reservaExistente.subtotal = reservaExistente.cantidad * experiencia.precio;
    } else {
        reservas.push({
            experienciaId: experiencia.id,
            nombre: experiencia.nombre,
            precio: experiencia.precio,
            cantidad,
            subtotal: experiencia.precio * cantidad
        });
    }

    mostrarMensaje(`${experiencia.nombre} se agregó a tu reservación.`);
    mostrarReservas();
    actualizarCatalogo();
}

function cambiarCantidad(id, cambio) {
    const reserva = reservas.find(item => item.experienciaId === id);
    const experiencia = experiencias.find(item => item.id === id);
    if (!reserva || !experiencia) return;

    const nuevaCantidad = reserva.cantidad + cambio;

    if (nuevaCantidad < 1) {
        mostrarMensaje("La cantidad mínima es una persona. Usa Eliminar para quitar la actividad.", true);
        return;
    }

    if (nuevaCantidad > experiencia.cupo) {
        mostrarMensaje(`El cupo máximo para ${experiencia.nombre} es ${experiencia.cupo} personas.`, true);
        return;
    }

    reserva.cantidad = nuevaCantidad;
    reserva.subtotal = nuevaCantidad * reserva.precio;
    mostrarMensaje(`Cantidad actualizada para ${reserva.nombre}.`);
    mostrarReservas();
    actualizarCatalogo();
}

function mostrarReservas() {
    if (reservas.length === 0) {
        listaReservas.innerHTML = '<p class="vacio">Todavía no has seleccionado experiencias.</p>';
        total.textContent = formatoMoneda(0);
        totalPersonas.textContent = "0";
        contadorReservas.textContent = "0 actividades";
        botonVaciar.disabled = true;
        return;
    }

    listaReservas.innerHTML = reservas.map(reserva => {
        const experiencia = experiencias.find(item => item.id === reserva.experienciaId);
        const cupo = experiencia ? experiencia.cupo : reserva.cantidad;

        return `
        <article class="item-reserva">
        <div>
            <h3>${reserva.nombre}</h3>
            <p>${formatoMoneda(reserva.precio)} por persona</p>
            <p>Subtotal: ${formatoMoneda(reserva.subtotal)}</p>
        </div>
        <div>
            <div class="controles-cantidad" aria-label="Cambiar cantidad para ${reserva.nombre}">
            <button class="btn-cantidad btn-disminuir" data-id="${reserva.experienciaId}" type="button" aria-label="Disminuir personas">−</button>
            <strong>${reserva.cantidad} persona(s)</strong>
            <button class="btn-cantidad btn-aumentar" data-id="${reserva.experienciaId}" type="button" aria-label="Aumentar personas" ${reserva.cantidad >= cupo ? "disabled" : ""}>+</button>
            </div>
            <p class="subtotal">${formatoMoneda(reserva.subtotal)}</p>
            <button class="btn-eliminar" data-id="${reserva.experienciaId}" type="button">Eliminar</button>
        </div>
        </article>
    `;
    }).join("");

    const importeTotal = reservas.reduce((suma, reserva) => suma + reserva.subtotal, 0);
    const personas = reservas.reduce((suma, reserva) => suma + reserva.cantidad, 0);

    total.textContent = formatoMoneda(importeTotal);
    totalPersonas.textContent = personas;
    contadorReservas.textContent = `${reservas.length} ${reservas.length === 1 ? "actividad" : "actividades"}`;
    botonVaciar.disabled = false;
    agregarEventosReservas();
}

function agregarEventosReservas() {
    document.querySelectorAll(".btn-eliminar").forEach(boton => {
        boton.addEventListener("click", () => eliminarReserva(Number(boton.dataset.id)));
    });

    document.querySelectorAll(".btn-disminuir").forEach(boton => {
        boton.addEventListener("click", () => cambiarCantidad(Number(boton.dataset.id), -1));
    });

    document.querySelectorAll(".btn-aumentar").forEach(boton => {
        boton.addEventListener("click", () => cambiarCantidad(Number(boton.dataset.id), 1));
    });
}

function eliminarReserva(id) {
    const reserva = reservas.find(item => item.experienciaId === id);
    reservas = reservas.filter(item => item.experienciaId !== id);
    mostrarMensaje(reserva ? `${reserva.nombre} se eliminó de tu reservación.` : "La actividad se eliminó.");
    mostrarReservas();
    actualizarCatalogo();
}

function vaciarReservacion() {
    if (reservas.length === 0) return;

    const confirmar = window.confirm("¿Seguro que deseas eliminar todas las experiencias de tu reservación?");
    if (!confirmar) return;

    reservas = [];
    mostrarMensaje("Tu reservación se vació correctamente.");
    mostrarReservas();
    actualizarCatalogo();
}

buscador.addEventListener("input", () => {
    textoBusqueda = buscador.value.trim().toLowerCase();
    actualizarCatalogo();
});

filtroCategoria.addEventListener("change", () => {
    categoriaActual = filtroCategoria.value;
    actualizarCatalogo();
});

selectorPrecio.addEventListener("change", () => {
    precioMaximo = selectorPrecio.value;
    actualizarCatalogo();
});

ordenPrecio.addEventListener("change", () => {
    ordenActual = ordenPrecio.value;
    actualizarCatalogo();
});

botonVaciar.addEventListener("click", vaciarReservacion);

mostrarReservas();
cargarExperiencias();
