// --- NAVEGACIÓN SINGLE PAGE APP (SPA) ---
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active-section'));
        
        link.classList.add('active');
        document.querySelector(link.getAttribute('href')).classList.add('active-section');
    });
});

// --- FUNCIÓN PARA MOSTRAR ALERTAS MODERNAS EN PANTALLA (TOASTS) ---
function showNotification(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type === 'success' ? 'toast-success' : 'toast-error'}`;
    toast.innerHTML = message;

    container.appendChild(toast);

    // Desvanecer y eliminar automáticamente después de 4.5 segundos
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// --- FUNCIÓN AUXILIAR PARA LA BITÁCORA DE LA MMU ---
function logMMUEvent(message, type = 'system') {
    const board = document.getElementById('mmu-log-board');
    if (!board) return;
    
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}-node`;
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `[${time}] ${message}`;
    
    board.appendChild(entry);
    board.scrollTop = board.scrollHeight; // Auto-scroll al último evento
}

// --- LÓGICA DEL SIMULADOR RAM PRO ---
const TOTAL_RAM = 500; 
let ramMap = [{ id: null, name: 'Libre', size: TOTAL_RAM, used: false }];

function updateMetrics() {
    let usedMemory = ramMap.reduce((acc, b) => acc + (b.used ? b.size : 0), 0);
    document.getElementById('stat-used').innerText = `${usedMemory} MB`;
    document.getElementById('stat-free').innerText = `${TOTAL_RAM - usedMemory} MB`;
}

function updateRamUI() {
    const ramBar = document.getElementById('ram-bar');
    if(!ramBar) return;
    ramBar.innerHTML = '';

    ramMap.forEach((block, index) => {
        const blockDiv = document.createElement('div');
        blockDiv.className = `ram-block ${block.used ? 'used' : 'free'}`;
        blockDiv.style.width = `${(block.size / TOTAL_RAM) * 100}%`;
        
        if (block.used) {
            blockDiv.innerHTML = `<span>📦 ${block.name}</span><span style="font-size:0.7rem; opacity:0.8;">${block.size}MB</span>`;
            blockDiv.onclick = () => releaseMemory(index);
        } else {
            blockDiv.innerHTML = block.size > 25 ? `<span style="color:#4b5563">Libre</span><span style="font-size:0.7rem; color:#4b5563">${block.size}MB</span>` : '';
        }
        ramBar.appendChild(blockDiv);
    });
    updateMetrics();
}

function addProcess() {
    const nameInput = document.getElementById('proc-name');
    const sizeInput = document.getElementById('proc-size');
    const algoSelect = document.getElementById('algo-select');
    
    const name = nameInput.value.trim();
    const size = parseInt(sizeInput.value);
    const algorithm = algoSelect.value;

    if (!name || isNaN(size) || size < 10 || size > 300) {
        showNotification('❌ <strong>Datos Inválidos</strong><br>Por favor asigne un nombre de proceso y un tamaño válido entre 10 y 300 MB.', 'error');
        logMMUEvent(`ERROR: Intento de asignación fallido. Datos de proceso inválidos o fuera de rango.`, 'error');
        return;
    }

    logMMUEvent(`MMU: Evaluando asignación para contiguo [${name}] de ${size}MB usando estrategia ${algorithm.toUpperCase()}...`, 'system');

    let targetIndex = -1;
    if (algorithm === 'first') {
        targetIndex = ramMap.findIndex(block => !block.used && block.size >= size);
    } else if (algorithm === 'best') {
        let bestSize = Infinity;
        ramMap.forEach((block, index) => {
            if (!block.used && block.size >= size && block.size < bestSize) { bestSize = block.size; targetIndex = index; }
        });
    } else if (algorithm === 'worst') {
        let worstSize = -1;
        ramMap.forEach((block, index) => {
            if (!block.used && block.size >= size && block.size > worstSize) { worstSize = block.size; targetIndex = index; }
        });
    }

    if (targetIndex === -1) {
        showNotification('⚠️ <strong>Error de Asignación</strong><br>No se encontró ningún bloque libre continuo suficiente.<br><br>Prueba presionando el botón "Compactar RAM" para unificar el espacio.', 'error');
        logMMUEvent(`CRÍTICO: Fallo de asignación para [${name}] (${size}MB). Bloque contiguo no disponible. ¡Fragmentación Externa detectada!`, 'error');
        return;
    }

    const remainingSpace = ramMap[targetIndex].size - size;
    ramMap[targetIndex] = { id: Date.now(), name: name, size: size, used: true };
    if (remainingSpace > 0) {
        ramMap.splice(targetIndex + 1, 0, { id: null, name: 'Libre', size: remainingSpace, used: false });
    }
    
    nameInput.value = '';
    sizeInput.value = '';
    updateRamUI();
    showNotification(`✅ Proceso <strong>${name}</strong> asignado con éxito usando el algoritmo seleccionado.`, 'success');
    logMMUEvent(`ÉXITO: Proceso [${name}] alojado correctamente. Espacio remanente creado: ${remainingSpace}MB.`, 'success');
}

