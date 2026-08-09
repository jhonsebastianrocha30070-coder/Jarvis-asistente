// ============================================================
//  PARCH PARA ANDROID (guarda ajustes entre dominios)
// ============================================================
if (typeof AndroidJarvisStorage !== 'undefined') {
    window.guardarValor = function(clave, valor) {
        try {
            AndroidJarvisStorage.setItem(clave, valor);
            return;
        } catch(e) {}
        try {
            if (typeof GM_setValue === 'function') { GM_setValue(clave, valor); return; }
        } catch(e) {}
        try { localStorage.setItem(clave, valor); } catch(e) {}
    };

    window.leerValor = function(clave) {
        try {
            const v = AndroidJarvisStorage.getItem(clave);
            if (v !== null && v !== undefined) return v;
        } catch(e) {}
        try {
            if (typeof GM_getValue === 'function') {
                const v = GM_getValue(clave, null);
                return v === undefined ? null : v;
            }
        } catch(e) {}
        try { return localStorage.getItem(clave); } catch(e) { return null; }
    };

    window.borrarValor = function(clave) {
        try {
            AndroidJarvisStorage.removeItem(clave);
            return;
        } catch(e) {}
        try {
            if (typeof GM_deleteValue === 'function') { GM_deleteValue(clave); return; }
        } catch(e) {}
        try { localStorage.removeItem(clave); } catch(e) {}
    };
}

// ============================================================
//  SCRIPT ORIGINAL DE JARVIS (v7)
//  (con las funciones guardarValor/leerValor/borrarValor eliminadas)
// ============================================================
(function () {
    'use strict';

    if (window.top !== window.self) {
        return;
    }
    if (window.__jarvisInstanciaActiva) {
        console.warn('[Jarvis] Ya hay otra instancia activa en esta página — no se crea una segunda.');
        return;
    }
    window.__jarvisInstanciaActiva = true;

    // ==========================================
    // CONFIGURACIÓN
    // ==========================================
    const CONFIG = {
        palabraActivacion: 'jarvis',
        longitudMinimaOrden: 3,
        motorBusquedaGeneral: 'https://www.google.com/search?q=',
        idioma: 'es-ES',
        reinicioNormalMs: 300,
        hablarRespuestas: true,
        esperaSilencioOrdenMs: 1400,
        esperaMaximaOrdenMs: 12000,
        segundosSaltoPorDefecto: 10,
        toleranciaActivacion: 2,
        ventanaAntiEcoMs: 1600,
        autoApagadoMs: 60000,
        tamanoBoton: 46,
        vozPitch: 1.0,
        vozRate: 1.05
    };

    const webRapidas = {
        youtube: 'https://www.youtube.com',
        google: 'https://www.google.com',
        github: 'https://github.com',
        pleisplus: 'https://www.pleisplus.com',
        peliplus: 'https://www.pleisplus.com',
        wikipedia: 'https://es.wikipedia.org',
        gmail: 'https://mail.google.com',
        whatsapp: 'https://web.whatsapp.com',
        facebook: 'https://www.facebook.com',
        instagram: 'https://www.instagram.com',
        twitter: 'https://x.com',
        x: 'https://x.com',
        netflix: 'https://www.netflix.com',
        spotify: 'https://open.spotify.com',
        amazon: 'https://www.amazon.com',
        twitch: 'https://www.twitch.tv'
    };

    // Las funciones guardarValor, leerValor y borrarValor YA NO ESTÁN AQUÍ
    // (se definieron en el parche de arriba)

    const CLAVE_BUSQUEDA_PENDIENTE = 'jarvisPendienteBusqueda';
    const CLAVE_AJUSTES = 'jarvisAjustes';
    const CLAVE_SESION_ACTIVA = 'jarvisSesionActivaHasta';

    function cargarAjustes() {
        try {
            const guardados = JSON.parse(leerValor(CLAVE_AJUSTES) || 'null');
            if (!guardados) return;
            if (typeof guardados.toleranciaActivacion === 'number') CONFIG.toleranciaActivacion = guardados.toleranciaActivacion;
            if (typeof guardados.autoApagadoMs === 'number') CONFIG.autoApagadoMs = guardados.autoApagadoMs;
            if (typeof guardados.tamanoBoton === 'number') CONFIG.tamanoBoton = guardados.tamanoBoton;
            if (typeof guardados.esperaSilencioOrdenMs === 'number') CONFIG.esperaSilencioOrdenMs = guardados.esperaSilencioOrdenMs;
            if (typeof guardados.vozNombre === 'string') CONFIG.vozNombreGuardada = guardados.vozNombre;
            if (typeof guardados.vozPitch === 'number') CONFIG.vozPitch = guardados.vozPitch;
            if (typeof guardados.vozRate === 'number') CONFIG.vozRate = guardados.vozRate;
        } catch (e) {}
    }

    function guardarAjustes() {
        try {
            guardarValor(CLAVE_AJUSTES, JSON.stringify({
                toleranciaActivacion: CONFIG.toleranciaActivacion,
                autoApagadoMs: CONFIG.autoApagadoMs,
                tamanoBoton: CONFIG.tamanoBoton,
                esperaSilencioOrdenMs: CONFIG.esperaSilencioOrdenMs,
                vozNombre: vozPreferida ? vozPreferida.name : (CONFIG.vozNombreGuardada || ''),
                vozPitch: CONFIG.vozPitch,
                vozRate: CONFIG.vozRate
            }));
        } catch (e) {}
    }

    cargarAjustes();

    const VARIANTES_ACTIVACION = [
        'jarvis', 'yarvis', 'harvis', 'jarves', 'jarvi', 'jharvis',
        'charves', 'arves', 'arbes', 'chavis', 'jamis', 'garves'
    ];

    function distanciaEdicion(a, b) {
        const m = a.length, n = b.length;
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                dp[i][j] = a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
        return dp[m][n];
    }

    function esPalabraDeActivacion(token) {
        const limpio = token.replace(/[^a-záéíóúñ]/gi, '');
        if (!limpio) return false;
        if (VARIANTES_ACTIVACION.includes(limpio)) return true;
        return limpio.length >= 4 && distanciaEdicion(limpio, 'jarvis') <= CONFIG.toleranciaActivacion;
    }

    function extraerTrasActivacion(textoLower) {
        const tokens = textoLower.split(/\s+/).filter(Boolean);
        let ultimoIndice = -1;
        for (let i = 0; i < tokens.length; i++) {
            if (esPalabraDeActivacion(tokens[i])) ultimoIndice = i;
        }
        if (ultimoIndice === -1) return null;
        return tokens.slice(ultimoIndice + 1).join(' ').trim();
    }

    function limpiarActivacionSobrante(texto) {
        const tokens = texto.split(/\s+/).filter(Boolean);
        let inicio = 0;
        while (inicio < tokens.length && esPalabraDeActivacion(tokens[inicio])) {
            inicio++;
        }
        return tokens.slice(inicio).filter((tok) => !esPalabraDeActivacion(tok)).join(' ').trim();
    }

    // ==========================================
    // COMPATIBILIDAD
    // ==========================================
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
        console.warn('[Jarvis] Este navegador no soporta reconocimiento de voz.');
        return;
    }

    let reconocimiento;
    try {
        reconocimiento = new SpeechRecognitionAPI();
    } catch (e) {
        console.error('[Jarvis] No se pudo crear el reconocedor de voz:', e);
        return;
    }
    reconocimiento.lang = CONFIG.idioma;
    reconocimiento.continuous = true;
    reconocimiento.interimResults = true;
    reconocimiento.maxAlternatives = 3;

    let activo = false;
    let detenidoPorError = false;
    let estaCorriendo = false;
    let estaHablando = false;
    let pausadoPorHabla = false;
    let tonoDeInicioPendiente = false;
    let ultimoLatido = Date.now();
    let momentoUltimoInicio = Date.now();

    let modo = 'espera_wake';
    let bufferOrdenFinal = '';
    let bufferOrdenInterino = '';
    let temporizadorSilencio = null;
    let momentoInicioOrden = 0;
    let vetoActivacionHasta = 0;
    let ultimaActividadReal = Date.now();

    function registrarActividad() {
        ultimaActividadReal = Date.now();
        if (activo) {
            try { guardarValor(CLAVE_SESION_ACTIVA, String(Date.now() + CONFIG.autoApagadoMs)); } catch (e) {}
        }
    }
  // ==========================================
// INDICADOR VISUAL (badge flotante)
// ==========================================
let boton, pill, textoIndicador, puntoIndicador;

function inyectarEstilos() {
    let style = document.getElementById('jarvis-styles');
    if (!style) {
        style = document.createElement('style');
        style.id = 'jarvis-styles';
        document.head.appendChild(style);
    }
    style.textContent = `
        @keyframes jarvisPulso {
            0%, 100% { box-shadow: 0 0 0 0 rgba(46,204,113,0.55); }
            50% { box-shadow: 0 0 0 6px rgba(46,204,113,0); }
        }
        @keyframes jarvisAparecer {
            from { opacity: 0; transform: scale(0.75); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes jarvisRespirar {
            0%, 100% { transform: scale(1); opacity: 0.92; }
            50% { transform: scale(1.08); opacity: 1; }
        }
        #jarvis-punto.jarvis-escuchando { animation: jarvisPulso 1.6s ease-out infinite; }
        #jarvis-boton {
            transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.25s ease;
            animation: jarvisAparecer 0.25s ease;
        }
        #jarvis-boton.jarvis-arrastrando {
            transform: scale(1.18);
            box-shadow: 0 8px 22px rgba(0,0,0,0.45);
            transition: transform 0.08s ease, box-shadow 0.08s ease;
        }
        #jarvis-estrella { animation: jarvisRespirar 2.6s ease-in-out infinite; transform-origin: center; }
        #jarvis-pill {
            opacity: 0;
            transform: translateY(8px) scale(0.94);
            pointer-events: none;
            transition: opacity 0.2s ease, transform 0.2s ease;
        }
        #jarvis-pill.jarvis-visible {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        #jarvis-menu-fondo {
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        #jarvis-menu-fondo.jarvis-visible { opacity: 1; }
        #jarvis-menu-panel {
            transform: translateY(18px) scale(0.94);
            opacity: 0;
            transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
        }
        #jarvis-menu-fondo.jarvis-visible #jarvis-menu-panel {
            transform: translateY(0) scale(1);
            opacity: 1;
        }
        @keyframes jarvisFilaAparecer {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        #jarvis-menu-panel > * {
            animation: jarvisFilaAparecer 0.32s ease both;
        }
        #jarvis-menu-panel > *:nth-child(1) { animation-delay: 0.02s; }
        #jarvis-menu-panel > *:nth-child(2) { animation-delay: 0.06s; }
        #jarvis-menu-panel > *:nth-child(3) { animation-delay: 0.10s; }
        #jarvis-menu-panel > *:nth-child(4) { animation-delay: 0.14s; }
        #jarvis-menu-panel > *:nth-child(5) { animation-delay: 0.18s; }
        #jarvis-menu-panel > *:nth-child(6) { animation-delay: 0.22s; }
        #jarvis-menu-panel > *:nth-child(7) { animation-delay: 0.26s; }
        #jarvis-menu-panel > *:nth-child(8) { animation-delay: 0.30s; }
        #jarvis-menu-panel > *:nth-child(9) { animation-delay: 0.34s; }
        .jarvis-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 5px;
            border-radius: 999px;
            background: linear-gradient(90deg, #a685ff, #3a3a3c);
            outline: none;
        }
        .jarvis-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px; height: 18px; border-radius: 50%;
            background: #fff;
            box-shadow: 0 0 0 3px rgba(166,133,255,0.55);
            cursor: pointer;
        }
        .jarvis-preset {
            display: inline-block; padding: 6px 12px; margin: 0 6px 6px 0;
            border-radius: 999px; background: #2c2c2e; color: #fff;
            font-size: 12px; border: 1px solid #444; cursor: pointer;
            transition: background 0.15s ease, transform 0.1s ease;
        }
        .jarvis-preset:active { transform: scale(0.94); background: #3a3a3c; }
    `;
}

function crearInterfaz() {
    inyectarEstilos();

    boton = document.createElement('div');
    boton.id = 'jarvis-boton';
    Object.assign(boton.style, {
        position: 'fixed',
        bottom: '86px',
        right: '20px',
        width: `${CONFIG.tamanoBoton}px`,
        height: `${CONFIG.tamanoBoton}px`,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(178,142,255,0.55) 0%, rgba(60,20,90,0.25) 55%, rgba(0,0,0,0) 75%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '2147483647',
        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
        cursor: 'pointer',
        userSelect: 'none',
        touchAction: 'none'
    });
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svgEstrella = document.createElementNS(SVG_NS, 'svg');
    svgEstrella.id = 'jarvis-estrella';
    svgEstrella.setAttribute('viewBox', '0 0 24 24');
    svgEstrella.style.width = '62%';
    svgEstrella.style.height = '62%';
    svgEstrella.style.filter = 'drop-shadow(0 0 4px rgba(178,142,255,0.9))';
    const pathEstrella = document.createElementNS(SVG_NS, 'path');
    pathEstrella.setAttribute('d', 'M12 0C12 6.6 13 9 14.8 10.8 16.6 12.6 19.4 13.5 24 13.5 19.4 13.5 16.6 14.4 14.8 16.2 13 18 12 20.4 12 27 12 20.4 11 18 9.2 16.2 7.4 14.4 4.6 13.5 0 13.5 4.6 13.5 7.4 12.6 9.2 10.8 11 9 12 6.6 12 0Z');
    pathEstrella.setAttribute('fill', '#fff');
    svgEstrella.appendChild(pathEstrella);
    boton.appendChild(svgEstrella);
    document.body.appendChild(boton);

    pill = document.createElement('div');
    pill.id = 'jarvis-pill';
    Object.assign(pill.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: '999px',
        background: 'rgba(28,28,30,0.9)',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        fontSize: '12px',
        fontWeight: '600',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        maxWidth: '78vw',
        overflow: 'hidden',
        cursor: 'pointer'
    });
    pill.addEventListener('pointerup', conAntiDobleToque((e) => {
        e.stopPropagation();
        if (estaHablando) {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            return;
        }
        if (activo) desactivarJarvis();
    }));

    puntoIndicador = document.createElement('div');
    puntoIndicador.id = 'jarvis-punto';
    Object.assign(puntoIndicador.style, {
        width: '10px',
        height: '10px',
        minWidth: '10px',
        borderRadius: '50%',
        background: '#888',
        transition: 'background 0.25s ease'
    });

    textoIndicador = document.createElement('span');
    textoIndicador.style.overflow = 'hidden';
    textoIndicador.style.textOverflow = 'ellipsis';
    textoIndicador.style.whiteSpace = 'nowrap';

    pill.appendChild(puntoIndicador);
    pill.appendChild(textoIndicador);
    document.body.appendChild(pill);

    habilitarArrastre();
    cargarPosicionGuardada();
}

