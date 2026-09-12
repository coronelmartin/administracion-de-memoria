/* =========================================================================
   BIBLIOTECA GRÁFICA COMPACTA NATIVA (CONVERTIDOR DE TEXTO A LIENZO)
   ========================================================================= */
const html2canvas = function(element, options) {
    options = options || {};
    const canvas = document.createElement("canvas");
    const rect = element.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    
    const scale = options.scale || 2;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    ctx.scale(scale, scale);
    
    ctx.fillStyle = options.backgroundColor || "#1f2937";
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Dibujar cuadros de texto (Textareas)
    const textareas = element.querySelectorAll("textarea");
    textareas.forEach(function(el) {
        const elRect = el.getBoundingClientRect();
        const x = elRect.left - rect.left;
        const y = elRect.top - rect.top;
        
        ctx.fillStyle = "#111827";
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        if (ctx.roundRect) {
            ctx.roundRect(x, y, elRect.width, elRect.height, 8);
        } else {
            ctx.rect(x, y, elRect.width, elRect.height);
        }
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "#f3f4f6";
        ctx.font = "14px system-ui, sans-serif";
        ctx.textBaseline = "top";
        
        const text = el.value || el.placeholder || "";
        const maxW = el.className.includes("justify-box") ? 350 : 700;
        
        let words = text.split(" ");
        let line = "";
        let currentY = y + 12;
        
        for (let i = 0; i < words.length; i++) {
            let testLine = line + words[i] + " ";
            if (ctx.measureText(testLine).width > maxW && i > 0) {
                ctx.fillText(line, x + 12, currentY);
                line = words[i] + " ";
                currentY += 20;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x + 12, currentY);
    });
    
    // Dibujar preguntas y títulos
    const labels = element.querySelectorAll(".question-group label, .vf-question, .print-title");
    labels.forEach(function(el) {
        const style = window.getComputedStyle(el);
        if (style.display !== "none" || el.className.includes("print-title")) {
            const elRect = el.getBoundingClientRect();
            const x = elRect.left - rect.left;
            const y = elRect.top - rect.top;
            
            ctx.fillStyle = el.className.includes("print-title") ? "#38bdf8" : "#ffffff";
            ctx.font = "bold 15px system-ui, sans-serif";
            ctx.fillText(el.innerText, x, y + 5);
        }
    });
    
    // Dibujar opciones seleccionadas (Radio buttons)
    const checkedRadios = element.querySelectorAll(".radio-label input[type='radio']:checked");
    checkedRadios.forEach(function(el) {
        const elRect = el.parentElement.getBoundingClientRect();
        const x = elRect.left - rect.left;
        const y = elRect.top - rect.top;
        
        ctx.fillStyle = "#34d399";
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.fillText("✔ Seleccionado", x + 20, y + 4);
    });
    
    return Promise.resolve(canvas);
};

// =========================================================================
// --- LÓGICA DE CONTROL DEL PANEL DE EVALUACIÓN ---
// =========================================================================

function showNotification(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = "toast-notification toast-success";
    toast.innerHTML = message;

    container.appendChild(toast);

    setTimeout(function() {
        toast.style.opacity = "0";
        setTimeout(function() {
            toast.remove();
        }, 400);
    }, 4000);
}

function toggleJustification(id, show) {
    const box = document.getElementById('justify-' + id);
    if (box) {
        box.style.display = show ? 'block' : 'none';
        if (!show) box.value = ''; 
    }
}

function clearContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('textarea').forEach(function(textarea) {
        textarea.value = '';
    });
    container.querySelectorAll('input[type="radio"]').forEach(function(radio) {
        radio.checked = false;
    });
    container.querySelectorAll('.justify-box').forEach(function(box) {
        box.style.display = 'none';
    });
    
    showNotification('🗑️ Todos los campos del formulario han sido limpiados.');
}

function saveAsImage(containerId, filename) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const printTitle = container.querySelector('.print-title');
    if (printTitle) printTitle.style.display = 'block';

    showNotification('🔄 Procesando documento... Tu imagen se descargará en unos segundos.');

    html2canvas(container, {
        backgroundColor: '#1f2937', 
        scale: 2 
    }).then(function(canvas) {
        if (printTitle) printTitle.style.display = 'none';

        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('💾 ¡Imagen descargada de forma exitosa en tu dispositivo!');
    }).catch(function(err) {
        if (printTitle) printTitle.style.display = 'none';
        showNotification('❌ Error local al generar el archivo gráfico.');
        console.error(err);
    });
}
