document.addEventListener('DOMContentLoaded', function () {
    // ▼▼▼ PEGA AQUÍ TU URL DE GOOGLE APPS SCRIPT ▼▼▼
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxczdNAxo7bxq2G6FxyNLVs3-USySTXaAIRAWcYd33suPLByr-Xde4CH8viUaE17iNsQ/exec';

    const form = document.getElementById('evaluatorForm');
    const alertMessageDiv = document.getElementById('alert-message');
    const resultsDiv = document.getElementById('results');

// --- NUEVA FUNCIÓN PARA FORMATEAR MONEDA ---
    // Formatea números a un estilo de moneda USD sin decimales.
    function formatCurrency(number) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(number);
    }
    
    const benchmarks = {
        manufactura: { rotationMin: 6, rotationMax: 12, inventoryRatio: 25, maxLoss: 3, name: "Manufactura" },
        logistica: { rotationMin: 12, rotationMax: 24, inventoryRatio: 20, maxLoss: 2, name: "Logística" },
        retail: { rotationMin: 8, rotationMax: 15, inventoryRatio: 15, maxLoss: 4, name: "Retail" },
        salud: { rotationMin: 4, rotationMax: 8, inventoryRatio: 20, maxLoss: 2, name: "Salud" },
        mineria: { rotationMin: 3, rotationMax: 6, inventoryRatio: 30, maxLoss: 5, name: "Minería/Oil & Gas" }
    };

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        try {
            const industry = document.getElementById('industry').value;
            if (!industry) {
                showAlert('Por favor seleccione una industria.', 'alert-danger');
                return;
            }
            
            // 2. Calcular todo
            const calculatedData = calculateAll();
            
            // --- INICIO DE LA CORRECCIÓN ---
            // Añadimos un console.log para ver los datos calculados.
            console.log("Datos calculados:", calculatedData);
            
            // 3. Mostrar resultados en la UI, pasando el objeto correcto.
            displayResults(calculatedData.display);
            
            // 4. Enviar datos a Google Sheets
            fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(calculatedData.forSheet),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }
            })
            // --- FIN DE LA CORRECCIÓN ---
            .then(response => response.json().catch(() => ({})))
            .then(res => {
                console.log('Respuesta de Google Sheets:', res);
                showAlert('Solicitud de guardado enviada.', 'alert-success');
            })
            .catch(error => {
                console.error('Error de red al enviar a Google Sheets:', error);
                showAlert('Error de red al guardar los datos.', 'alert-danger');
            });

        } catch (error) {
            console.error("Error durante el cálculo:", error);
            showAlert(`Ocurrió un error: ${error.message}. Revisa que todos los campos estén llenos.`, 'alert-danger');
        }
    });

    function calculateAll() {
        const clientName = document.getElementById('clientName').value;
        const industry = document.getElementById('industry').value;
        const evaluator = document.getElementById('evaluator').value;
        const annualSales = parseFloat(document.getElementById('annualSales').value) || 0;
        const cogs = parseFloat(document.getElementById('cogs').value) || 0;
        const inventory = parseFloat(document.getElementById('inventory').value) || 0;
        const obsolete = parseFloat(document.getElementById('obsolete').value) || 0;
        const previousSales = parseFloat(document.getElementById('previousSales').value) || 0;
        const previousInventory = parseFloat(document.getElementById('previousInventory').value) || 0;

        if (annualSales === 0 || cogs === 0 || inventory === 0) {
            throw new Error("Ventas, Costo de Ventas e Inventarios son obligatorios para el cálculo.");
        }
        
        const rotation = cogs / inventory;
        const salesGrowth = previousSales > 0 ? ((annualSales - previousSales) / previousSales) * 100 : 0;
        const inventoryGrowth = previousInventory > 0 ? ((inventory - previousInventory) / previousInventory) * 100 : 0;
        const inventoryRatio = (inventory / annualSales) * 100;
        const lossRatio = (obsolete / inventory) * 100;
        const benchmark = benchmarks[industry];
        
        let scores = { rotation: 0, growth: 0, ratio: 0, loss: 0 };
        if (rotation < benchmark.rotationMin) scores.rotation = 5; else if (rotation < benchmark.rotationMax) scores.rotation = 3; else scores.rotation = 1;
        if (inventoryGrowth - salesGrowth > 20) scores.growth = 4; else if (inventoryGrowth - salesGrowth > 10) scores.growth = 2;
        if (inventoryRatio > benchmark.inventoryRatio) scores.ratio = 4; else if (inventoryRatio > benchmark.inventoryRatio * 0.8) scores.ratio = 2;
        if (lossRatio > benchmark.maxLoss) scores.loss = 3; else if (lossRatio > benchmark.maxLoss * 0.7) scores.loss = 2;
        const totalScore = scores.rotation + scores.growth + scores.ratio + scores.loss;

        let finalEvaluation = '';
        if (totalScore >= 15) finalEvaluation = 'CLIENTE PRIORITARIO';
        else if (totalScore >= 10) finalEvaluation = 'BUEN POTENCIAL';
        else if (totalScore >= 5) finalEvaluation = 'POTENCIAL MODERADO';
        else finalEvaluation = 'EVALUAR OTROS FACTORES';

        return {
            display: { rotation, salesGrowth, inventoryGrowth, inventoryRatio, lossRatio, totalScore, finalEvaluation, benchmark },
            forSheet: { evaluator, clientName, industry: benchmark.name, annualSales, cogs, inventory, obsolete, rotation: rotation.toFixed(2), salesGrowth: salesGrowth.toFixed(2), inventoryGrowth: inventoryGrowth.toFixed(2), inventoryRatio: inventoryRatio.toFixed(2), totalScore, finalEvaluation }
        };
    }

    function displayResults(displayData) { // El parámetro ahora se llama displayData para mayor claridad
        const resultsDiv = document.getElementById('results');
        const indicatorsDiv = document.getElementById('indicators');
        const finalScoreDiv = document.getElementById('finalScore');
        indicatorsDiv.innerHTML = ''; 

        const indicatorsData = [
            { title: 'Rotación de Inventarios', value: displayData.rotation.toFixed(1) + 'x', status: displayData.rotation < displayData.benchmark.rotationMin ? 'high' : displayData.rotation < displayData.benchmark.rotationMax ? 'medium' : 'low' },
            { title: 'Crecimiento Inventarios vs Ventas', value: (displayData.inventoryGrowth - displayData.salesGrowth).toFixed(1) + '%', status: (displayData.inventoryGrowth - displayData.salesGrowth) > 20 ? 'high' : (displayData.inventoryGrowth - displayData.salesGrowth) > 10 ? 'medium' : 'low' },
            { title: 'Inventarios/Ventas Ratio', value: displayData.inventoryRatio.toFixed(1) + '%', status: displayData.inventoryRatio > displayData.benchmark.inventoryRatio ? 'high' : displayData.inventoryRatio > displayData.benchmark.inventoryRatio * 0.8 ? 'medium' : 'low' },
            { title: 'Pérdidas por Obsoletos', value: displayData.lossRatio.toFixed(1) + '%', status: displayData.lossRatio > displayData.benchmark.maxLoss ? 'high' : displayData.lossRatio > displayData.benchmark.maxLoss * 0.7 ? 'medium' : 'low' }
        ];

        indicatorsData.forEach(ind => {
            const statusText = ind.status === 'high' ? 'ALTO POTENCIAL' : ind.status === 'medium' ? 'POTENCIAL MEDIO' : 'BAJO POTENCIAL';
            indicatorsDiv.innerHTML += `<div class="indicator"><div class="indicator-header"><span class="indicator-title">${ind.title}</span><span class="indicator-value">${ind.value}</span></div><div class="indicator-status status-${ind.status}">${statusText}</div></div>`;
        });

        finalScoreDiv.innerHTML = `<h3>Puntuación Total: ${displayData.totalScore}/16</h3><p>${displayData.finalEvaluation}</p>`;
        resultsDiv.classList.add('show');
    }
    
    function showAlert(message, type) {
        alertMessageDiv.textContent = message;
        alertMessageDiv.className = `alert ${type}`;
        alertMessageDiv.style.display = 'block';
        setTimeout(() => {
            alertMessageDiv.style.display = 'none';
        }, 5000);
    }
});
