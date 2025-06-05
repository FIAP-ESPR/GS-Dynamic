// JavaScript para o dashboard de risco de incêndio

// Variáveis globais
let currentData = null;
let riskFactorsChart = null;
let regionalComparisonChart = null;
let heatmap = null;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    setupFormListeners();
});

// Configurar event listeners para os formulários
function setupFormListeners() {
    // Formulário de pesquisa por cidade
    document.getElementById('locationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const city = document.getElementById('cityInput').value.trim();
        const country = document.getElementById('countryInput').value.trim();
        
        if (!city) {
            alert('Por favor, insira o nome da cidade.');
            return;
        }
        
        // Mostrar seção de resultados
        document.getElementById('resultSection').classList.remove('d-none');
        
        // Obter valores de raio e pontos do outro formulário
        const radius = document.getElementById('radiusInput').value.trim();
        const numPoints = document.getElementById('pointsInput').value.trim();
        
        // Construir URL para a API
        let url = `/api/risk/location?city=${encodeURIComponent(city)}`;
        if (country) {
            url += `&country=${encodeURIComponent(country)}`;
        }
        url += `&radius=${radius}&num_points=${numPoints}`;
        
        // Buscar dados
        fetchRiskData(url);
    });
    
    // Formulário de pesquisa por coordenadas
    document.getElementById('coordinatesForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const lat = document.getElementById('latInput').value.trim();
        const lon = document.getElementById('lonInput').value.trim();
        const radius = document.getElementById('radiusInput').value.trim();
        const numPoints = document.getElementById('pointsInput').value.trim();
        
        if (!lat || !lon) {
            alert('Por favor, insira valores válidos para latitude e longitude.');
            return;
        }
        
        // Mostrar seção de resultados
        document.getElementById('resultSection').classList.remove('d-none');
        
        // Buscar dados de localização primeiro para garantir que temos dados básicos
        fetchLocationData(lat, lon, radius, numPoints);
    });
}

// Buscar dados de localização específica
function fetchLocationData(lat, lon, radius, numPoints) {
    // Construir URL para a API de localização
    const locationUrl = `/api/risk/location?lat=${lat}&lon=${lon}`;
    
    fetch(locationUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao obter dados de localização');
            }
            return response.json();
        })
        .then(data => {
            // Exibir dados básicos
            displayWeatherData(data);
            displayRiskData(data);
            
            // Agora buscar dados regionais
            fetchRegionalData(lat, lon, radius, numPoints);
        })
        .catch(error => {
            console.error('Erro ao obter dados de localização:', error);
            document.getElementById('weatherData').innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Erro ao obter dados de localização. Por favor, tente novamente.
                </div>
            `;
            document.getElementById('riskData').innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Erro ao obter dados de localização. Por favor, tente novamente.
                </div>
            `;
        });
}

// Buscar dados de risco regional
function fetchRegionalData(lat, lon, radius, numPoints) {
    // Construir URL para a API regional
    const url = `/api/risk/regional?lat=${lat}&lon=${lon}&radius=${radius}&num_points=${numPoints}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || 'Erro ao obter dados regionais');
                });
            }
            return response.json();
        })
        .then(data => {
            // Guardar dados
            currentData = data;
            
            try {
                // Tentar criar o heatmap
                createHeatmap(data, lat, lon);
            } catch (heatmapError) {
                console.error('Erro ao criar heatmap:', heatmapError);
                document.getElementById('heatmap').innerHTML = `
                    <div class="alert alert-warning m-3" role="alert">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Não foi possível criar o mapa de calor. Dados regionais disponíveis em formato de tabela.
                    </div>
                `;
            }
            
            try {
                // Tentar criar gráficos
                createRiskFactorsChart(data.center);
                createRegionalComparisonChart(data);
            } catch (chartError) {
                console.error('Erro ao criar gráficos:', chartError);
            }
            
            try {
                // Tentar exibir visualização do grafo
                displayGraphVisualization(data);
            } catch (graphError) {
                console.error('Erro ao exibir grafo:', graphError);
                document.getElementById('graphVisualization').innerHTML = `
                    <div class="alert alert-warning" role="alert">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Não foi possível gerar a visualização do grafo.
                    </div>
                `;
            }
            
            try {
                // Tentar exibir dados comparativos
                displayComparisonData(data);
            } catch (comparisonError) {
                console.error('Erro ao exibir dados comparativos:', comparisonError);
                document.getElementById('comparisonData').innerHTML = `
                    <div class="alert alert-warning" role="alert">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Não foi possível exibir dados comparativos.
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            document.getElementById('heatmap').innerHTML = `
                <div class="alert alert-danger m-3" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${error.message || 'Erro ao obter dados regionais. Por favor, tente novamente.'}
                </div>
            `;
            
            // Exibir mensagens de erro nos outros componentes
            document.getElementById('graphVisualization').innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Dados regionais não disponíveis.
                </div>
            `;
            
            document.getElementById('comparisonData').innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Dados comparativos não disponíveis.
                </div>
            `;
        });
}