const CLAVE_POSICION = 'jarvisPosicionBoton';
let arrastrando = false;
let seMovioDeVerdad = false;
let offsetArrastreX = 0;
let offsetArrastreY = 0;

function posicionarBoton(left, top) {
    boton.style.left = `${left}px`;
    boton.style.top = `${top}px`;
    boton.style.right = 'auto';
    boton.style.bottom = 'auto';
}

function cargarPosicionGuardada() {
    try {
        const guardada = JSON.parse(leerValor(CLAVE_POSICION) || 'null');
        if (guardada && typeof guardada.left === 'number' && typeof guardada.top === 'number') {
            posicionarBoton(guardada.left, guardada.top);
        }
    } catch (e) {}
}

function guardarPosicion() {
    const r = boton.getBoundingClientRect();
    try {
        guardarValor(CLAVE_POSICION, JSON.stringify({ left: r.left, top: r.top }));
    } catch (e) {}
}

function habilitarArrastre() {
    let temporizadorPulsacionLarga = null;
    let pulsacionLargaDisparada = false;

    boton.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        arrastrando = true;
        seMovioDeVerdad = false;
        pulsacionLargaDisparada = false;
        boton.classList.add('jarvis-arrastrando');
        const r = boton.getBoundingClientRect();
        offsetArrastreX = e.clientX - r.left;
        offsetArrastreY = e.clientY - r.top;
        try { boton.setPointerCapture(e.pointerId); } catch (err) {}
        temporizadorPulsacionLarga = setTimeout(() => {
            if (!seMovioDeVerdad) {
                pulsacionLargaDisparada = true;
                reproducirTono(950, 90, 'triangle');
                abrirMenuAjustes();
            }
        }, 650);
    });
    boton.addEventListener('pointermove', (e) => {
        if (!arrastrando) return;
        e.preventDefault();
        e.stopPropagation();
        let left = e.clientX - offsetArrastreX;
        let top = e.clientY - offsetArrastreY;
        const rActual = boton.getBoundingClientRect();
        if (Math.abs(left - rActual.left) > 6 || Math.abs(top - rActual.top) > 6) {
            if (!seMovioDeVerdad && temporizadorPulsacionLarga) {
                clearTimeout(temporizadorPulsacionLarga);
                temporizadorPulsacionLarga = null;
            }
            seMovioDeVerdad = true;
        }
        const maxLeft = window.innerWidth - boton.offsetWidth - 4;
        const maxTop = window.innerHeight - boton.offsetHeight - 4;
        left = Math.max(4, Math.min(left, maxLeft));
        top = Math.max(4, Math.min(top, maxTop));
        posicionarBoton(left, top);
    });
    const terminarArrastre = (e) => {
        if (!arrastrando) return;
        e.preventDefault();
        e.stopPropagation();
        arrastrando = false;
        boton.classList.remove('jarvis-arrastrando');
        if (temporizadorPulsacionLarga) {
            clearTimeout(temporizadorPulsacionLarga);
            temporizadorPulsacionLarga = null;
        }
        if (pulsacionLargaDisparada) {
            ultimaAccionUiMs = Date.now();
            return;
        }
        if (seMovioDeVerdad) {
            ultimaAccionUiMs = Date.now();
            guardarPosicion();
        } else {
            manejarToqueIndicadorSeguro();
        }
    };
    boton.addEventListener('pointerup', terminarArrastre);
    boton.addEventListener('pointercancel', terminarArrastre);
}

