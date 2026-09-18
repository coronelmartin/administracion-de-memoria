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

// --- FUNCIÓN PARA MOSTRAR ALERTAS EN PANTALLA ---
function showNotification(message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type === 'success' ? 'toast-success' : 'toast-error'}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
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
    board.scrollTop = board.scrollHeight;
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
    if(!ramBar) return; ramBar.innerHTML = '';
    ramMap.forEach((block, index) => {
        const blockDiv = document.createElement('div');
        blockDiv.className = `ram-block ${block.used ? 'used' : 'free'}`;
        blockDiv.style.width = `${(block.size / TOTAL_RAM) * 100}%`;
        if (block.used) {
            blockDiv.innerHTML = `<span>📦 ${block.name}</span><span style="font-size:0.7rem;">${block.size}MB</span>`;
            blockDiv.onclick = () => releaseMemory(index);
        } else {
            blockDiv.innerHTML = block.size > 25 ? `<span>Libre</span><span style="font-size:0.7rem;">${block.size}MB</span>` : '';
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
        showNotification('❌ <strong>Datos Inválidos</strong><br>Tamaño requerido entre 10 y 300 MB.', 'error');
        logMMUEvent(`ERROR: Asignación fallida por parámetros fuera de rango.`, 'error');
        return;
    }

    logMMUEvent(`MMU: Buscando espacio para [${name}] (${size}MB) mediante ${algorithm.toUpperCase()}...`, 'system');
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
        showNotification('⚠️ <strong>Error de Asignación</strong><br>No hay espacio continuo. ¡Compacta la memoria!', 'error');
        logMMUEvent(`CRÍTICO: Fallo de alojamiento para [${name}]. ¡Fragmentación Externa detectada!`, 'error');
        return;
    }

    const remainingSpace = ramMap[targetIndex].size - size;
    ramMap[targetIndex] = { id: Date.now(), name: name, size: size, used: true };
    if (remainingSpace > 0) ramMap.splice(targetIndex + 1, 0, { id: null, name: 'Libre', size: remainingSpace, used: false });
    nameInput.value = ''; sizeInput.value = ''; updateRamUI();
    showNotification(`✅ Proceso <strong>${name}</strong> asignado con éxito.`, 'success');
    logMMUEvent(`ÉXITO: Proceso [${name}] guardado. Bloque sobrante: ${remainingSpace}MB.`, 'success');
}

function releaseMemory(index) {
    const name = ramMap[index].name;
    ramMap[index].used = false; ramMap[index].name = 'Libre';
    for (let i = 0; i < ramMap.length - 1; i++) {
        if (!ramMap[i].used && !ramMap[i+1].used) { ramMap[i].size += ramMap[i+1].size; ramMap.splice(i+1, 1); i--; }
    }
    updateRamUI();
    showNotification(`ℹ️ Proceso <strong>${name}</strong> finalizado.`, 'success');
    logMMUEvent(`SISTEMA: Destruido hilo de ejecución [${name}] y liberados sus marcos.`, 'system');
}

function compactMemory() {
    logMMUEvent("SISTEMA: Corriendo desfragmentador y compactando bloques de RAM...", 'system');
    let activeProcesses = ramMap.filter(block => block.used);
    let totalFreeSize = ramMap.filter(block => !block.used).reduce((sum, b) => sum + b.size, 0);
    ramMap = [...activeProcesses];
    if (totalFreeSize > 0) ramMap.push({ id: null, name: 'Libre', size: totalFreeSize, used: false });
    updateRamUI();
    showNotification('⚙️ <strong>Memoria RAM compactada</strong>', 'success');
    logMMUEvent(`ÉXITO: Bloques libres unificados en un único vector contiguo de ${totalFreeSize}MB.`, 'success');
}

function resetSimulator() {
    ramMap = [{ id: null, name: 'Libre', size: TOTAL_RAM, used: false }];
    document.getElementById('proc-name').value = '';
    document.getElementById('proc-size').value = '';
    updateRamUI();
    const board = document.getElementById('mmu-log-board');
    if (board) {
        board.innerHTML = '<div class="log-entry system-node">🧠 Sistema operativo reinicializado. Memoria RAM de 500MB limpia y vacía.</div>';
    }
    showNotification('🔄 El simulador de hardware ha sido restablecido a cero.', 'success');
}