// Buscar dados de risco para uma localização específica
function fetchRiskData(url) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.error || 'Erro ao obter dados');
                });
            }
            return response.json();
        })
        .then(data => {
            // Guardar dados
            currentData = data;
            
            // Se temos dados de centro, exibir
            if (data.center) {
                displayWeatherData(data.center);
                displayRiskData(data.center);
                
                try {
                    // Tentar criar o heatmap
                    createHeatmap(data, data.center.location.coordinates[0], data.center.location.coordinates[1]);
                } catch (heatmapError) {
                    console.error('Erro ao criar heatmap:', heatmapError);
                }
                
                try {
                    // Tentar criar gráficos
                    createRiskFactorsChart(data.center);
                    createRegionalComparisonChart(data);
                } catch (chartError) {
                    console.error('Erro ao criar gráficos:', chartError);
                }
                
                try {
                    // Tentar exibir visualização do grafo
                    displayGraphVisualization(data);
                } catch (graphError) {
                    console.error('Erro ao exibir grafo:', graphError);
                }
                
                try {
                    // Tentar exibir dados comparativos
                    displayComparisonData(data);
                } catch (comparisonError) {
                    console.error('Erro ao exibir dados comparativos:', comparisonError);
                }
            } else {
                // Dados no formato antigo
                displayWeatherData(data);
                displayRiskData(data);
                
                // Buscar dados regionais usando as coordenadas obtidas
                const lat = data.location.coordinates[0];
                const lon = data.location.coordinates[1];
                const radius = document.getElementById('radiusInput').value.trim();
                const numPoints = document.getElementById('pointsInput').value.trim();
                
                fetchRegionalData(lat, lon, radius, numPoints);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            document.getElementById('weatherData').innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${error.message || 'Erro ao obter dados. Por favor, tente novamente.'}
                </div>
            `;
            document.getElementById('riskData').innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${error.message || 'Erro ao obter dados. Por favor, tente novamente.'}
                </div>
            `;
        });
}