function abrirMenuAjustes() {
    if (document.getElementById('jarvis-menu-fondo')) return;

    const fondo = document.createElement('div');
    fondo.id = 'jarvis-menu-fondo';
    Object.assign(fondo.style, {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.55)',
        zIndex: '2147483647', display: 'flex', alignItems: 'center',
        justifyContent: 'center'
    });

    const panel = document.createElement('div');
    panel.id = 'jarvis-menu-panel';
    Object.assign(panel.style, {
        background: 'linear-gradient(180deg, #232326 0%, #18181a 100%)',
        color: '#fff', borderRadius: '18px',
        padding: '20px', width: '86vw', maxWidth: '360px',
        maxHeight: '80vh', overflowY: 'auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)'
    });

    function fila(etiqueta, min, max, paso, valor, formatear, alCambiar) {
        const cont = document.createElement('div');
        cont.style.marginBottom = '18px';
        const lbl = document.createElement('div');
        lbl.style.cssText = 'font-size:13px;margin-bottom:8px;display:flex;justify-content:space-between;color:#e5e5e7;';
        const spanTexto = document.createElement('span');
        spanTexto.textContent = etiqueta;
        const spanValor = document.createElement('span');
        spanValor.style.cssText = 'opacity:0.65;font-variant-numeric:tabular-nums;';
        spanValor.textContent = formatear(valor);
        lbl.appendChild(spanTexto);
        lbl.appendChild(spanValor);
        const input = document.createElement('input');
        input.type = 'range';
        input.className = 'jarvis-slider';
        input.min = String(min);
        input.max = String(max);
        input.step = String(paso);
        input.value = String(valor);
        input.addEventListener('input', () => {
            spanValor.textContent = formatear(Number(input.value));
            alCambiar(Number(input.value));
        });
        cont.appendChild(lbl);
        cont.appendChild(input);
        return { cont, input, spanValor };
    }

    const titulo = document.createElement('div');
    titulo.textContent = '✨ Ajustes de Jarvis';
    titulo.style.cssText = 'font-size:17px;font-weight:700;margin-bottom:16px;letter-spacing:0.2px;';
    panel.appendChild(titulo);

    panel.appendChild(fila(
        'Sensibilidad al reconocer "Jarvis"', 1, 3, 1, CONFIG.toleranciaActivacion,
        (v) => (v === 1 ? 'Estricta' : v === 2 ? 'Normal' : 'Alta'),
        (v) => { CONFIG.toleranciaActivacion = v; }
    ).cont);
    panel.appendChild(fila(
        'Tamaño de la burbuja', 32, 72, 2, CONFIG.tamanoBoton,
        (v) => `${v}px`,
        (v) => { CONFIG.tamanoBoton = v; if (boton) { boton.style.width = v + 'px'; boton.style.height = v + 'px'; } }
    ).cont);
    panel.appendChild(fila(
        'Paciencia antes de ejecutar tu orden', 800, 3000, 100, CONFIG.esperaSilencioOrdenMs,
        (v) => `${(v / 1000).toFixed(1)}s`,
        (v) => { CONFIG.esperaSilencioOrdenMs = v; }
    ).cont);
    panel.appendChild(fila(
        'Apagarse tras silencio', 20000, 180000, 10000, CONFIG.autoApagadoMs,
        (v) => `${Math.round(v / 1000)}s`,
        (v) => { CONFIG.autoApagadoMs = v; }
    ).cont);

    const filaTono = fila(
        'Tono de voz', 0.5, 2.0, 0.05, CONFIG.vozPitch,
        (v) => v.toFixed(2),
        (v) => { CONFIG.vozPitch = v; }
    );
    const filaVelocidad = fila(
        'Velocidad de voz', 0.6, 1.8, 0.05, CONFIG.vozRate,
        (v) => `${v.toFixed(2)}x`,
        (v) => { CONFIG.vozRate = v; }
    );
    panel.appendChild(filaTono.cont);
    panel.appendChild(filaVelocidad.cont);

    const presets = document.createElement('div');
    presets.style.marginBottom = '18px';
    [
        ['Grave', 0.7, 0.95],
        ['Normal', 1.0, 1.05],
        ['Aguda', 1.4, 1.05],
        ['Niño', 1.7, 1.15]
    ].forEach(([nombre, pitch, rate]) => {
        const btn = document.createElement('span');
        btn.className = 'jarvis-preset';
        btn.textContent = nombre;
        btn.addEventListener('pointerup', (e) => {
            e.stopPropagation();
            CONFIG.vozPitch = pitch;
            CONFIG.vozRate = rate;
            filaTono.input.value = String(pitch);
            filaTono.spanValor.textContent = pitch.toFixed(2);
            filaVelocidad.input.value = String(rate);
            filaVelocidad.spanValor.textContent = `${rate.toFixed(2)}x`;
            hablar('Así sueno ahora');
        });
        presets.appendChild(btn);
    });
    panel.appendChild(presets);

    const contVoz = document.createElement('div');
    contVoz.style.marginBottom = '18px';
    const lblVoz = document.createElement('div');
    lblVoz.textContent = 'Voz del sistema';
    lblVoz.style.cssText = 'font-size:13px;margin-bottom:8px;color:#e5e5e7;';
    const selectVoz = document.createElement('select');
    selectVoz.style.cssText = 'width:100%;padding:10px;border-radius:10px;background:#2c2c2e;color:#fff;border:1px solid #444;font-size:13px;';
    const voces = ('speechSynthesis' in window) ? window.speechSynthesis.getVoices() : [];
    const vocesEspanol = voces.filter((v) => v.lang && v.lang.toLowerCase().startsWith('es'));
    const listaVoces = vocesEspanol.length ? vocesEspanol : voces;
    listaVoces.forEach((v) => {
        const op = document.createElement('option');
        op.value = v.name;
        op.textContent = `${v.name} (${v.lang})`;
        if (vozPreferida && vozPreferida.name === v.name) op.selected = true;
        selectVoz.appendChild(op);
    });
    selectVoz.addEventListener('change', () => {
        const elegida = listaVoces.find((v) => v.name === selectVoz.value);
        if (elegida) {
            vozPreferida = elegida;
            hablar('Así sueno ahora');
        }
    });
    contVoz.appendChild(lblVoz);
    contVoz.appendChild(selectVoz);
    panel.appendChild(contVoz);

    const botonCerrar = document.createElement('button');
    botonCerrar.textContent = 'Listo';
    botonCerrar.style.cssText = 'width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#a685ff,#6c5ce7);color:#fff;font-weight:700;font-size:14px;';
    panel.appendChild(botonCerrar);

    fondo.appendChild(panel);
    document.body.appendChild(fondo);
    requestAnimationFrame(() => fondo.classList.add('jarvis-visible'));

    let cerrando = false;
    function cerrarMenu() {
        if (cerrando) return;
        cerrando = true;
        guardarAjustes();
        fondo.classList.remove('jarvis-visible');
        setTimeout(() => fondo.remove(), 200);
    }
    botonCerrar.addEventListener('pointerup', (e) => { e.stopPropagation(); cerrarMenu(); });
    fondo.addEventListener('pointerdown', (e) => {
        if (e.target === fondo) cerrarMenu();
    });
}

