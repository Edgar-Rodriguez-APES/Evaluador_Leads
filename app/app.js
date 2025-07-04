document.addEventListener('DOMContentLoaded', function () {
  // ▼▼▼ ¡MUY IMPORTANTE! PEGA AQUÍ LA URL DE TU WEB APP DE GOOGLE ▼▼▼
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwyft49tePPwolLjjNsTkql44DrOOwynaYL7b4Uz_iEzpcJHTwgwG3eGpCkTeTEtXHjFA/exec
';

  const form = document.getElementById('evaluadorForm');
  const resultadoDiv = document.getElementById('resultado');

  // Inicializa el cliente de la app de Freshworks
  app.initialized().then(function(_client) {
    window.client = _client; // Hacemos el cliente accesible

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      resultadoDiv.innerHTML = `<fw-spinner size="large"></fw-spinner>`;
      
      // 1. OBTENER DATOS DEL USUARIO LOGUEADO
      client.data.get('loggedInUser').then(function(userData) {
        
        const distribuidor = userData.loggedInUser.agent.group_names[0] || 'Sin Grupo';
        const vendedor = userData.loggedInUser.contact.name;

        // 2. Recolectar datos del formulario
        const datosFormulario = {
          empresa: document.getElementById('empresa').value,
          contacto: document.getElementById('contacto').value,
          industria: document.getElementById('industria').value,
          ingresos: parseFloat(document.getElementById('ingresos').value) || 0,
          empleados: parseInt(document.getElementById('empleados').value) || 0,
          crecimiento: parseFloat(document.getElementById('crecimiento').value) || 0,
          presupuesto: parseFloat(document.getElementById('presupuesto').value) || 0,
          antiguedad: parseInt(document.getElementById('antiguedad').value) || 0
        };

        // 3. Calcular potencial
        const potencial = calcularPotencial(datosFormulario);

        // 4. COMBINAR TODOS LOS DATOS para el envío
        const datosParaEnviar = {
          ...datosFormulario,
          distribuidor: distribuidor,
          vendedor: vendedor,
          potencial: potencial
        };
        
        // 5. Enviar todo a Google Sheets
        client.request.post(GOOGLE_SCRIPT_URL, {
          body: JSON.stringify(datosParaEnviar)
        }).then(
          function(response) {
            console.log("Respuesta del script:", response);
            mostrarResultado(potencial, "¡Datos guardados con éxito!");
          },
          function(error) {
            console.error("Error al guardar:", error);
            mostrarResultado("Error", "No se pudieron guardar los datos. Revisa la consola.");
          }
        );

      }).catch(function(error) {
        console.error('Error obteniendo datos del usuario:', error);
        mostrarResultado("Error", "No se pudo identificar al vendedor.");
      });
    });
  });
});

// --- El resto de las funciones (calcularPotencial, mostrarResultado) permanecen igual ---

function calcularPotencial(datos) {
  switch (datos.industria) {
    case 'tecnologia':
      if (datos.ingresos > 500000 && datos.crecimiento > 15) return 'Alto';
      else if (datos.ingresos > 100000) return 'Medio';
      else return 'Bajo';
    case 'retail':
      if (datos.presupuesto > 20000 && datos.empleados > 50) return 'Alto';
      else if (datos.presupuesto > 5000) return 'Medio';
      else return 'Bajo';
    default: return 'Bajo';
  }
}

function mostrarResultado(potencial, mensajeAdicional = "") {
  const resultadoDiv = document.getElementById('resultado');
  let color = 'grey';
  let mensaje = `Potencial: <strong>${potencial}</strong>. ${mensajeAdicional}`;

  if (potencial === 'Alto') color = 'green';
  if (potencial === 'Medio') color = 'orange';
  if (potencial === 'Bajo') color = 'red';
  
  resultadoDiv.innerHTML = `<fw-label value="${mensaje}" color="${color}"></fw-label>`;
}