// Exibir dados meteorológicos
function displayWeatherData(data) {
    const weather = data.weather;
    const location = data.location;
    
    // Determinar ícone com base na descrição do clima
    let weatherIcon = 'fa-cloud';
    const description = weather.description ? weather.description.toLowerCase() : '';
    
    if (description.includes('sol') || description.includes('limpo') || description.includes('céu claro')) {
        weatherIcon = 'fa-sun';
    } else if (description.includes('nuvem') || description.includes('nublado')) {
        weatherIcon = 'fa-cloud';
    } else if (description.includes('chuva') || description.includes('chuvisco')) {
        weatherIcon = 'fa-cloud-rain';
    } else if (description.includes('trovoada')) {
        weatherIcon = 'fa-bolt';
    } else if (description.includes('neve')) {
        weatherIcon = 'fa-snowflake';
    } else if (description.includes('nevoeiro') || description.includes('neblina')) {
        weatherIcon = 'fa-smog';
    }
    
    // Obter nome da localização
    const locationName = location.name || 'Localização';
    
    // Obter coordenadas
    let coordinates = [0, 0];
    if (Array.isArray(location.coordinates)) {
        coordinates = location.coordinates;
    } else if (location.lat !== undefined && location.lon !== undefined) {
        coordinates = [location.lat, location.lon];
    }
    
    // Construir HTML
    const html = `
        <div class="text-center mb-4">
            <i class="fas ${weatherIcon} fa-4x text-primary"></i>
            <h3 class="mt-3">${locationName}</h3>
            <p class="text-muted">${coordinates[0].toFixed(4)}, ${coordinates[1].toFixed(4)}</p>
        </div>
        
        <div class="row">
            <div class="col-6">
                <div class="mb-3">
                    <h5>Temperatura</h5>
                    <p class="display-6">${weather.temperature.toFixed(1)}°C</p>
                </div>
            </div>
            <div class="col-6">
                <div class="mb-3">
                    <h5>Humidade</h5>
                    <p class="display-6">${weather.humidity}%</p>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-6">
                <div class="mb-3">
                    <h5>Vento</h5>
                    <p class="display-6">${weather.wind_speed.toFixed(1)} m/s</p>
                </div>
            </div>
            <div class="col-6">
                <div class="mb-3">
                    <h5>Precipitação</h5>
                    <p class="display-6">${weather.precipitation.toFixed(1)} mm</p>
                </div>
            </div>
        </div>
        
        <p class="mt-3">
            <strong>Descrição:</strong> ${weather.description || 'Não disponível'}
        </p>
    `;
    
    document.getElementById('weatherData').innerHTML = html;
}