function actualizarIndicador(estado, texto) {
    const colores = {
        inactivo: '#888',
        iniciando: '#f1c40f',
        escuchando: '#2ecc71',
        ejecutando: '#3498db',
        error: '#e74c3c'
    };
    const brillos = {
        inactivo: 'rgba(150,150,150,0.5)',
        iniciando: 'rgba(241,196,15,0.6)',
        escuchando: 'rgba(46,204,113,0.6)',
        ejecutando: 'rgba(52,152,219,0.6)',
        error: 'rgba(231,76,60,0.65)'
    };
    if (boton) {
        boton.style.background = `radial-gradient(circle, ${brillos[estado] || brillos.inactivo} 0%, rgba(60,20,90,0.2) 55%, rgba(0,0,0,0) 75%)`;
        boton.style.display = estado === 'inactivo' ? 'flex' : 'none';
    }
    if (puntoIndicador) {
        puntoIndicador.style.background = colores[estado] || '#888';
        puntoIndicador.classList.toggle('jarvis-escuchando', estado === 'escuchando' || estado === 'ejecutando');
    }
    if (textoIndicador) textoIndicador.innerText = texto;
    if (pill) pill.classList.toggle('jarvis-visible', estado !== 'inactivo');
}

// ==========================================
// TONOS AUDIBLES
// ==========================================
let audioCtx = null;
function asegurarAudioCtx() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            return;
        }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
}
function reproducirTono(frecuencia, duracionMs, tipoOnda) {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = tipoOnda || 'sine';
        osc.frequency.value = frecuencia;
        gain.gain.setValueAtTime(0.16, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duracionMs / 1000);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duracionMs / 1000);
    } catch (e) {}
}

// ==========================================
// RESPUESTA HABLADA (texto a voz)
// ==========================================
let vozPreferida = null;
function elegirVoz() {
    if (!('speechSynthesis' in window)) return;
    const voces = window.speechSynthesis.getVoices();
    if (!voces.length) return;
    if (CONFIG.vozNombreGuardada) {
        const guardada = voces.find((v) => v.name === CONFIG.vozNombreGuardada);
        if (guardada) { vozPreferida = guardada; return; }
    }
    vozPreferida =
        voces.find((v) => /Google/i.test(v.name) && /es/i.test(v.lang)) ||
        voces.find((v) => v.lang === CONFIG.idioma) ||
        voces.find((v) => v.lang && v.lang.toLowerCase().startsWith('es')) ||
        null;
}
if ('speechSynthesis' in window) {
    elegirVoz();
    window.speechSynthesis.onvoiceschanged = elegirVoz;
}

let ultimaRespuestaHablada = '';

function hablar(texto) {
    ultimaRespuestaHablada = texto;
    if (!CONFIG.hablarRespuestas) return;
    if (!('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(texto);
        utter.lang = CONFIG.idioma;
        utter.rate = CONFIG.vozRate || 1.05;
        utter.pitch = CONFIG.vozPitch || 1.0;
        if (vozPreferida) utter.voice = vozPreferida;
        utter.onstart = () => {
            estaHablando = true;
            if (estaCorriendo) {
                pausadoPorHabla = true;
                try { reconocimiento.stop(); } catch (e) {}
            }
        };
        const reanudarTrasHablar = () => {
            estaHablando = false;
            if (pausadoPorHabla) {
                pausadoPorHabla = false;
                if (activo) setTimeout(() => iniciarReconocimiento(), 200);
            }
        };
        utter.onend = reanudarTrasHablar;
        utter.onerror = reanudarTrasHablar;
        window.speechSynthesis.speak(utter);
    } catch (e) {}
}
  // ==========================================
// ACTIVACIÓN / CICLO DE VIDA DEL RECONOCEDOR
// ==========================================
function iniciarReconocimiento() {
    if (estaCorriendo) return;
    try {
        reconocimiento.start();
    } catch (e) {
        console.log('[Jarvis] start() omitido:', e.message);
    }
}

function reiniciarEstadoOrden() {
    modo = 'espera_wake';
    bufferOrdenFinal = '';
    bufferOrdenInterino = '';
    if (temporizadorSilencio) {
        clearTimeout(temporizadorSilencio);
        temporizadorSilencio = null;
    }
}

function desactivarJarvis() {
    if (!activo) return;
    activo = false;
    detenidoPorError = false;
    reiniciarEstadoOrden();
    try { reconocimiento.abort(); } catch (e) {}
    estaCorriendo = false;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    try { borrarValor(CLAVE_SESION_ACTIVA); } catch (e) {}
    actualizarIndicador('inactivo', 'Toca para activar Jarvis');
}

function activarJarvis() {
    if (activo) return;
    detenidoPorError = false;
    activo = true;
    reiniciarEstadoOrden();
    ultimoLatido = Date.now();
    momentoUltimoInicio = Date.now();
    tonoDeInicioPendiente = true;
    asegurarAudioCtx();
    registrarActividad();
    actualizarIndicador('iniciando', 'Iniciando…');
    try {
        reconocimiento.start();
    } catch (e) {
        console.error('[Jarvis] Error al iniciar el micrófono:', e);
        activo = false;
        actualizarIndicador('error', 'No se pudo iniciar — toca para reintentar');
    }
}

let ultimaAccionUiMs = 0;
function conAntiDobleToque(fn) {
    return (...args) => {
        const ahora = Date.now();
        if (ahora - ultimaAccionUiMs < 350) return;
        ultimaAccionUiMs = ahora;
        fn(...args);
    };
}

document.addEventListener('click', (e) => {
    if (Date.now() - ultimaAccionUiMs < 400) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
}, true);

function manejarToqueIndicador() {
    if (activo) {
        desactivarJarvis();
        reproducirTono(440, 140, 'triangle');
        return;
    }
    activarJarvis();
}
const manejarToqueIndicadorSeguro = conAntiDobleToque(manejarToqueIndicador);

reconocimiento.onstart = function () {
    ultimoLatido = Date.now();
    momentoUltimoInicio = Date.now();
    estaCorriendo = true;
    if (tonoDeInicioPendiente) {
        reproducirTono(880, 120);
        tonoDeInicioPendiente = false;
    }
    actualizarIndicador('escuchando', 'Escuchando… di "Jarvis" + tu orden');
};

reconocimiento.onaudiostart = function () {
    ultimoLatido = Date.now();
};
reconocimiento.onspeechstart = function () {
    ultimoLatido = Date.now();
    if (!estaHablando && modo === 'espera_wake') {
        actualizarIndicador('escuchando', 'Detecté que hablas…');
    }
};
reconocimiento.onnomatch = function () {
    actualizarIndicador('escuchando', 'Te oí, pero no logré reconocer las palabras');
};

reconocimiento.onerror = function (event) {
    console.warn('[Jarvis] Error de reconocimiento:', event.error);
    estaCorriendo = false;
    const erroresFatales = {
        'not-allowed': 'Permiso de micrófono denegado — toca para reintentar',
        'service-not-allowed': 'El servicio de voz no está permitido — toca para reintentar',
        'audio-capture': 'No se detectó micrófono — toca para reintentar'
    };
    if (erroresFatales[event.error]) {
        activo = false;
        detenidoPorError = true;
        tonoDeInicioPendiente = true;
        reproducirTono(220, 300, 'sawtooth');
        actualizarIndicador('error', erroresFatales[event.error]);
        return;
    }
};

reconocimiento.onend = function () {
    estaCorriendo = false;
    if (modo === 'espera_orden') {
        finalizarCapturaOrden();
    }
    if (!activo || detenidoPorError) return;
    if (pausadoPorHabla) return;
    setTimeout(() => {
        if (!activo) return;
        iniciarReconocimiento();
    }, CONFIG.reinicioNormalMs);
};

// ==========================================
// CAPTURA DE LA ORDEN POR SILENCIO
// ==========================================
function reiniciarTemporizadorSilencio() {
    if (temporizadorSilencio) clearTimeout(temporizadorSilencio);
    temporizadorSilencio = setTimeout(finalizarCapturaOrden, CONFIG.esperaSilencioOrdenMs);
}

function finalizarCapturaOrden() {
    if (modo !== 'espera_orden') {
        if (temporizadorSilencio) { clearTimeout(temporizadorSilencio); temporizadorSilencio = null; }
        return;
    }

    let orden = (bufferOrdenFinal + ' ' + bufferOrdenInterino)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    orden = limpiarActivacionSobrante(orden);

    const esSoloVerboSuelto = orden && new RegExp(`^(${VERBOS_NAVEGAR}|${VERBOS_BUSCAR})$`).test(orden);
    const dentroDePlazo = Date.now() - momentoInicioOrden < CONFIG.esperaMaximaOrdenMs;
    if (esSoloVerboSuelto && dentroDePlazo && activo && !detenidoPorError) {
        reiniciarTemporizadorSilencio();
        return;
    }

    if (temporizadorSilencio) { clearTimeout(temporizadorSilencio); temporizadorSilencio = null; }
    modo = 'espera_wake';
    bufferOrdenFinal = '';
    bufferOrdenInterino = '';

    if (!activo || detenidoPorError) return;

    if (orden.length < CONFIG.longitudMinimaOrden) {
        reproducirTono(320, 150, 'triangle');
        actualizarIndicador('escuchando', 'Te oí, pero no capté ninguna orden — di "Jarvis" de nuevo');
        return;
    }

    reproducirTono(1200, 90);
    actualizarIndicador('ejecutando', `Ejecutando: "${orden}"`);
    procesarComando(orden);
    vetoActivacionHasta = Date.now() + CONFIG.ventanaAntiEcoMs;
    registrarActividad();

    setTimeout(() => {
        if (activo && !detenidoPorError && modo === 'espera_wake') {
            actualizarIndicador('escuchando', 'Escuchando… di "Jarvis" + tu orden');
        }
    }, 2000);
}

reconocimiento.onresult = function (event) {
    ultimoLatido = Date.now();
    if (estaHablando) return;

    for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultado = event.results[i];
        const esFinal = resultado.isFinal;

        let texto = resultado[0].transcript;
        if (modo === 'espera_wake') {
            for (let j = 0; j < resultado.length; j++) {
                const alt = (resultado[j].transcript || '').toLowerCase();
                if (alt.split(/\s+/).some(esPalabraDeActivacion)) {
                    texto = resultado[j].transcript;
                    break;
                }
            }
        }

        if (modo === 'espera_wake') {
            const textoLower = texto.toLowerCase();
            const restante = extraerTrasActivacion(textoLower);
            if (restante !== null && Date.now() < vetoActivacionHasta) {
                // ignorar
            } else if (restante !== null) {
                modo = 'espera_orden';
                momentoInicioOrden = Date.now();
                bufferOrdenFinal = esFinal ? restante : '';
                bufferOrdenInterino = esFinal ? '' : restante;
                reproducirTono(700, 90, 'sine');
                registrarActividad();
                actualizarIndicador(
                    'ejecutando',
                    restante ? `Te oigo: "${restante}"` : 'Te escucho, dime la orden…'
                );
                reiniciarTemporizadorSilencio();
            } else if (texto.trim()) {
                actualizarIndicador('escuchando', `Oí: "${texto.trim()}" (sin "jarvis")`);
            }
        } else {
            if (esFinal) {
                bufferOrdenFinal = (bufferOrdenFinal + ' ' + texto).trim();
                bufferOrdenInterino = '';
            } else {
                bufferOrdenInterino = texto;
            }
            const vista = (bufferOrdenFinal + ' ' + bufferOrdenInterino).trim();
            actualizarIndicador('ejecutando', `Te oigo: "${vista}"`);
            reiniciarTemporizadorSilencio();

            if (Date.now() - momentoInicioOrden > CONFIG.esperaMaximaOrdenMs) {
                finalizarCapturaOrden();
            }
        }
    }
};

