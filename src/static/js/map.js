// JavaScript para o mapa interativo de risco de incêndio

// Variáveis globais
let map;
let drawnRectangle;
let currentMapType = 'risk'; // 'risk' ou 'heat'
let riskMapLayer = null;
let heatMapLayer = null;
let drawControl = null;

// Inicializar o mapa quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    setupEventListeners();
});

// Inicializar o mapa Leaflet
function initMap() {
    // Criar mapa centrado em Portugal
    map = L.map('map').setView([39.5, -8.0], 6);
    
    // Adicionar camada de mapa base
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Inicializar o plugin de desenho
    initDrawControl();
    
    // Adicionar escala ao mapa
    L.control.scale().addTo(map);
}

// Inicializar o controle de desenho
function initDrawControl() {
    // Criar um novo FeatureGroup para armazenar as camadas editáveis
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    
    // Configurar as opções do controle de desenho
    drawControl = new L.Control.Draw({
        draw: {
            polyline: false,
            polygon: false,
            circle: false,
            circlemarker: false,
            marker: false,
            rectangle: {
                shapeOptions: {
                    color: '#FF5722',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.2
                }
            }
        },
        edit: {
            featureGroup: drawnItems,
            remove: true
        }
    });
    
    // Adicionar o controle de desenho ao mapa
    map.addControl(drawControl);
    
    // Evento para capturar a área desenhada
    map.on('draw:created', function(e) {
        // Remover retângulos anteriores
        drawnItems.clearLayers();
        
        // Guardar o novo retângulo
        drawnRectangle = e.layer;
        drawnItems.addLayer(drawnRectangle);
        
        // Obter limites do retângulo
        const bounds = drawnRectangle.getBounds();
        
        // Mostrar indicador de carregamento
        document.getElementById('loadingIndicator').classList.remove('d-none');
        document.getElementById('regionDetails').innerHTML = '';
        
        // Enviar dados para o backend
        fetchRiskDataForRegion(bounds);
    });
    
    // Evento para quando um retângulo é editado
    map.on('draw:edited', function(e) {
        const layers = e.layers;
        layers.eachLayer(function(layer) {
            drawnRectangle = layer;
            const bounds = drawnRectangle.getBounds();
            
            // Mostrar indicador de carregamento
            document.getElementById('loadingIndicator').classList.remove('d-none');
            document.getElementById('regionDetails').innerHTML = '';
            
            // Enviar dados para o backend
            fetchRiskDataForRegion(bounds);
        });
    });
    
    // Evento para quando um retângulo é removido
    map.on('draw:deleted', function(e) {
        drawnRectangle = null;
        document.getElementById('regionDetails').innerHTML = `
            <p class="text-muted text-center my-4">Selecione uma região no mapa para ver os detalhes.</p>
        `;
    });
}

// Configurar event listeners para os botões
function setupEventListeners() {
    document.getElementById('viewRiskMap').addEventListener('click', function() {
        currentMapType = 'risk';
        updateMapView();
        this.classList.add('active');
        document.getElementById('viewHeatMap').classList.remove('active');
    });
    
    document.getElementById('viewHeatMap').addEventListener('click', function() {
        currentMapType = 'heat';
        updateMapView();
        this.classList.add('active');
        document.getElementById('viewRiskMap').classList.remove('active');
    });
    
    // Adicionar botão de ajuda para desenhar
    document.getElementById('helpDrawButton').addEventListener('click', function() {
        showDrawHelp();
    });
}

// Mostrar ajuda para desenhar
function showDrawHelp() {
    const helpModal = new bootstrap.Modal(document.getElementById('drawHelpModal'));
    helpModal.show();
}

// Atualizar a visualização do mapa com base no tipo selecionado
function updateMapView() {
    // Se não houver dados, não fazer nada
    if (!riskMapLayer && !heatMapLayer) return;
    
    // Remover camadas existentes
    if (riskMapLayer) map.removeLayer(riskMapLayer);
    if (heatMapLayer) map.removeLayer(heatMapLayer);
    
    // Adicionar a camada apropriada
    if (currentMapType === 'risk' && riskMapLayer) {
        riskMapLayer.addTo(map);
    } else if (currentMapType === 'heat' && heatMapLayer) {
        heatMapLayer.addTo(map);
    }
}