// Exibir dados de risco de incêndio
function displayRiskData(data) {
    const risk = data.fire_risk;
    
    // Determinar a classe CSS para a categoria de risco
    let riskClass;
    switch (risk.category) {
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
    
    // Construir HTML
    const html = `
        <div class="text-center mb-4">
            <div class="risk-indicator ${riskClass} px-4 py-2">
                <h3 class="mb-0">${risk.category.replace('_', ' ').toUpperCase()}</h3>
            </div>
            <p class="display-4 mt-3">${risk.index.toFixed(1)}</p>
        </div>
        
        <div class="progress mb-3" style="height: 25px;">
            <div class="progress-bar" role="progressbar" 
                 style="width: ${risk.index}%; background-color: ${risk.color};" 
                 aria-valuenow="${risk.index}" aria-valuemin="0" aria-valuemax="100">
            </div>
        </div>
        
        <div class="alert alert-secondary mt-4">
            <h5>Análise de Risco</h5>
            <p>${risk.description}</p>
        </div>
        
        <div class="alert alert-warning mt-3" role="alert">
            <i class="fas fa-info-circle me-2"></i>
            Esta análise é baseada em dados meteorológicos atuais e deve ser usada apenas como referência.
        </div>
    `;
    
    document.getElementById('riskData').innerHTML = html;
}

// Criar mapa de calor
function createHeatmap(data, centerLat, centerLon) {
    // Verificar se temos dados válidos
    if (!data || !centerLat || !centerLon) {
        throw new Error('Dados insuficientes para criar o mapa de calor');
    }
    
    // Destruir mapa anterior, se existir
    if (heatmap) {
        heatmap.remove();
    }
    
    // Inicializar mapa
    heatmap = L.map('heatmap').setView([centerLat, centerLon], 9);
    
    // Adicionar camada de mapa base
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(heatmap);
    
    // Verificar se temos dados de centro
    if (data.center) {
        // Adicionar marcador para o ponto central
        L.circleMarker([centerLat, centerLon], {
            radius: 10,
            color: data.center.fire_risk.color,
            fillColor: data.center.fire_risk.color,
            fillOpacity: 0.8,
            weight: 2
        }).bindPopup(`
            <strong>${data.center.location || 'Centro'}</strong><br>
            Risco: ${data.center.fire_risk.index.toFixed(1)}<br>
            Categoria: ${data.center.fire_risk.category.replace('_', ' ')}
        `).addTo(heatmap);
        
        // Preparar dados para o mapa de calor
        const heatData = [];
        
        // Adicionar ponto central com intensidade maior
        heatData.push([centerLat, centerLon, data.center.fire_risk.index / 50]); // Intensidade dobrada
        
        // Verificar se temos dados de vizinhos
        if (data.neighbors && data.neighbors.nodes) {
            // Adicionar pontos vizinhos
            data.neighbors.nodes.forEach(node => {
                if (node.lat && node.lon) {
                    heatData.push([node.lat, node.lon, node.fire_risk.index / 100]);
                    
                    // Adicionar marcadores para os pontos vizinhos
                    L.circleMarker([node.lat, node.lon], {
                        radius: 6,
                        color: node.fire_risk.color,
                        fillColor: node.fire_risk.color,
                        fillOpacity: 0.6,
                        weight: 1
                    }).bindPopup(`
                        <strong>${node.location || 'Vizinho'}</strong><br>
                        Risco: ${node.fire_risk.index.toFixed(1)}<br>
                        Categoria: ${node.fire_risk.category.replace('_', ' ')}
                    `).addTo(heatmap);
                }
            });
        }
        
        // Criar camada de mapa de calor
        if (heatData.length > 0) {
            L.heatLayer(heatData, {
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
            }).addTo(heatmap);
        }
    }
}

// Criar gráfico de fatores de risco
function createRiskFactorsChart(data) {
    // Verificar se temos dados válidos
    if (!data || !data.weather) {
        throw new Error('Dados insuficientes para criar o gráfico de fatores de risco');
    }
    
    // Destruir gráfico anterior, se existir
    if (riskFactorsChart) {
        riskFactorsChart.destroy();
    }
    
    // Obter contexto do canvas
    const ctx = document.getElementById('riskFactorsChart').getContext('2d');
    
    // Calcular valores normalizados para os fatores
    const weather = data.weather;
    const tempFactor = Math.min(100, Math.max(0, (weather.temperature - 5) * 4));
    const humidityFactor = Math.min(100, Math.max(0, 100 - weather.humidity));
    const windFactor = Math.min(100, Math.max(0, weather.wind_speed * 10));
    const rainFactor = Math.min(100, Math.max(0, 100 - (weather.precipitation * 20)));
    
    // Criar gráfico
    riskFactorsChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Temperatura', 'Humidade', 'Vento', 'Precipitação'],
            datasets: [{
                label: 'Fatores de Risco (%)',
                data: [tempFactor, humidityFactor, windFactor, rainFactor],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgb(255, 99, 132)',
                pointBackgroundColor: 'rgb(255, 99, 132)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(255, 99, 132)'
            }]
        },
        options: {
            elements: {
                line: {
                    borderWidth: 3
                }
            },
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Fatores de Risco para ' + (data.location ? data.location.name || 'Local' : 'Local')
                }
            }
        }
    });
}

// Criar gráfico de comparação regional
function createRegionalComparisonChart(data) {
    // Verificar se temos dados válidos
    if (!data || !data.center || !data.neighbors || !data.neighbors.average) {
        throw new Error('Dados insuficientes para criar o gráfico de comparação regional');
    }
    
    // Destruir gráfico anterior, se existir
    if (regionalComparisonChart) {
        regionalComparisonChart.destroy();
    }
    
    // Obter contexto do canvas
    const ctx = document.getElementById('regionalComparisonChart').getContext('2d');
    
    // Preparar dados para o gráfico
    const centerData = [
        data.center.weather.temperature,
        data.center.weather.humidity,
        data.center.weather.wind_speed,
        data.center.weather.precipitation,
        data.center.fire_risk.index
    ];
    
    const neighborData = [
        data.neighbors.average.temperature,
        data.neighbors.average.humidity,
        data.neighbors.average.wind_speed,
        data.neighbors.average.precipitation,
        data.neighbors.average.risk_index
    ];
    
    // Criar gráfico
    regionalComparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Temperatura (°C)', 'Humidade (%)', 'Vento (m/s)', 'Precipitação (mm)', 'Índice de Risco'],
            datasets: [
                {
                    label: data.center.location || 'Local',
                    data: centerData,
                    backgroundColor: data.center.fire_risk.color,
                    borderColor: 'rgba(0, 0, 0, 0.2)',
                    borderWidth: 1
                },
                {
                    label: 'Média Regional',
                    data: neighborData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Comparação entre ' + (data.center.location || 'Local') + ' e Região'
                }
            }
        }
    });
}

