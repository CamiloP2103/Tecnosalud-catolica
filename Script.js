// =============================================
// LÓGICA DE LA SPA
// Idea central: NUNCA recargamos la página.
// Solo mostramos/ocultamos secciones que ya
// existen en el DOM desde que se cargó el HTML.
// =============================================


// =============================================
// 1. Referencias a los elementos
// =============================================

const botones = document.querySelectorAll('.nav-btn');
const paginas = document.querySelectorAll('.page');


// =============================================
// 2. Función principal: cambia qué sección está visible
// =============================================

function mostrarPagina(idPagina) {

    // Oculta todas las páginas
    paginas.forEach((pagina) => {
        pagina.classList.add('hidden');
    });

    // Muestra la página correspondiente
    const paginaActiva = document.getElementById(idPagina);

    if (paginaActiva) {
        paginaActiva.classList.remove('hidden');
    }

    // Actualiza el botón activo
    botones.forEach((boton) => {

        boton.classList.remove('active');

        if (boton.dataset.page === idPagina) {
            boton.classList.add('active');
        }

    });
}


// =============================================
// 3. Escuchar clics en cada botón de navegación
// =============================================

botones.forEach((boton) => {

    boton.addEventListener('click', () => {

        const destino = boton.dataset.page;

        mostrarPagina(destino);

    });

});


// =============================================
// EXTRA 1: mostrar la hora en la que cargó Inicio
// =============================================

const horaCarga = document.getElementById('hora-carga');

if (horaCarga) {
    horaCarga.textContent = new Date().toLocaleTimeString();
}


// =============================================
// EXTRA 2: contador de clics en "Acerca de"
// =============================================

let clicsAcerca = 0;

const contadorClics = document.getElementById('contador-clics');
const botonAcerca = document.querySelector('[data-page="acerca"]');

if (botonAcerca && contadorClics) {

    botonAcerca.addEventListener('click', () => {

        clicsAcerca++;

        contadorClics.textContent = clicsAcerca;

    });

}


// =============================================
// EXTRA 3: FORMULARIO DE AFILIADOS
// =============================================

const formularioAfiliados = document.getElementById('form-afiliados');

if (formularioAfiliados) {

    formularioAfiliados.addEventListener('submit', (evento) => {

        // Evita que el navegador recargue la página
        evento.preventDefault();

        // VALIDACIÓN DE CAPTCHA (Primer widget en el DOM = índice 0)
        const captchaAfiliados = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse(0) : '';

        if (captchaAfiliados.length === 0) {
            alert('Por favor, completa el captcha antes de registrarte.');
            return;
        }

        // Obtener los valores del formulario
        const nombre = document.getElementById('nombre').value;
        const correo = document.getElementById('correo').value;
        const telefono = document.getElementById('telefono').value;
        const documento = document.getElementById('documento').value;
        const tipoAfiliado = document.getElementById('tipo-afiliado').value;

        // Mostrar los datos en consola
        console.log('Nuevo afiliado:');
        console.log('Nombre:', nombre);
        console.log('Correo:', correo);
        console.log('Teléfono:', telefono);
        console.log('Documento:', documento);
        console.log('Tipo de afiliado:', tipoAfiliado);

        // Mensaje al usuario
        alert('Registro realizado correctamente. ¡Bienvenido a Technosalud!');

        // Limpiar formulario y reiniciar captcha
        formularioAfiliados.reset();
        grecaptcha.reset(0);

    });

}


// =============================================
// EXTRA 4: FORMULARIO DE ACCESO
// =============================================

const formularioAcceso = document.getElementById('form-acceso');

if (formularioAcceso) {

    formularioAcceso.addEventListener('submit', (evento) => {

        // Evita que el navegador recargue la página
        evento.preventDefault();

        // VALIDACIÓN DE CAPTCHA (Segundo widget en el DOM = índice 1)
        const captchaAcceso = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse(1) : '';

        if (captchaAcceso.length === 0) {
            alert('Por favor, completa el captcha para iniciar sesión.');
            return;
        }

        // Obtener los datos
        const usuario = document.getElementById('usuario').value;
        const contrasena = document.getElementById('contrasena').value;

        // Mostrar información en consola
        console.log('Intento de acceso:');
        console.log('Usuario:', usuario);

        // Validación básica de ejemplo
        if (usuario === '' || contrasena === '') {

            alert('Por favor, completa todos los campos.');

            return;
        }

        // Mensaje de ejemplo
        alert('Inicio de sesión realizado correctamente.');

        // Limpiar formulario y reiniciar captcha
        formularioAcceso.reset();
        grecaptcha.reset(1);

    });

}