// --- QUIZ POR NIVELES (12 PREGUNTAS) ---
const quizData = [
    { level: "Básico 🟢", question: "¿Cuál es el propósito primordial del subsistema de administración de memoria?", options: ["Acelerar la CPU", "Controlar periféricos", "Asignar, proteger y liberar el espacio de la RAM"], correct: 2, feedback: "¡Correcto! Repartir el espacio de la RAM es su función primordial." },
    { level: "Básico 🟢", question: "¿Qué tipo de fragmentación desaprovecha espacio INSIDE de una partición fija?", options: ["Externa", "Interna", "Hiperpaginación"], correct: 1, feedback: "¡Exacto! Ocurre dentro de bloques estáticos cuando el programa mide menos que el bloque." },
    { level: "Básico 🟢", question: "¿Qué técnica mueve un proceso completo de la RAM al disco duro para liberar espacio?", options: ["Paginación", "Segmentación", "Intercambio (Swapping)"], correct: 2, feedback: "¡Muy bien! El Swapping desaloja temporalmente programas enteros al disco duro." },
    { level: "Básico 🟢", question: "Si un proceso se aloja en el primer hueco suficiente que encuentra, ¿qué algoritmo se usó?", options: ["Worst-Fit", "Best-Fit", "First-Fit"], correct: 2, feedback: "¡Perfecto! First-Fit toma la primera opción para ahorrar ciclos de CPU." },
    { level: "Intermedio 🟡", question: "¿Cómo se denominan las divisiones de tamaño FIJO en la memoria física RAM?", options: ["Páginas lógicas", "Segmentos", "Marcos de Página (Frames)"], correct: 2, feedback: "¡Excelente! En física se llaman Marcos y en lógica se denominan Páginas." },
    { level: "Intermedio 🟡", question: "¿Qué tipo de fragmentación se erradica por completo al implementar Paginación Pura?", options: ["Interna", "Externa", "Fallo de página"], correct: 1, feedback: "¡Correcto! Elimina la fragmentación externa ya que las páginas se esparcen por donde sea." },
    { level: "Intermedio 🟡", question: "¿Qué excepción lanza la MMU cuando la CPU pide una dirección cuyo bit de presencia es '0'?", options: ["Fallo de Segmento", "Fallo de Página (Page Fault)", "Anomalía FIFO"], correct: 1, feedback: "¡Muy bien! Lanza Fallo de Página para indicarle al kernel que cargue el dato desde el disco." },
    { level: "Intermedio 🟡", question: "¿Qué algoritmo sufre de la paradoja donde darle más RAM causa más fallos de página?", options: ["LRU", "Óptimo", "FIFO"], correct: 2, feedback: "¡Exacto! La Anomalía de Belady afecta exclusivamente al criterio clásico FIFO." },
    { level: "Avanzado 🔴", question: "¿Qué caché de hardware integrada en el silicio de la CPU recuerda las traducciones de la MMU?", options: ["Caché L3", "Tabla invertida", "TLB (Translation Lookaside Buffer)"], correct: 2, feedback: "¡Excelente nivel! La TLB acelera la conversión de direcciones lógicas a físicas." },
    { level: "Avanzado 🔴", question: "¿A qué se debe el fenómeno del Thrashing (Hiperpaginación) en un sistema operativo?", options: ["A fallas de corriente", "A operaciones excesivas de intercambio en disco duro", "A bucles lógicos"], correct: 1, feedback: "¡Perfecto! El Thrashing sucede cuando los procesos carecen de RAM y saturan el bus del disco." },
    { level: "Avanzado 🔴", question: "¿Cómo se llama el modelo que monitorea las páginas activas en una ventana delta (Δ)?", options: ["Paginación Invertida", "Modelo del Conjunto de Trabajo (Working Set)", "Asignación Global"], correct: 1, feedback: "¡Impresionante! El Working Set calcula la RAM mínima para asegurar estabilidad." },
    { level: "Avanzado 🔴", question: "En el procesador, ¿cuál es el nivel de caché que posee mayor capacidad en megabytes?", options: ["Caché L1", "Caché L2", "Caché L3 Compartida"], correct: 2, feedback: "¡Brillante! La L3 es la más grande del chip y es compartida entre todos los núcleos." }
];