// Exibir visualização do grafo
function displayGraphVisualization(data) {
    // Verificar se temos dados de grafo
    if (!data || !data.graph_image) {
        throw new Error('Dados de grafo não disponíveis');
    }
    
    // Exibir imagem do grafo
    const html = `
        <img src="data:image/png;base64,${data.graph_image}" alt="Grafo de Análise Regional" class="img-fluid">
    `;
    
    document.getElementById('graphVisualization').innerHTML = html;
}

// Exibir dados comparativos
function displayComparisonData(data) {
    // Verificar se temos dados comparativos
    if (!data || !data.comparison || !data.center || !data.neighbors) {
        throw new Error('Dados comparativos não disponíveis');
    }
    
    const comparison = data.comparison;
    
    // Formatar diferenças com sinal e cor
    const formatDiff = (value, invert = false) => {
        const sign = value >= 0 ? '+' : '';
        const color = invert ? (value >= 0 ? 'danger' : 'success') : (value >= 0 ? 'success' : 'danger');
        return `<span class="text-${color}">${sign}${value.toFixed(2)}</span>`;
    };
    
    // Construir HTML
    const html = `
        <div class="table-responsive">
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Parâmetro</th>
                        <th>${data.center.location || 'Local'}</th>
                        <th>Média Regional</th>
                        <th>Diferença</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Temperatura (°C)</td>
                        <td>${data.center.weather.temperature.toFixed(1)}</td>
                        <td>${data.neighbors.average.temperature.toFixed(1)}</td>
                        <td>${formatDiff(comparison.temperature_diff)}</td>
                    </tr>
                    <tr>
                        <td>Humidade (%)</td>
                        <td>${data.center.weather.humidity.toFixed(1)}</td>
                        <td>${data.neighbors.average.humidity.toFixed(1)}</td>
                        <td>${formatDiff(comparison.humidity_diff, true)}</td>
                    </tr>
                    <tr>
                        <td>Vento (m/s)</td>
                        <td>${data.center.weather.wind_speed.toFixed(1)}</td>
                        <td>${data.neighbors.average.wind_speed.toFixed(1)}</td>
                        <td>${formatDiff(comparison.wind_speed_diff)}</td>
                    </tr>
                    <tr>
                        <td>Precipitação (mm)</td>
                        <td>${data.center.weather.precipitation.toFixed(1)}</td>
                        <td>${data.neighbors.average.precipitation.toFixed(1)}</td>
                        <td>${formatDiff(comparison.precipitation_diff, true)}</td>
                    </tr>
                    <tr class="table-active">
                        <td><strong>Índice de Risco</strong></td>
                        <td><strong>${data.center.fire_risk.index.toFixed(1)}</strong></td>
                        <td><strong>${data.neighbors.average.risk_index.toFixed(1)}</strong></td>
                        <td><strong>${formatDiff(comparison.risk_index_diff)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="alert alert-info mt-3">
            <i class="fas fa-info-circle me-2"></i>
            <strong>Interpretação:</strong> Valores positivos indicam que ${data.center.location || 'o local selecionado'} tem valores mais altos que a média regional.
            Para humidade e precipitação, valores negativos são geralmente mais críticos para o risco de incêndio.
        </div>
    `;
    
    document.getElementById('comparisonData').innerHTML = html;
}