function releaseMemory(index) {
    const name = ramMap[index].name;
    ramMap[index].used = false;
    ramMap[index].name = 'Libre';
    for (let i = 0; i < ramMap.length - 1; i++) {
        if (!ramMap[i].used && !ramMap[i+1].used) {
            ramMap[i].size += ramMap[i+1].size;
            ramMap.splice(i+1, 1);
            i--; 
        }
    }
    updateRamUI();
    showNotification(`ℹ️ Proceso <strong>${name}</strong> finalizado y removido de la memoria RAM.`, 'success');
    logMMUEvent(`SISTEMA: Proceso [${name}] ha finalizado su ejecución. Estructuras de datos destruidas y memoria liberada.`, 'system');
}

function compactMemory() {
    logMMUEvent("SISTEMA: Iniciando proceso de compactación de memoria RAM (Desfragmentación)...", 'system');
    let activeProcesses = ramMap.filter(block => block.used);
    let totalFreeSize = ramMap.filter(block => !block.used).reduce((sum, b) => sum + b.size, 0);
    
    ramMap = [...activeProcesses];
    if (totalFreeSize > 0) ramMap.push({ id: null, name: 'Libre', size: totalFreeSize, used: false });
    
    updateRamUI();
    showNotification('⚙️ <strong>Memoria RAM compactada</strong><br>Todos los procesos activos se agruparon al inicio y los huecos vacíos se unificaron al final.', 'success');
    logMMUEvent(`ÉXITO: Compactación finalizada. Todos los bloques libres unificados en un vector de ${totalFreeSize}MB al final de la RAM.`, 'success');
}

// --- LÓGICA DEL SCRIPT DEL QUIZ INTERACTIVO ---
const quizData = [
    {
        question: "¿Cuál es el tipo de fragmentación que deja huecos libres inutilizados distribuidos en el espacio entre bloques asignados de tamaño variable?",
        options: ["Fragmentación Interna", "Fragmentación Externa", "Paginación Invertida", "Hiperpaginación"],
        correct: 1,
        feedback: "¡Excelente! La fragmentación externa ocurre en las particiones dinámicas o en la segmentación cuando quedan espacios vacíos pequeños entre los procesos activos."
    },
    {
        question: "¿Cómo se denominan los bloques de tamaño fijo en los que se divide la memoria física real (RAM)?",
        options: ["Páginas", "Segmentos", "Marcos de Página (Frames)", "Particiones lógicas"],
        correct: 2,
        feedback: "¡Correcto! En la paginación, los bloques del programa se llaman Páginas (lógicas) y los bloques de la RAM física se denominan Marcos (físicos)."
    },
    {
        question: "¿Qué componente de hardware se encarga de interceptar y traducir las direcciones virtuales a físicas en tiempo real?",
        options: ["El TLB", "La Unidad de Manejo de Memoria (MMU)", "El archivo Swap", "El Registro Límite"],
        correct: 1,
        feedback: "¡Exacto! La MMU (Memory Management Unit) es el dispositivo de hardware que realiza la traducción dinámica de todas las direcciones de memoria."
    },
    {
        question: "¿Qué anomalía puede ocurrir bajo el criterio del algoritmo de reemplazo FIFO donde dar más RAM genera curiosamente más fallos de página?",
        options: ["Anomalía de Belady", "Hiperpaginación por demanda", "Fallo de Segmentación", "Thrashing Crítico"],
        correct: 0,
        feedback: "¡Muy bien pensado! La Anomalía de Belady es un comportamiento extraño propio de FIFO donde incrementar los marcos físicos eleva la tasa de fallos."
    },
    {
        question: "¿Qué estado crítico alcanza un sistema operativo cuando pasa casi todo su tiempo haciendo E/S en disco en vez de ejecutar código útil?",
        options: ["Swapping Básico", "Relocalización Dinámica", "Hiperpaginación (Thrashing)", "Best-Fit Error"],
        correct: 2,
        feedback: "¡Perfecto! El Thrashing sucede cuando la falta de marcos de memoria libres colapsa el rendimiento del equipo por la excesiva transferencia de páginas."
    }
];