let currentQuestionIndex = 0; let userScore = 0;

function renderQuizQuestion() {
    const cardContent = document.getElementById('quiz-card-content'); if(!cardContent) return;
    if (currentQuestionIndex >= quizData.length) {
        let badge = "🥈"; let title = "Administrador Junior";
        if(userScore === quizData.length) { badge = "👑🥇"; title = "Arquitecto Supremo del Kernel (100%)"; }
        else if(userScore >= 8) { badge = "🥇"; title = "Ingeniero Avanzado"; }
        cardContent.innerHTML = `<div style="text-align:center;"><div class="badge-display">${badge}</div><h3>${title}</h3><p style="margin-top:0.5rem;">Puntuación final: <strong>${Math.round((userScore/quizData.length)*100)}/100 puntos</strong></p><button onclick="restartQuiz()" class="btn-secondary" style="margin-top:1rem;">🔄 Reiniciar Desafío</button></div>`;
        return;
    }
    const q = quizData[currentQuestionIndex];
    document.getElementById('quiz-progress').innerText = `${currentQuestionIndex + 1}/${quizData.length}`;
    document.getElementById('quiz-score').innerText = Math.round((userScore/quizData.length)*100);
    
    let opts = ''; 
    q.options.forEach((o, i) => opts += `<button class="quiz-opt-btn" onclick="checkQuizAnswer(${i})">${o}</button>`);
    
    cardContent.innerHTML = `
        <div style="margin-bottom: 0.75rem; color: #38bdf8; font-weight: bold; font-size: 0.95rem;">Nivel Actual: ${q.level}</div>
        <div class="quiz-question-text" style="margin-bottom: 1.5rem; font-size: 1.25rem; font-weight: 700; line-height: 1.4;">${q.question}</div>
        <div class="quiz-options-list" id="options-block" style="display: flex; flex-direction: column; gap: 0.75rem;">${opts}</div>
        <div id="quiz-feedback-target"></div>
    `;
}

function checkQuizAnswer(selectedIdx) {
    const q = quizData[currentQuestionIndex]; const buttons = document.getElementById('options-block').children;
    for (let b of buttons) b.disabled = true;
    if (selectedIdx === q.correct) { buttons[selectedIdx].classList.add('correct-choice'); userScore++; } 
    else { buttons[selectedIdx].classList.add('wrong-choice'); buttons[q.correct].classList.add('correct-choice'); }
    document.getElementById('quiz-feedback-target').innerHTML = `<div class="quiz-feedback-panel correct-style">${q.feedback}<button onclick="nextQuizQuestion()" class="quiz-next-btn">Siguiente ➡️</button></div>`;
}
function nextQuizQuestion() { currentQuestionIndex++; renderQuizQuestion(); }
function restartQuiz() { currentQuestionIndex = 0; userScore = 0; renderQuizQuestion(); }


// --- 🛠️ NUEVAS FUNCIONES INTERACTIVAS CON PAUSAS DE LECTURA FIJAS ---

