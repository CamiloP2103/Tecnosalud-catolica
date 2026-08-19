// =============================================
// LÓGICA DE LA SPA
// Idea central: NUNCA recargamos la página.
// Solo mostramos/ocultamos secciones que ya
// existen en el DOM desde que se cargó el HTML.
// =============================================

// 1. Referencias a los elementos que vamos a manipular
const botones = document.querySelectorAll('.nav-btn');
const paginas = document.querySelectorAll('.page');

// 2. Función principal: cambia qué sección está visible
function mostrarPagina(idPagina) {
  // Oculta todas las páginas...
  paginas.forEach((pagina) => {
    pagina.classList.add('hidden');
  });

  // ...y muestra solo la que corresponde al botón clickeado
  const paginaActiva = document.getElementById(idPagina);
  paginaActiva.classList.remove('hidden');

  // Actualiza cuál botón se ve "activo" (resaltado)
  botones.forEach((boton) => {
    boton.classList.remove('active');
    if (boton.dataset.page === idPagina) {
      boton.classList.add('active');
    }
  });
}

// 3. Escuchar clics en cada botón de navegación
botones.forEach((boton) => {
  boton.addEventListener('click', () => {
    const destino = boton.dataset.page; // lee data-page="inicio" o "acerca"
    mostrarPagina(destino);
  });
});

// =============================================
// EXTRA 1: mostrar la hora en la que cargó Inicio
// (demuestra que el JS corre una sola vez al
// cargar, y no se vuelve a ejecutar al "navegar")
// =============================================
const horaCarga = document.getElementById('hora-carga');
horaCarga.textContent = new Date().toLocaleTimeString();

// =============================================
// EXTRA 2: contador de clics en "Acerca de"
// Punto de partida para que los estudiantes
// extiendan el ejercicio con más interactividad.
// =============================================
let clicsAcerca = 0;
const contadorClics = document.getElementById('contador-clics');
const botonAcerca = docu