let currentQuestionIndex = 0;
let userScore = 0;

function renderQuizQuestion() {
    const cardContent = document.getElementById('quiz-card-content');
    if(!cardContent) return;
    
    if (currentQuestionIndex >= quizData.length) {
        let badge = "🥈";
        let title = "Administrador Junior";
        if(userScore === quizData.length) { badge = "🥇"; title = "Arquitecto del Kernel (100%)"; }
        else if(userScore < 3) { badge = "🥉"; title = "Estudiante del Sistema"; }

               cardContent.innerHTML = `
            <div style="text-align:center; padding: 1.5rem 0;">
                <h2>🎉 ¡Desafío Completado!</h2>
                <div class="badge-display">${badge}</div>
                <h3 style="color: var(--accent); margin-bottom: 0.5rem;">Rango: ${title}</h3>
                <p style="margin: 0.5rem 0; font-size:1.1rem;">Puntuación final: <strong>${userScore * 20} / 100 puntos</strong>.</p>
                <button onclick="restartQuiz()" class="quiz-reset-btn">🔄 Volver a Intentarlo</button>
            </div>
        `;
        document.getElementById('quiz-progress').innerText = `${quizData.length}/${quizData.length}`;
        return;
    }

    const currentQuiz = quizData[currentQuestionIndex];
    document.getElementById('quiz-progress').innerText = `${currentQuestionIndex + 1}/${quizData.length}`;
    document.getElementById('quiz-score').innerText = userScore * 20;

    let optionsHTML = '';
    currentQuiz.options.forEach((opt, idx) => {
        optionsHTML += `<button class="quiz-opt-btn" onclick="checkQuizAnswer(${idx})">${opt}</button>`;
    });

    cardContent.innerHTML = `
        <div class="quiz-question-text">${currentQuiz.question}</div>
        <div class="quiz-options-list" id="options-block">${optionsHTML}</div>
        <div id="quiz-feedback-target"></div>
    `;
}

function checkQuizAnswer(selectedIdx) {
    const currentQuiz = quizData[currentQuestionIndex];
    const buttons = document.getElementById('options-block').children;
    const feedbackTarget = document.getElementById('quiz-feedback-target');

    for (let btn of buttons) {
        btn.disabled = true;
    }

    if (selectedIdx === currentQuiz.correct) {
        buttons[selectedIdx].classList.add('correct-choice');
        feedbackTarget.innerHTML = `
            <div class="quiz-feedback-panel correct-style">
                <strong>✨ ¡Correcto!</strong> ${currentQuiz.feedback}
                <button onclick="nextQuizQuestion()" class="quiz-next-btn">Siguiente ➡️</button>
            </div>
        `;
        userScore++;
        document.getElementById('quiz-score').innerText = userScore * 20;
    } else {
        buttons[selectedIdx].classList.add('wrong-choice');
        buttons[currentQuiz.correct].classList.add('correct-choice');
        feedbackTarget.innerHTML = `
            <div class="quiz-feedback-panel wrong-style">
                <strong>❌ Incorrecto.</strong> La respuesta correcta era: <em>${currentQuiz.options[currentQuiz.correct]}</em>.
                <button onclick="nextQuizQuestion()" class="quiz-next-btn">Siguiente ➡️</button>
            </div>
        `;
    }
}

function nextQuizQuestion() {
    currentQuestionIndex++;
    renderQuizQuestion();
}

function restartQuiz() {
    currentQuestionIndex = 0;
    userScore = 0;
    renderQuizQuestion();
}

// Inicialización de componentes al cargar el navegador
updateRamUI();
renderQuizQuestion();