// 1. Inyección de Alerta Académica con Botón de Cierre Manual
function injectPersistentAlert(htmlMessage) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const activeAlert = document.querySelector('.persistent-explain-alert');
    if (activeAlert) activeAlert.remove();

    const alertDiv = document.createElement('div');
    alertDiv.className = 'toast-notification toast-success persistent-explain-alert';
    alertDiv.style.width = '380px';
    alertDiv.style.borderLeft = '5px solid #38bdf8';
    
    alertDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
            <div style="font-size: 0.9rem; line-height: 1.5; color: #fff;">${htmlMessage}</div>
            <button onclick="this.closest('.persistent-explain-alert').remove()" style="background: none; border: none; color: #9ca3af; font-size: 1.1rem; cursor: pointer; padding: 0; font-weight: bold;">✖</button>
        </div>
    `;
    container.appendChild(alertDiv);
}

// 2. Traducción en Cámara Lenta por Etapas (CPU -> MMU -> RAM)
function simulateMmuTranslation(logicalName, physicalName, type) {
    const cpu = document.getElementById('interactive-cpu');
    const mmu = document.getElementById('interactive-mmu');
    const ram = document.getElementById('interactive-ram');
    if(!cpu || !mmu || !ram) return;

    cpu.style.backgroundColor = '#3b82f6';
    cpu.style.transform = 'scale(1.05)';
    
    setTimeout(() => {
        cpu.style.transform = 'scale(1)';
        mmu.style.backgroundColor = '#ea580c';
        mmu.style.transform = 'scale(1.05)';
        
        setTimeout(() => {
            mmu.style.transform = 'scale(1)';
            ram.style.backgroundColor = '#10b981';
            ram.style.transform = 'scale(1.05)';
            
            setTimeout(() => {
                ram.style.transform = 'scale(1)';
                cpu.style.backgroundColor = '#1e2937';
                mmu.style.backgroundColor = '#7c2d12';
                ram.style.backgroundColor = '#064e3b';
            }, 800);
        }, 700);
    }, 700);

    const explanation = `
        <strong>📋 Bitácora de Traducción MMU:</strong><br><br>
        • <strong>CPU:</strong> Solicitó el bloque lógico virtual <em>"${logicalName}"</em>.<br>
        • <strong>MMU:</strong> Interceptó la línea del bus y buscó el mapeo indexado en la Tabla de Páginas corporativa.<br>
        • <strong>RAM:</strong> Encontró que apuntaba de forma física a la celda real <em>"${physicalName}"</em>. ¡Dirección concedida!
    `;
    injectPersistentAlert(explanation);
}

// 3. Simulación Pausada de Fallo de Página (Swap de Datos Completo)
function triggerInteractivePageFault() {
    const board = document.getElementById('page-fault-visual-board');
    const statusText = document.getElementById('page-fault-status-text');
    const ramNode = document.getElementById('virtual-ram-node');
    const diskNode = document.getElementById('virtual-disk-node');
    if(!board || !statusText || !ramNode || !diskNode) return;

    board.style.backgroundColor = 'rgba(220, 38, 38, 0.2)';
    statusText.innerText = '🚨 ¡FALLO DE PÁGINA! La MMU detectó bit de presencia en cero.';
    diskNode.style.borderColor = '#ea580c';
    diskNode.style.backgroundColor = '#7c2d12';

    setTimeout(() => {
        statusText.innerText = '💽 Leyendo del Disco: Localizando la página víctima en el bloque de SWAP...';
        
        setTimeout(() => {
            statusText.innerText = '⏳ Page-In: Transfiriendo bytes por ráfaga hacia un marco libre en la RAM...';
            ramNode.style.backgroundColor = '#10b981';
            
            setTimeout(() => {
                board.style.backgroundColor = '#0c1322';
                statusText.innerText = 'Demostración Interactiva de Intercambio';
                ramNode.style.backgroundColor = '#065f46';
                diskNode.style.backgroundColor = '#111827';
                diskNode.style.borderColor = '#4b5563';
            }, 1500);
        }, 1500);
    }, 1500);

    const explanation = `
        <strong>🚨 Bitácora de Excepción (Page Fault):</strong><br><br>
        1. <strong>MMU Miss:</strong> El proceso pidió una página que no estaba cargada en los marcos físicos de la RAM.<br>
        2. <strong>Trap al Kernel:</strong> El hardware congeló el hilo de ejecución actual y llamó al manejador de fallos del SO.<br>
        3. <strong>E/S Disco:</strong> Se leyó el bloque del SSD/SWAP y se volcó en la RAM. ¡Bit de presencia actualizado a 1!
    `;
    injectPersistentAlert(explanation);
}

// Inicializadores Básicos
updateRamUI(); renderQuizQuestion();