// Vigía anti-cuelgue
const VENTANA_SIN_ACTIVIDAD_MS = 15000;
const VENTANA_GRACIA_INICIO_MS = 6000;
setInterval(() => {
    if (!activo || detenidoPorError) return;
    if (Date.now() - momentoUltimoInicio < VENTANA_GRACIA_INICIO_MS) return;
    if (Date.now() - ultimoLatido > VENTANA_SIN_ACTIVIDAD_MS) {
        console.log('[Jarvis] Sin actividad del motor durante 15s, reiniciando…');
        ultimoLatido = Date.now();
        try {
            reconocimiento.stop();
        } catch (e) {}
    }

    const restanteMs = CONFIG.autoApagadoMs - (Date.now() - ultimaActividadReal);
    if (restanteMs <= 0) {
        hablar('Me apago por falta de actividad');
        desactivarJarvis();
        return;
    }
    if (restanteMs <= 10000 && modo === 'espera_wake') {
        actualizarIndicador('escuchando', `Sin actividad — me apago en ${Math.ceil(restanteMs / 1000)}s`);
    } else {
        registrarActividad();
    }
}, 4000);

function intentarReanudarSesion() {
    try {
        const hasta = parseInt(leerValor(CLAVE_SESION_ACTIVA) || '0', 10);
        if (hasta && Date.now() < hasta) {
            activarJarvis();
        }
    } catch (e) {}
}

// ==========================================
// AYUDANTES: VIDEO PRINCIPAL Y CLIC POR TEXTO
// ==========================================
function obtenerVideoPrincipal() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (!videos.length) return null;
    let mejor = null;
    let mejorArea = 0;
    for (const v of videos) {
        const r = v.getBoundingClientRect();
        const area = Math.max(0, r.width) * Math.max(0, r.height);
        if (area > mejorArea) {
            mejorArea = area;
            mejor = v;
        }
    }
    return mejor || videos[0];
}

function buscarPrimerElemento(selectores) {
    for (const sel of selectores) {
        try {
            const el = buscarProfundo(document, sel);
            if (el) return el;
        } catch (e) {}
    }
    return null;
}

function buscarElementoPorTexto(texto) {
    const buscado = texto.toLowerCase().trim();
    if (!buscado) return null;
    const candidatos = document.querySelectorAll(
        'a, button, [role="button"], [role="link"], ytd-video-renderer, ytd-compact-video-renderer, ytd-rich-item-renderer'
    );
    for (const el of candidatos) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const contenido = (el.innerText || el.getAttribute('aria-label') || el.title || '').toLowerCase();
        if (contenido.includes(buscado)) return el;
    }
    return null;
}

// ==========================================
// COMANDOS (tabla de reglas)
// ==========================================
const VERBOS_NAVEGAR = 'abre|ve a|entra a|entra en|entra|inicia|accede a|métete a|metete a|anda a|dirígete a|dirigete a|vamos a';
const VERBOS_BUSCAR = 'busca|buscar|busque|búscame|buscame|encuentra|encuéntrame|encuentrame';