// Buscar dados de risco para a região selecionada
function fetchRiskDataForRegion(bounds) {
    const data = {
        bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        },
        grid_size: 5 // Tamanho da grade para amostragem
    };
    
    fetch('/api/risk/region', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao obter dados de risco');
        }
        return response.json();
    })
    .then(data => {
        // Ocultar indicador de carregamento
        document.getElementById('loadingIndicator').classList.add('d-none');
        
        // Processar e exibir os dados
        displayRiskData(data);
        createRiskMapLayer(data);
        createHeatMapLayer(data);
        
        // Atualizar visualização do mapa
        updateMapView();
    })
    .catch(error => {
        console.error('Erro:', error);
        document.getElementById('loadingIndicator').classList.add('d-none');
        document.getElementById('regionDetails').innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Erro ao obter dados de risco. Por favor, tente novamente.
            </div>
        `;
    });
}

// Exibir dados de risco na interface
function displayRiskData(data) {
    // Determinar a classe CSS para a categoria de risco
    let riskClass;
    switch (data.fire_risk.category) {
        case 'muito_baixo':
            riskClass = 'risk-very-low';
            break;
        case 'baixo':
            riskClass = 'risk-low';
            break;
        case 'moderado':
            riskClass = 'risk-moderate';
            break;
        case 'alto':
            riskClass = 'risk-high';
            break;
        case 'muito_alto':
            riskClass = 'risk-very-high';
            break;
        default:
            riskClass = '';
    }
    
    // Formatar as coordenadas do centro
    const centerLat = data.region.center.lat.toFixed(4);
    const centerLon = data.region.center.lon.toFixed(4);
    
    // Construir HTML para exibir os detalhes
    const html = `
        <h4 class="mb-3">Região Selecionada</h4>
        <p><strong>Centro:</strong> ${centerLat}, ${centerLon}</p>
        
        <div class="mb-3">
            <h5>Índice de Risco de Incêndio</h5>
            <div class="d-flex align-items-center">
                <div class="progress flex-grow-1 me-2" style="height: 25px;">
                    <div class="progress-bar" role="progressbar" 
                         style="width: ${data.fire_risk.average_index}%; background-color: ${data.fire_risk.color};" 
                         aria-valuenow="${data.fire_risk.average_index}" aria-valuemin="0" aria-valuemax="100">
                        ${data.fire_risk.average_index.toFixed(1)}
                    </div>
                </div>
            </div>
            <p class="mt-2">
                <span class="risk-indicator ${riskClass}">
                    ${data.fire_risk.category.replace('_', ' ').toUpperCase()}
                </span>
            </p>
        </div>
        
        <div class="mb-3">
            <h5>Análise de Risco</h5>
            <p>${data.fire_risk.description}</p>
        </div>
        
        <div class="alert alert-warning" role="alert">
            <i class="fas fa-info-circle me-2"></i>
            Esta análise é baseada em dados meteorológicos atuais e deve ser usada apenas como referência.
        </div>
    `;
    
    document.getElementById('regionDetails').innerHTML = html;
}

// Criar camada de mapa de risco
function createRiskMapLayer(data) {
    // Limpar camada anterior
    if (riskMapLayer) {
        map.removeLayer(riskMapLayer);
    }
    
    // Criar nova camada
    riskMapLayer = L.layerGroup();
    
    // Adicionar marcadores para cada ponto de risco
    data.fire_risk.points.forEach(point => {
        L.circleMarker([point.lat, point.lon], {
            radius: 8,
            color: point.color,
            fillColor: point.color,
            fillOpacity: 0.7,
            weight: 1
        }).bindPopup(`
            <strong>Risco de Incêndio:</strong> ${point.risk_index.toFixed(1)}<br>
            <strong>Categoria:</strong> ${point.risk_category.replace('_', ' ')}
        `).addTo(riskMapLayer);
    });
}

// Criar camada de mapa de calor
function createHeatMapLayer(data) {
    // Limpar camada anterior
    if (heatMapLayer) {
        map.removeLayer(heatMapLayer);
    }
    
    // Preparar dados para o mapa de calor
    const heatData = data.fire_risk.points.map(point => {
        return [point.lat, point.lon, point.risk_index / 100]; // Normalizar para 0-1
    });
    
    // Criar nova camada de mapa de calor
    heatMapLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        gradient: {
            0.0: '#3CB371', // Verde (muito baixo)
            0.2: '#ADFF2F', // Verde amarelado (baixo)
            0.4: '#FFD700', // Amarelo (moderado)
            0.6: '#FF8C00', // Laranja (alto)
            0.8: '#FF0000'  // Vermelho (muito alto)
        }
    });
}