const reglasComando = [
    {
        nombre: 'navegar-y-buscar',
        test: (orden) => new RegExp(`\\s+y\\s+(?:${VERBOS_BUSCAR})\\b`).test(orden),
        ejecutar: (orden) => {
            const partes = orden.split(new RegExp(`\\s+y\\s+(?:${VERBOS_BUSCAR})\\b\\s*`));
            const parteDestino = (partes[0] || '').trim();
            const terminoBusqueda = (partes[1] || '').trim();
            if (!parteDestino || !terminoBusqueda) {
                actualizarIndicador('escuchando', 'Entendí "entrar y buscar", pero no distinguí bien el sitio o qué buscar');
                hablar('No distinguí el sitio o qué buscar');
                return;
            }
            const destinoLimpio = parteDestino.replace(new RegExp(`^(${VERBOS_NAVEGAR})\\s+`), '').trim();
            guardarValor(CLAVE_BUSQUEDA_PENDIENTE, terminoBusqueda);
            hablar(`Entrando a ${destinoLimpio}`);
            setTimeout(() => navegarAWeb(destinoLimpio), 150);
        }
    },
    {
        nombre: 'navegar',
        test: (orden) => new RegExp(`^(${VERBOS_NAVEGAR})\\s+`).test(orden),
        ejecutar: (orden) => {
            const destino = orden.replace(new RegExp(`^(${VERBOS_NAVEGAR})\\s+`), '').trim();
            hablar(`Abriendo ${destino}`);
            setTimeout(() => navegarAWeb(destino), 150);
        }
    },
    {
        nombre: 'buscar',
        test: (orden) => new RegExp(`^(busca en la web|${VERBOS_BUSCAR})\\s+`).test(orden),
        ejecutar: (orden) => {
            const busqueda = orden
                .replace(/^busca en la web\s+/, '')
                .replace(new RegExp(`^(${VERBOS_BUSCAR})\\s+`), '')
                .trim();
            if (!busqueda) return;
            const claveSitio = busqueda.toLowerCase();
            const primeraPalabraSitio = claveSitio.split(/\s+/)[0];
            if (webRapidas[claveSitio] || webRapidas[primeraPalabraSitio]) {
                hablar(`Abriendo ${busqueda}`);
                setTimeout(() => navegarAWeb(busqueda), 150);
                return;
            }
            hablar(`Buscando ${busqueda}`);
            setTimeout(() => {
                window.location.href = CONFIG.motorBusquedaGeneral + encodeURIComponent(busqueda);
            }, 150);
        }
    },

    // CONTROL DE VIDEO
    {
        nombre: 'pausar-video',
        test: (orden) => /^(pausa|pausar|detén el video|deten el video|para el video)\b/.test(orden.trim()),
        ejecutar: () => {
            const v = obtenerVideoPrincipal();
            if (v) { v.pause(); hablar('Pausado'); } else { hablar('No encontré ningún video'); }
        }
    },
    {
        nombre: 'reproducir-video',
        test: (orden) => /^(reproduce|reproducir|play|continúa el video|continua el video|dale play)\b/.test(orden.trim()),
        ejecutar: () => {
            const v = obtenerVideoPrincipal();
            if (v) { v.play().catch(() => {}); hablar('Reproduciendo'); } else { hablar('No encontré ningún video'); }
        }
    },
    {
        nombre: 'adelantar-video',
        test: (orden) => /^(adelanta|avanza|salta)(\s+\d+\s*(segundos|seg)?)?$/.test(orden.trim()),
        ejecutar: (orden) => {
            const v = obtenerVideoPrincipal();
            if (!v) { hablar('No encontré ningún video'); return; }
            const m = orden.match(/\d+/);
            const segundos = m ? parseInt(m[0], 10) : CONFIG.segundosSaltoPorDefecto;
            v.currentTime = Math.min(v.duration || Infinity, v.currentTime + segundos);
            hablar(`Adelanté ${segundos} segundos`);
        }
    },
    {
        nombre: 'atrasar-video',
        test: (orden) => /^(atrasa|retrocede|regresa el video)(\s+\d+\s*(segundos|seg)?)?$/.test(orden.trim()),
        ejecutar: (orden) => {
            const v = obtenerVideoPrincipal();
            if (!v) { hablar('No encontré ningún video'); return; }
            const m = orden.match(/\d+/);
            const segundos = m ? parseInt(m[0], 10) : CONFIG.segundosSaltoPorDefecto;
            v.currentTime = Math.max(0, v.currentTime - segundos);
            hablar(`Retrocedí ${segundos} segundos`);
        }
    },
    {
        nombre: 'siguiente-video',
        test: (orden) => /^(siguiente video|pasa de video|salta de video|siguiente)\b/.test(orden.trim()),
        ejecutar: () => {
            const boton = buscarPrimerElemento([
                '.ytp-next-button',
                'button[aria-label*="Siguiente" i]',
                'button[aria-label*="Next" i]',
                '[data-uia="control-next"]'
            ]);
            if (boton) { boton.click(); hablar('Siguiente video'); return; }
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'N', shiftKey: true, bubbles: true }));
            hablar('Intenté pasar de video');
        }
    },
    {
        nombre: 'anterior-video',
        test: (orden) => /^(video anterior|anterior video|regresa al video anterior)\b/.test(orden.trim()),
        ejecutar: () => {
            const boton = buscarPrimerElemento([
                '.ytp-prev-button',
                'button[aria-label*="Anterior" i]',
                'button[aria-label*="Previous" i]',
                '[data-uia="control-back"]'
            ]);
            if (boton) { boton.click(); hablar('Video anterior'); return; }
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'P', shiftKey: true, bubbles: true }));
            hablar('Intenté ir al video anterior');
        }
    },
    {
        nombre: 'silenciar-video',
        test: (orden) => /^(silencia|silenciar|quita el sonido|mutea)\b/.test(orden.trim()),
        ejecutar: () => {
            const v = obtenerVideoPrincipal();
            if (v) { v.muted = true; hablar('Silenciado'); } else { hablar('No encontré ningún video'); }
        }
    },
    {
        nombre: 'activar-sonido-video',
        test: (orden) => /^(quita el silencio|activa el sonido|desmutea|dale sonido)\b/.test(orden.trim()),
        ejecutar: () => {
            const v = obtenerVideoPrincipal();
            if (v) { v.muted = false; hablar('Sonido activado'); } else { hablar('No encontré ningún video'); }
        }
    },
    {
        nombre: 'volumen-video',
        test: (orden) => /^(sube el volumen|baja el volumen)(\s+\d+)?$/.test(orden.trim()),
        ejecutar: (orden) => {
            const v = obtenerVideoPrincipal();
            if (!v) { hablar('No encontré ningún video'); return; }
            const subir = /^sube/.test(orden.trim());
            const m = orden.match(/\d+/);
            const delta = (m ? parseInt(m[0], 10) : 10) / 100;
            v.volume = Math.max(0, Math.min(1, v.volume + (subir ? delta : -delta)));
            hablar(subir ? 'Subí el volumen' : 'Bajé el volumen');
        }
    },
    {
        nombre: 'velocidad-video',
        test: (orden) => /^(más rápido|mas rapido|más lento|mas lento|velocidad normal)\b/.test(orden.trim()),
        ejecutar: (orden) => {
            const v = obtenerVideoPrincipal();
            if (!v) { hablar('No encontré ningún video'); return; }
            const t = orden.trim();
            if (/normal/.test(t)) v.playbackRate = 1;
            else if (/rápido|rapido/.test(t)) v.playbackRate = Math.min(4, +(v.playbackRate + 0.25).toFixed(2));
            else v.playbackRate = Math.max(0.25, +(v.playbackRate - 0.25).toFixed(2));
            hablar(`Velocidad ${v.playbackRate}`);
        }
    },
    {
        nombre: 'pantalla-completa',
        test: (orden) => /^(pantalla completa|pon pantalla completa)\b/.test(orden.trim()),
        ejecutar: () => {
            const v = obtenerVideoPrincipal();
            if (v && v.requestFullscreen) v.requestFullscreen().catch(() => {});
        }
    },
    {
        nombre: 'salir-pantalla-completa',
        test: (orden) => /^(sal de pantalla completa|salir de pantalla completa|quita pantalla completa)\b/.test(orden.trim()),
        ejecutar: () => {
            if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        }
    },
    {
        nombre: 'inicio-video',
        test: (orden) => /^(ve al inicio del video|reinicia el video|desde el inicio)\b/.test(orden.trim()),
        ejecutar: () => {
            const v = obtenerVideoPrincipal();
            if (v) { v.currentTime = 0; hablar('Listo'); } else { hablar('No encontré ningún video'); }
        }
    },

    // CLIC POR TEXTO
    {
        nombre: 'clic-en-texto',
        test: (orden) => /^(haz clic en|dale clic a|clic en|selecciona|abre el video|pon el video|reproduce el video)\s+/.test(orden),
        ejecutar: (orden) => {
            const texto = orden.replace(/^(haz clic en|dale clic a|clic en|selecciona|abre el video|pon el video|reproduce el video)\s+/, '').trim();
            if (!texto) return;
            const objetivo = buscarElementoPorTexto(texto);
            if (objetivo) {
                objetivo.scrollIntoView({ block: 'center' });
                objetivo.click();
                hablar('Hecho');
            } else {
                hablar('No encontré nada con ese nombre en la página');
            }
        }
    },
    {
        nombre: 'dar-like',
        test: (orden) => /^(dale like al video|dale like|dale me gusta al video|dale me gusta|ponle like|ponle me gusta|dale un like)\b/.test(orden.trim()),
        ejecutar: () => {
            let botonLike = buscarPrimerElemento([
                'like-button-view-model button',
                '#segmented-like-button button',
                'ytd-toggle-button-renderer#like-button button',
                'button[aria-label*="me gusta" i]:not([aria-label*="no me gusta" i])',
                'button[aria-label*="like" i]:not([aria-label*="dislike" i])'
            ]);
            if (!botonLike) {
                const candidatos = document.querySelectorAll('button, [role="button"]');
                for (const el of candidatos) {
                    const etiqueta = (el.getAttribute('aria-label') || el.innerText || '').toLowerCase();
                    if ((etiqueta.includes('me gusta') || etiqueta.includes('like')) && !etiqueta.includes('no me gusta') && !etiqueta.includes('dislike')) {
                        botonLike = el;
                        break;
                    }
                }
            }
            if (botonLike) {
                botonLike.click();
                hablar('Like dado');
            } else {
                hablar('No encontré el botón de me gusta en esta página');
            }
        }
    },

    // NAVEGADOR
    {
        nombre: 'atras',
        test: (orden) => /^(regresa|atrás|atras|vuelve atrás|vuelve atras|página anterior|pagina anterior)\b/.test(orden.trim()),
        ejecutar: () => { hablar('Volviendo'); setTimeout(() => history.back(), 150); }
    },
    {
        nombre: 'adelante-historial',
        test: (orden) => /^(avanza|adelante|página siguiente|pagina siguiente)\b/.test(orden.trim()),
        ejecutar: () => { hablar('Avanzando'); setTimeout(() => history.forward(), 150); }
    },
    {
        nombre: 'recargar',
        test: (orden) => /^(recarga|actualiza la página|actualiza la pagina|refresca)\b/.test(orden.trim()),
        ejecutar: () => { hablar('Recargando'); setTimeout(() => location.reload(), 150); }
    },
    {
        nombre: 'inicio-sitio',
        test: (orden) => /^(ve al inicio del sitio|página de inicio|pagina de inicio|inicio del sitio)\b/.test(orden.trim()),
        ejecutar: () => { hablar('Yendo al inicio'); setTimeout(() => { window.location.href = window.location.origin; }, 150); }
    },
    {
        nombre: 'nueva-pestana',
        test: (orden) => /^(abre una pestaña nueva|abre otra pestaña|nueva pestaña|abre otra ventana)\b/.test(orden.trim()),
        ejecutar: () => {
            const nueva = window.open('about:blank', '_blank');
            hablar(nueva ? 'Pestaña abierta' : 'El navegador bloqueó la pestaña nueva');
        }
    },
    {
        nombre: 'cerrar-pestana',
        test: (orden) => /^(cierra esta pestaña|cierra la pestaña|cierra esta ventana)\b/.test(orden.trim()),
        ejecutar: () => {
            hablar('Cerrando');
            setTimeout(() => {
                window.close();
                setTimeout(() => hablar('El navegador no me deja cerrar esta pestaña'), 500);
            }, 150);
        }
    },
    {
        nombre: 'desplazar',
        test: (orden) => /^(baja|sube|desplázate hacia abajo|desplazate hacia abajo|desplázate hacia arriba|desplazate hacia arriba)\b/.test(orden.trim()),
        ejecutar: (orden) => {
            const bajar = /^(baja|desplázate hacia abajo|desplazate hacia abajo)/.test(orden.trim());
            window.scrollBy({ top: bajar ? 500 : -500, behavior: 'smooth' });
        }
    },

    // CONTROL DE LA VOZ DE JARVIS
    {
        nombre: 'modo-silencioso',
        test: (orden) => /^(no hables|deja de hablar|silencio de voz|cállate|callate)\b/.test(orden.trim()),
        ejecutar: () => {
            CONFIG.hablarRespuestas = false;
            actualizarIndicador('escuchando', 'Dejé de hablar en voz alta');
        }
    },
    {
        nombre: 'reactivar-voz',
        test: (orden) => /^(vuelve a hablar|habla de nuevo|activa la voz)\b/.test(orden.trim()),
        ejecutar: () => { CONFIG.hablarRespuestas = true; hablar('Ya hablo de nuevo'); }
    },

    // MECÁNICAS EXTRA
    {
        nombre: 'copiar-enlace',
        test: (orden) => /^(copia el enlace|copia la url|copia el link)\b/.test(orden.trim()),
        ejecutar: () => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(window.location.href)
                    .then(() => hablar('Enlace copiado'))
                    .catch(() => hablar('No pude copiar el enlace'));
            } else {
                hablar('Este navegador no me deja copiar');
            }
        }
    },
    {
        nombre: 'zoom-pagina',
        test: (orden) => /^(acerca|aleja|zoom normal|quita el zoom)\b/.test(orden.trim()),
        ejecutar: (orden) => {
            const t = orden.trim();
            const actual = parseFloat(document.body.style.zoom || '1');
            if (/normal|quita/.test(t)) document.body.style.zoom = '1';
            else if (/^acerca$/.test(t)) document.body.style.zoom = String(Math.min(3, actual + 0.2));
            else document.body.style.zoom = String(Math.max(0.5, actual - 0.2));
        }
    },
    {
        nombre: 'pantalla-completa-pagina',
        test: (orden) => /^(pantalla completa de la página|pantalla completa de la pagina|pantalla completa del sitio)\b/.test(orden.trim()),
        ejecutar: () => {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        }
    },
    {
        nombre: 'silenciar-todo',
        test: (orden) => /^(silencia todo|mutea todo|quita todo el sonido)\b/.test(orden.trim()),
        ejecutar: () => {
            document.querySelectorAll('video, audio').forEach((el) => { el.muted = true; });
            hablar('Todo silenciado');
        }
    },
    {
        nombre: 'modo-oscuro',
        test: (orden) => /^(modo oscuro|modo claro|quita el modo oscuro)\b/.test(orden.trim()),
        ejecutar: (orden) => {
            const activar = /^modo oscuro$/.test(orden.trim());
            document.documentElement.style.filter = activar ? 'invert(1) hue-rotate(180deg)' : '';
            hablar(activar ? 'Modo oscuro activado' : 'Modo oscuro desactivado');
        }
    },
    {
        nombre: 'decir-hora',
        test: (orden) => /^(qué hora es|que hora es|dime la hora)\b/.test(orden.trim()),
        ejecutar: () => {
            const ahora = new Date();
            const minutos = ahora.getMinutes().toString().padStart(2, '0');
            hablar(`Son las ${ahora.getHours()} y ${minutos}`);
        }
    },
    {
        nombre: 'decir-fecha',
        test: (orden) => /^(qué día es hoy|que dia es hoy|qué fecha es|que fecha es|qué día es|que dia es)\b/.test(orden.trim()),
        ejecutar: () => {
            const texto = new Date().toLocaleDateString(CONFIG.idioma, {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });
            hablar(`Hoy es ${texto}`);
        }
    },
    {
        nombre: 'decir-clima',
        test: (orden) => /^(qué temperatura hace|que temperatura hace|cómo está el clima|como esta el clima|qué clima hace|que clima hace|cómo está el tiempo|como esta el tiempo)\b/.test(orden.trim()),
        ejecutar: () => {
            if (!navigator.geolocation) {
                hablar('Este navegador no me deja ver tu ubicación para el clima');
                return;
            }
            hablar('Viendo el clima');
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const { latitude, longitude } = pos.coords;
                        const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                        const datos = await resp.json();
                        const t = datos && datos.current_weather ? Math.round(datos.current_weather.temperature) : null;
                        if (t === null) { hablar('No pude leer el clima ahora'); return; }
                        hablar(`Ahora mismo hace ${t} grados`);
                    } catch (e) {
                        hablar('No pude consultar el clima');
                    }
                },
                () => hablar('No me diste permiso de ubicación para ver el clima'),
                { timeout: 8000 }
            );
        }
    },
    {
        nombre: 'sensibilidad-voz',
        test: (orden) => /^(sube la sensibilidad|baja la sensibilidad|más sensible|mas sensible|menos sensible)\b/.test(orden.trim()),
        ejecutar: (orden) => {
            const subir = /sube|más sensible|mas sensible/.test(orden.trim());
            CONFIG.toleranciaActivacion = Math.max(1, Math.min(3, CONFIG.toleranciaActivacion + (subir ? 1 : -1)));
            guardarAjustes();
            hablar(subir ? 'Más sensible' : 'Menos sensible');
        }
    },
    {
        nombre: 'tamano-burbuja-voz',
        test: (orden) => /^(agranda la burbuja|agranda el botón|agranda el boton|reduce la burbuja|achica la burbuja|reduce el botón|reduce el boton)\b/.test(orden.trim()),
        ejecutar: (orden) => {
            const agrandar = /agranda/.test(orden.trim());
            CONFIG.tamanoBoton = Math.max(32, Math.min(72, CONFIG.tamanoBoton + (agrandar ? 8 : -8)));
            if (boton) { boton.style.width = CONFIG.tamanoBoton + 'px'; boton.style.height = CONFIG.tamanoBoton + 'px'; }
            guardarAjustes();
            hablar(agrandar ? 'Burbuja más grande' : 'Burbuja más chica');
        }
    },
    {
        nombre: 'repetir',
        test: (orden) => /^(repite|repite eso|qué dijiste|que dijiste)\b/.test(orden.trim()),
        ejecutar: () => {
            hablar(ultimaRespuestaHablada || 'Todavía no he dicho nada');
        }
    },
    {
        nombre: 'reiniciar-microfono',
        test: (orden) => /^(reinicia el micrófono|reinicia el microfono|reconéctate|reconectate|reinicia jarvis)\b/.test(orden.trim()),
        ejecutar: () => {
            hablar('Reiniciando micrófono');
            reiniciarEstadoOrden();
            try { reconocimiento.abort(); } catch (e) {}
            setTimeout(() => { if (activo) iniciarReconocimiento(); }, 200);
        }
    },
    {
        nombre: 'modo-velocidad-orden',
        test: (orden) => /^(modo lento|modo rápido|modo rapido|habla más lento|habla mas lento)\b/.test(orden.trim()),
        ejecutar: (orden) => {
            const lento = /lento/.test(orden.trim());
            CONFIG.esperaSilencioOrdenMs = lento ? 2400 : 1000;
            hablar(lento ? 'Voy a esperar más antes de ejecutar' : 'Voy a responder más rápido');
        }
    },
    {
        nombre: 'detener',
        test: (orden) => /^(detente|deten|apágate|apagate|silencio|para|ya para|duérmete|duermete)\b/.test(orden.trim()),
        ejecutar: () => {
            actualizarIndicador('inactivo', 'Toca para activar Jarvis');
            reproducirTono(440, 140, 'triangle');
            setTimeout(desactivarJarvis, 0);
        }
    },
    {
        nombre: 'ayuda',
        test: (orden) => /^(ayuda|qué puedes hacer|que puedes hacer|qué sabes hacer|que sabes hacer)\b/.test(orden.trim()),
        ejecutar: () => {
            hablar('Puedo abrir sitios, buscar en ellos, controlar el video, moverme por el historial y más. Di ayuda otra vez para repetirlo despacio si hace falta.');
        }
    }
];

function procesarComando(orden) {
    console.log('[Jarvis ejecutando]:', orden);
    const regla = reglasComando.find((r) => r.test(orden));
    if (!regla) {
        console.log('[Jarvis] No reconocí esa orden, la intento como pregunta general…');
        actualizarIndicador('escuchando', `Buscando: "${orden}"`);
        responderPreguntaGeneral(orden);
        return;
    }
    regla.ejecutar(orden);
}

async function responderPreguntaGeneral(orden) {
    const consulta = orden
        .replace(/^(qué es|que es|quién es|quien es|cuál es|cual es|cuáles son|cuales son|qué son|que son|cuéntame de|cuentame de|háblame de|hablame de|dime sobre|qué significa|que significa)\s+/, '')
        .trim();
    if (!consulta) {
        hablar('No entendí esa orden');
        return;
    }
    try {
        const respBusqueda = await fetch(
            `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(consulta)}&format=json&origin=*&srlimit=1`
        );
        const datosBusqueda = await respBusqueda.json();
        const mejorTitulo = datosBusqueda && datosBusqueda.query && datosBusqueda.query.search && datosBusqueda.query.search[0]
            ? datosBusqueda.query.search[0].title
            : null;
        if (!mejorTitulo) throw new Error('sin resultado');

        const respResumen = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(mejorTitulo)}`);
        if (!respResumen.ok) throw new Error('sin resumen');
        const datosResumen = await respResumen.json();
        if (!datosResumen.extract) throw new Error('sin extracto');
        const resumen = datosResumen.extract.split('. ').slice(0, 2).join('. ');
        hablar(resumen);
    } catch (e) {
        hablar('No entendí esa orden y tampoco encontré nada sobre eso');
    }
}

function navegarAWeb(destino) {
    const clave = destino.toLowerCase().trim();
    if (webRapidas[clave]) {
        window.location.href = webRapidas[clave];
        return;
    }
    const primeraPalabra = clave.split(/\s+/)[0] || '';
    if (webRapidas[primeraPalabra]) {
        window.location.href = webRapidas[primeraPalabra];
        return;
    }
    const limpio = primeraPalabra.replace(/[^a-z0-9-]/g, '');
    if (!limpio) return;
    window.location.href = `https://www.${limpio}.com`;
}
    // ==========================================
    // BÚSQUEDA PENDIENTE TRAS NAVEGAR
    // ==========================================
    function buscarProfundo(raiz, selector) {
        let el = null;
        try { el = raiz.querySelector(selector); } catch (e) { el = null; }
        if (el) return el;
        let nodos = [];
        try { nodos = raiz.querySelectorAll('*'); } catch (e) { nodos = []; }
        for (const nodo of nodos) {
            if (nodo.shadowRoot) {
                const encontrado = buscarProfundo(nodo.shadowRoot, selector);
                if (encontrado) return encontrado;
            }
        }
        return null;
    }

    function esperarElemento(selectores, intentosMax, intervaloMs) {
        return new Promise((resolve) => {
            let intentos = 0;
            const timer = setInterval(() => {
                intentos++;
                for (const sel of selectores) {
                    const el = buscarProfundo(document, sel);
                    if (el) {
                        clearInterval(timer);
                        resolve(el);
                        return;
                    }
                }
                if (intentos >= intentosMax) {
                    clearInterval(timer);
                    resolve(null);
                }
            }, intervaloMs);
        });
    }

    function establecerValorInput(input, valor) {
        try {
            const prototipo = window.HTMLInputElement && window.HTMLInputElement.prototype;
            const descriptor = prototipo && Object.getOwnPropertyDescriptor(prototipo, 'value');
            if (descriptor && descriptor.set) {
                descriptor.set.call(input, valor);
            } else {
                input.value = valor;
            }
        } catch (e) {
            input.value = valor;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function simularEnter(elemento) {
        ['keydown', 'keypress', 'keyup'].forEach((tipo) => {
            try {
                elemento.dispatchEvent(new KeyboardEvent(tipo, {
                    key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
                }));
            } catch (e) {}
        });
    }

    async function autocompletarBusquedaEnPagina(termino) {
        const enYoutube = window.location.hostname.includes('youtube.com');
        const selectores = [
            ...(enYoutube ? [
                'input#search',
                'input[name="search_query"]',
                'input#search-input',
                'ytd-searchbox input',
                '#search-input input',
                'tp-yt-paper-input#search-input input',
                'input.sbsb_a'
            ] : []),
            'input[type="search"]',
            'input[name="q"]',
            'input[name="query"]',
            'input[name="buscar"]',
            'input[aria-label*="buscar" i]',
            'input[aria-label*="search" i]',
            'input[placeholder*="buscar" i]',
            'input[placeholder*="search" i]',
            'input[role="searchbox"]',
            'form[role="search"] input'
        ];

        const input = await esperarElemento(selectores, 25, 300);
        if (!input) {
            console.log('[Jarvis] No encontré ninguna barra de búsqueda en esta página.');
            return false;
        }

        input.focus();
        establecerValorInput(input, termino);

        const botonYoutube = enYoutube
            ? await esperarElemento(['button#search-icon-legacy', '#search-icon-legacy', 'button.ytd-searchbox'], 8, 150)
            : null;
        if (botonYoutube) {
            botonYoutube.click();
            return true;
        }

        const formulario = input.closest('form');
        const botonGenerico =
            (formulario && formulario.querySelector('button[type="submit"], button[aria-label*="buscar" i], button[aria-label*="search" i]')) ||
            document.querySelector('button[aria-label*="buscar" i], button[aria-label*="search" i]');
        if (botonGenerico) {
            botonGenerico.click();
            return true;
        }

        simularEnter(input);
        if (formulario) {
            try {
                if (formulario.requestSubmit) formulario.requestSubmit();
                else formulario.submit();
            } catch (e) {}
        }
        return true;
    }

    window.addEventListener('load', function () {
        const pendiente = leerValor(CLAVE_BUSQUEDA_PENDIENTE);
        if (!pendiente) return;
        borrarValor(CLAVE_BUSQUEDA_PENDIENTE);
        autocompletarBusquedaEnPagina(pendiente);
    });

    // ==========================================
    // ARRANQUE
    // ==========================================
    function manejarCambioPantallaCompleta() {
        if (!boton || !pill) return;
        const elementoFull = document.fullscreenElement;
        if (elementoFull && elementoFull !== document.body) {
            try {
                elementoFull.appendChild(boton);
                elementoFull.appendChild(pill);
            } catch (e) {
                // No se pudo reubicar
            }
        } else {
            document.body.appendChild(boton);
            document.body.appendChild(pill);
        }
    }
    document.addEventListener('fullscreenchange', manejarCambioPantallaCompleta);

    function iniciar() {
        try {
            crearInterfaz();
        } catch (e) {
            console.error('[Jarvis] No se pudo crear la interfaz en esta página:', e);
            return;
        }
        actualizarIndicador('inactivo', 'Toca para activar Jarvis');
        intentarReanudarSesion();

        setInterval(() => {
            if (!document.body) return;
            if (!document.body.contains(boton) || !document.body.contains(pill)) {
                document.body.appendChild(boton);
                document.body.appendChild(pill);
            }
        }, 2000);
    }

    if (document.body) {
        iniciar();
    } else {
        document.addEventListener('DOMContentLoaded', iniciar, { once: true });
    }
})();
