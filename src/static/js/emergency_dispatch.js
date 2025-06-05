// JavaScript para o sistema de despacho de emergências

// Variáveis globais
let routeMap = null;
let graphVisualization = null;
let currentViewMode = 'heap'; // 'heap' ou 'queue'

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    setupFormListeners();
    initializeMap();
    loadEmergencyCalls();
    loadTeams();
    setupTeamListeners();
    loadAffectedAreas();
    loadRegionTree();
    initializeGraphVisualization();
    
    // Configurar botões de visualização
    document.getElementById('viewQueueBtn').addEventListener('click', function() {
        currentViewMode = 'queue';
        this.classList.add('btn-dark');
        this.classList.remove('btn-outline-dark');
        document.getElementById('viewHeapBtn').classList.add('btn-outline-dark');
        document.getElementById('viewHeapBtn').classList.remove('btn-dark');
        loadEmergencyCalls();
    });
    
    document.getElementById('viewHeapBtn').addEventListener('click', function() {
        currentViewMode = 'heap';
        this.classList.add('btn-dark');
        this.classList.remove('btn-outline-dark');
        document.getElementById('viewQueueBtn').classList.add('btn-outline-dark');
        document.getElementById('viewQueueBtn').classList.remove('btn-dark');
        loadEmergencyCalls();
    });
    
    // Configurar botão de cálculo de rota
    document.getElementById('calculateRouteBtn').addEventListener('click', calculateAndDisplayRoute);
    
    // Atualizar dados a cada 30 segundos
    setInterval(function() {
        loadEmergencyCalls();
        loadTeams();
        loadAffectedAreas();
    }, 30000);
});

// Configurar event listeners para os formulários
function setupFormListeners() {
    // Formulário de novo chamado de emergência
    document.getElementById('emergencyForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const local = document.getElementById('localInput').value;
        const severidade = parseInt(document.getElementById('severidadeInput').value);
        const tipoVegetacao = document.getElementById('vegetacaoInput').value;
        const clima = document.getElementById('climaInput').value;
        
        // Criar novo chamado via API
        fetch('/api/dispatch/calls', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                local: local,
                severidade: severidade,
                tipo_vegetacao: tipoVegetacao,
                clima: clima
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Limpar formulário
                document.getElementById('emergencyForm').reset();
                
                // Recarregar dados
                loadEmergencyCalls();
                loadAffectedAreas();
                
                // Mostrar alerta de sucesso
                alert(`Chamado de emergência adicionado com sucesso! ID: ${data.emergency.id}`);
            } else {
                alert('Erro ao adicionar chamado: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao adicionar chamado. Verifique o console para mais detalhes.');
        });
    });
    
    // Listener para seleção de equipe (histórico de ações)
    document.getElementById('teamSelect').addEventListener('change', function() {
        const teamId = this.value;
        loadTeamActions(teamId);
    });
    
    // Listener para confirmação de atribuição de equipe
    document.getElementById('confirmAssignment').addEventListener('click', function() {
        const emergencyId = this.getAttribute('data-emergency-id');
        const teamId = this.getAttribute('data-team-id');
        
        if (!emergencyId || !teamId) {
            return;
        }
        
        // Obter ações selecionadas
        const actions = [];
        document.querySelectorAll('#assignTeamModal input[type="checkbox"]:checked').forEach(function(checkbox) {
            actions.push(checkbox.value);
        });
        
        // Atribuir equipe via API
        fetch('/api/dispatch/assign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                emergency_id: parseInt(emergencyId),
                team_id: parseInt(teamId),
                actions: actions
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Recarregar dados
                loadEmergencyCalls();
                loadTeams();
                loadTeamActions(teamId);
                loadAffectedAreas();
                
                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('assignTeamModal'));
                modal.hide();
                
                // Mostrar alerta de sucesso
                alert(`Equipe ${teamId} atribuída ao chamado ${emergencyId} com sucesso!`);
            } else {
                alert('Erro ao atribuir equipe: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao atribuir equipe. Verifique o console para mais detalhes.');
        });
    });
    
    // Listener para confirmação de atualização de status de área
    document.getElementById('confirmAreaStatusUpdate').addEventListener('click', function() {
        const emergencyId = this.getAttribute('data-emergency-id');
        const status = document.getElementById('areaStatusSelect').value;
        
        if (!emergencyId) {
            return;
        }
        
        // Atualizar status via API
        fetch(`/api/dispatch/areas/${emergencyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: status
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Recarregar dados
                loadEmergencyCalls();
                loadAffectedAreas();
                
                // Fechar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('updateAreaStatusModal'));
                modal.hide();
                
                // Mostrar alerta de sucesso
                alert(`Status da área atualizado com sucesso!`);
            } else {
                alert('Erro ao atualizar status: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao atualizar status. Verifique o console para mais detalhes.');
        });
    });
}

// Inicializar mapa
function initializeMap() {
    // Criar mapa
    routeMap = L.map('routeMap').setView([-15.7801, -47.9292], 10); // Coordenadas de Brasília
    
    // Adicionar camada de mapa base
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(routeMap);
}

// Carregar chamados de emergência
function loadEmergencyCalls() {
    const endpoint = currentViewMode === 'heap' ? '/api/dispatch/prioritized' : '/api/dispatch/calls';
    
    fetch(endpoint)
        .then(response => response.json())
        .then(data => {
            updateEmergencyQueueTable(data);
        })
        .catch(error => {
            console.error('Erro ao carregar chamados:', error);
        });
}

// Carregar equipes
function loadTeams() {
    fetch('/api/dispatch/teams')
        .then(response => response.json())
        .then(data => {
            updateTeamsTable(data);
            updateTeamSelect(data);
        })
        .catch(error => {
            console.error('Erro ao carregar equipes:', error);
        });
}

// Carregar ações de uma equipe
function loadTeamActions(teamId) {
    fetch(`/api/dispatch/teams/${teamId}/actions`)
        .then(response => response.json())
        .then(data => {
            updateActionHistory(teamId, data);
        })
        .catch(error => {
            console.error('Erro ao carregar ações:', error);
        });
}

// Carregar áreas afetadas
function loadAffectedAreas() {
    fetch('/api/dispatch/areas')
        .then(response => response.json())
        .then(data => {
            updateAffectedAreasTable(data);
        })
        .catch(error => {
            console.error('Erro ao carregar áreas afetadas:', error);
        });
}

// Carregar hierarquia de regiões
function loadRegionTree() {
    fetch('/api/dispatch/regions')
        .then(response => response.json())
        .then(data => {
            renderRegionTree(data);
        })
        .catch(error => {
            console.error('Erro ao carregar hierarquia de regiões:', error);
        });
}

// Calcular menor caminho entre dois pontos
function calculateRoute(origem, destino) {
    return new Promise((resolve, reject) => {
        fetch(`/api/dispatch/route?origem=${origem}&destino=${destino}`)
            .then(response => response.json())
            .then(data => {
                resolve(data);
            })
            .catch(error => {
                console.error('Erro ao calcular rota:', error);
                reject(error);
            });
    });
}

// Calcular e exibir rota
function calculateAndDisplayRoute() {
    const origem = document.getElementById('originSelect').value;
    const destino = document.getElementById('destinationSelect').value;
    
    calculateRoute(origem, destino)
        .then(data => {
            // Atualizar detalhes da rota
            updateRouteDetails(data);
            
            // Atualizar visualização do grafo
            updateGraphVisualization(data);
        })
        .catch(error => {
            console.error('Erro ao calcular rota:', error);
            alert('Erro ao calcular rota. Verifique o console para mais detalhes.');
        });
}

// Atualizar tabela de chamados
function updateEmergencyQueueTable(emergencies) {
    const tableBody = document.getElementById('emergencyQueue');
    const emptyMessage = document.getElementById('queueEmpty');
    
    // Limpar tabela
    tableBody.innerHTML = '';
    
    if (emergencies.length === 0) {
        // Mostrar mensagem de fila vazia
        emptyMessage.style.display = 'block';
    } else {
        // Esconder mensagem de fila vazia
        emptyMessage.style.display = 'none';
        
        // Preencher tabela
        emergencies.forEach(function(emergency) {
            const row = document.createElement('tr');
            row.setAttribute('data-emergency-id', emergency.id);
            
            // Definir classe com base no status
            if (emergency.status === 'resolvido') {
                row.classList.add('table-success');
            } else if (emergency.status === 'em_atendimento' || emergency.status === 'controle em andamento') {
                row.classList.add('table-warning');
            } else if (emergency.status === 'pendente') {
                row.classList.add('table-danger');
            }
            
            // Criar células
            row.innerHTML = `
                <td>${emergency.id}</td>
                <td>${emergency.local}</td>
                <td>${emergency.severidade}</td>
                <td>${formatVegetationType(emergency.tipo_vegetacao)}</td>
                <td>${formatClimateType(emergency.clima)}</td>
                <td><strong>${parseFloat(emergency.prioridade).toFixed(1)}</strong></td>
                <td>${formatStatus(emergency.status)}</td>
                <td>
                    <button class="btn btn-sm btn-info view-route" data-emergency-id="${emergency.id}" data-local="${emergency.local}">
                        <i class="fas fa-route"></i>
                    </button>
                    <button class="btn btn-sm btn-success assign-emergency" data-emergency-id="${emergency.id}">
                        <i class="fas fa-user-plus"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Adicionar event listeners para botões
        document.querySelectorAll('.view-route').forEach(function(button) {
            button.addEventListener('click', function() {
                const emergencyId = this.getAttribute('data-emergency-id');
                const local = this.getAttribute('data-local');
                showRouteDetails("Base Central", local);
            });
        });
        
        document.querySelectorAll('.assign-emergency').forEach(function(button) {
            button.addEventListener('click', function() {
                const emergencyId = this.getAttribute('data-emergency-id');
                showAssignTeamModal(emergencyId);
            });
        });
    }
}

// Atualizar tabela de equipes
function updateTeamsTable(teams) {
    const tableBody = document.getElementById('teamsTable');
    
    // Limpar tabela
    tableBody.innerHTML = '';
    
    // Preencher tabela
    teams.forEach(function(team) {
        const row = document.createElement('tr');
        row.setAttribute('data-team-id', team.id);
        
        // Criar células
        row.innerHTML = `
            <td>${team.id}</td>
            <td>${team.nome}</td>
            <td>${team.base}</td>
            <td><span class="badge ${team.status === 'disponível' ? 'bg-success' : 'bg-warning'}">${team.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary assign-team" data-team-id="${team.id}">
                    <i class="fas fa-tasks"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Adicionar event listeners para botões
    document.querySelectorAll('.assign-team').forEach(function(button) {
        button.addEventListener('click', function() {
            const teamId = this.getAttribute('data-team-id');
            showTeamAssignmentModal(teamId);
        });
    });
}

// Atualizar select de equipes
function updateTeamSelect(teams) {
    const teamSelect = document.getElementById('teamSelect');
    
    // Preservar valor selecionado
    const selectedValue = teamSelect.value;
    
    // Limpar select
    teamSelect.innerHTML = '';
    
    // Preencher select
    teams.forEach(function(team) {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.nome;
        teamSelect.appendChild(option);
    });
    
    // Restaurar valor selecionado se existir
    if (selectedValue && Array.from(teamSelect.options).some(opt => opt.value === selectedValue)) {
        teamSelect.value = selectedValue;
    }
    
    // Carregar ações da equipe selecionada
    if (teamSelect.value) {
        loadTeamActions(teamSelect.value);
    }
}

// Atualizar histórico de ações
function updateActionHistory(teamId, actions) {
    const historyContainer = document.getElementById('actionHistory');
    
    if (actions.length === 0) {
        historyContainer.innerHTML = `
            <div class="text-center py-3 text-muted">
                <i class="fas fa-clipboard-check fa-2x mb-2"></i>
                <p>Nenhuma ação registrada para esta equipe.</p>
            </div>
        `;
    } else {
        historyContainer.innerHTML = '';
        
        // Mostrar ações em ordem cronológica inversa (mais recente primeiro)
        actions.forEach(function(action) {
            const actionItem = document.createElement('div');
            actionItem.className = 'list-group-item';
            
            const timestamp = new Date(action.timestamp);
            const timeString = timestamp.toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const dateString = timestamp.toLocaleDateString('pt-PT');
            
            actionItem.innerHTML = `
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${action.action}</h6>
                    <small>${timeString} - ${dateString}</small>
                </div>
                <p class="mb-1">Chamado #${action.emergency_id}</p>
            `;
            
            historyContainer.appendChild(actionItem);
        });
    }
}

// Atualizar tabela de áreas afetadas
function updateAffectedAreasTable(areas) {
    const tableBody = document.getElementById('affectedAreasTable');
    const emptyMessage = document.getElementById('areasEmpty');
    
    // Limpar tabela
    tableBody.innerHTML = '';
    
    if (areas.length === 0) {
        // Mostrar mensagem de áreas vazias
        emptyMessage.style.display = 'block';
    } else {
        // Esconder mensagem de áreas vazias
        emptyMessage.style.display = 'none';
        
        // Preencher tabela
        areas.forEach(function(area) {
            const row = document.createElement('tr');
            row.setAttribute('data-emergency-id', area.emergency_id);
            
            // Definir classe com base no status
            if (area.status === 'resolvido') {
                row.classList.add('table-success');
            } else if (area.status === 'controle em andamento') {
                row.classList.add('table-warning');
            } else if (area.status === 'contido') {
                row.classList.add('table-info');
            } else {
                row.classList.add('table-danger');
            }
            
            // Criar células
            row.innerHTML = `
                <td>${area.emergency_id}</td>
                <td>${area.local}</td>
                <td>${formatAreaStatus(area.status)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary update-area-status" data-emergency-id="${area.emergency_id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Adicionar event listeners para botões
        document.querySelectorAll('.update-area-status').forEach(function(button) {
            button.addEventListener('click', function() {
                const emergencyId = this.getAttribute('data-emergency-id');
                showUpdateAreaStatusModal(emergencyId);
            });
        });
    }
}

// Renderizar árvore de regiões
function renderRegionTree(data) {
    const container = document.getElementById('regionTree');
    container.innerHTML = '';
    
    function createTreeNode(node) {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'tree-node';
        
        const nodeHeader = document.createElement('div');
        nodeHeader.className = 'tree-node-header';
        
        // Definir classe com base no nível
        let levelClass = '';
        if (node.level === 'Estado') {
            levelClass = 'bg-primary text-white';
        } else if (node.level === 'Município') {
            levelClass = 'bg-info text-white';
        } else {
            levelClass = 'bg-success text-white';
        }
        
        nodeHeader.className += ' ' + levelClass;
        nodeHeader.innerHTML = `<span>${node.name}</span> <small>(${node.level})</small>`;
        nodeElement.appendChild(nodeHeader);
        
        if (node.children && node.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'tree-node-children';
            
            node.children.forEach(child => {
                childrenContainer.appendChild(createTreeNode(child));
            });
            
            nodeElement.appendChild(childrenContainer);
        }
        
        return nodeElement;
    }
    
    container.appendChild(createTreeNode(data));
}

// Inicializar visualização do grafo
function initializeGraphVisualization() {
    // Configurar SVG para visualização do grafo
    const width = document.getElementById('graphVisualization').clientWidth;
    const height = document.getElementById('graphVisualization').clientHeight;
    
    const svg = d3.select('#graphVisualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Criar grupo para conter o grafo
    graphVisualization = svg.append('g');
    
    // Adicionar zoom e pan
    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([0.5, 5])
        .on('zoom', (event) => {
            graphVisualization.attr('transform', event.transform);
        }));
}

// Atualizar visualização do grafo
function updateGraphVisualization(routeData) {
    // Limpar visualização anterior
    graphVisualization.selectAll('*').remove();
    
    // Dados do grafo
    const nodes = [
        { id: 'Base Central', group: 1 },
        { id: 'Zona Norte', group: 2 },
        { id: 'Zona Sul', group: 2 },
        { id: 'Mata Alta', group: 3 },
        { id: 'Vila Verde', group: 3 },
        { id: 'Parque Nacional', group: 3 }
    ];
    
    const links = [
        { source: 'Base Central', target: 'Zona Norte', value: 10 },
        { source: 'Base Central', target: 'Vila Verde', value: 5 },
        { source: 'Base Central', target: 'Zona Sul', value: 8 },
        { source: 'Zona Norte', target: 'Mata Alta', value: 7 },
        { source: 'Vila Verde', target: 'Mata Alta', value: 3 },
        { source: 'Vila Verde', target: 'Parque Nacional', value: 6 },
        { source: 'Zona Sul', target: 'Parque Nacional', value: 4 }
    ];
    
    // Configurar simulação de força
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(
            document.getElementById('graphVisualization').clientWidth / 2,
            document.getElementById('graphVisualization').clientHeight / 2
        ));
    
    // Desenhar links
    const link = graphVisualization.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke-width', d => {
            // Verificar se o link faz parte da rota
            const isInRoute = routeData && routeData.rota && routeData.rota.length > 1 && 
                routeData.rota.some((node, i) => 
                    i < routeData.rota.length - 1 && 
                    ((d.source.id === routeData.rota[i] && d.target.id === routeData.rota[i+1]) ||
                     (d.source.id === routeData.rota[i+1] && d.target.id === routeData.rota[i]))
                );
            
            return isInRoute ? 4 : 2;
        })
        .attr('stroke', d => {
            // Verificar se o link faz parte da rota
            const isInRoute = routeData && routeData.rota && routeData.rota.length > 1 && 
                routeData.rota.some((node, i) => 
                    i < routeData.rota.length - 1 && 
                    ((d.source.id === routeData.rota[i] && d.target.id === routeData.rota[i+1]) ||
                     (d.source.id === routeData.rota[i+1] && d.target.id === routeData.rota[i]))
                );
            
            return isInRoute ? '#ff4500' : '#999';
        });
    
    // Desenhar nós
    const node = graphVisualization.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('r', d => {
            // Verificar se o nó é origem ou destino
            if (routeData && (d.id === routeData.origem || d.id === routeData.destino)) {
                return 12;
            }
            // Verificar se o nó faz parte da rota
            if (routeData && routeData.rota && routeData.rota.includes(d.id)) {
                return 10;
            }
            return 8;
        })
        .attr('fill', d => {
            // Verificar se o nó é origem ou destino
            if (routeData && d.id === routeData.origem) {
                return '#0275d8'; // Azul para origem
            }
            if (routeData && d.id === routeData.destino) {
                return '#d9534f'; // Vermelho para destino
            }
            // Verificar se o nó faz parte da rota
            if (routeData && routeData.rota && routeData.rota.includes(d.id)) {
                return '#f0ad4e'; // Amarelo para nós na rota
            }
            return d.group === 1 ? '#28a745' : (d.group === 2 ? '#6c757d' : '#17a2b8');
        })
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    // Adicionar rótulos aos nós
    const label = graphVisualization.append('g')
        .selectAll('text')
        .data(nodes)
        .enter().append('text')
        .attr('dy', -15)
        .attr('text-anchor', 'middle')
        .text(d => d.id)
        .attr('font-size', '12px')
        .attr('font-weight', d => {
            // Verificar se o nó é origem ou destino
            if (routeData && (d.id === routeData.origem || d.id === routeData.destino)) {
                return 'bold';
            }
            return 'normal';
        });
    
    // Adicionar rótulos de distância aos links
    const linkLabel = graphVisualization.append('g')
        .selectAll('text')
        .data(links)
        .enter().append('text')
        .attr('dy', -5)
        .attr('text-anchor', 'middle')
        .text(d => d.value)
        .attr('font-size', '10px')
        .attr('fill', d => {
            // Verificar se o link faz parte da rota
            const isInRoute = routeData && routeData.rota && routeData.rota.length > 1 && 
                routeData.rota.some((node, i) => 
                    i < routeData.rota.length - 1 && 
                    ((d.source.id === routeData.rota[i] && d.target.id === routeData.rota[i+1]) ||
                     (d.source.id === routeData.rota[i+1] && d.target.id === routeData.rota[i]))
                );
            
            return isInRoute ? '#ff4500' : '#666';
        });
    
    // Atualizar posições durante a simulação
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);
        
        label
            .attr('x', d => d.x)
            .attr('y', d => d.y);
        
        linkLabel
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);
    });
    
    // Funções para arrastar nós
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

// Atualizar detalhes da rota
function updateRouteDetails(route) {
    const routeDetails = document.getElementById('routeDetails');
    
    routeDetails.innerHTML = `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            Origem
            <span class="badge bg-primary rounded-pill">${route.origem}</span>
        </li>
        <li class="list-group-item d-flex justify-content-between align-items-center">
            Destino
            <span class="badge bg-danger rounded-pill">${route.destino}</span>
        </li>
        <li class="list-group-item d-flex justify-content-between align-items-center">
            Distância Total
            <span class="badge bg-info rounded-pill">${route.distancia} km</span>
        </li>
        <li class="list-group-item d-flex justify-content-between align-items-center">
            Tempo Estimado
            <span class="badge bg-warning rounded-pill">${route.tempo_estimado} min</span>
        </li>
        <li class="list-group-item">
            <strong>Pontos de Passagem:</strong>
            <ol class="mt-2 mb-0">
                ${route.rota.map(point => `<li>${point}</li>`).join('')}
            </ol>
        </li>
    `;
}

// Mostrar modal de atribuição de equipe
function showAssignTeamModal(emergencyId) {
    // Buscar dados do chamado
    fetch('/api/dispatch/prioritized')
        .then(response => response.json())
        .then(data => {
            const emergency = data.find(item => item.id === parseInt(emergencyId));
            
            if (!emergency) {
                alert('Chamado não encontrado!');
                return;
            }
            
            // Preencher detalhes do chamado
            const emergencyDetails = document.getElementById('emergencyDetails');
            emergencyDetails.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Chamado #${emergency.id}</h5>
                        <p class="card-text"><strong>Local:</strong> ${emergency.local}</p>
                        <p class="card-text"><strong>Severidade:</strong> ${emergency.severidade}</p>
                        <p class="card-text"><strong>Vegetação:</strong> ${formatVegetationType(emergency.tipo_vegetacao)}</p>
                        <p class="card-text"><strong>Clima:</strong> ${formatClimateType(emergency.clima)}</p>
                        <p class="card-text"><strong>Status:</strong> ${formatStatus(emergency.status)}</p>
                    </div>
                </div>
            `;
            
            // Buscar equipes disponíveis
            fetch('/api/dispatch/teams')
                .then(response => response.json())
                .then(teams => {
                    // Preencher detalhes da equipe (primeira disponível)
                    const availableTeam = teams.find(team => team.status === 'disponível') || teams[0];
                    
                    const teamDetails = document.getElementById('teamDetails');
                    teamDetails.innerHTML = `
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">Equipe #${availableTeam.id}</h5>
                                <p class="card-text"><strong>Nome:</strong> ${availableTeam.nome}</p>
                                <p class="card-text"><strong>Base:</strong> ${availableTeam.base}</p>
                                <p class="card-text"><strong>Status:</strong> <span class="badge ${availableTeam.status === 'disponível' ? 'bg-success' : 'bg-warning'}">${availableTeam.status}</span></p>
                            </div>
                        </div>
                    `;
                    
                    // Calcular rota
                    calculateRoute(availableTeam.base, emergency.local)
                        .then(route => {
                            // Preencher detalhes da rota
                            const routeDetails = document.getElementById('routeDetailsModal');
                            routeDetails.innerHTML = `
                                <div class="alert alert-info">
                                    <p><strong>Origem:</strong> ${route.origem}</p>
                                    <p><strong>Destino:</strong> ${route.destino}</p>
                                    <p><strong>Distância:</strong> ${route.distancia} km</p>
                                    <p><strong>Tempo Estimado:</strong> ${route.tempo_estimado} min</p>
                                    <p><strong>Rota:</strong> ${route.rota.join(' → ')}</p>
                                </div>
                            `;
                            
                            // Configurar botão de confirmação
                            const confirmButton = document.getElementById('confirmAssignment');
                            confirmButton.setAttribute('data-emergency-id', emergencyId);
                            confirmButton.setAttribute('data-team-id', availableTeam.id);
                            
                            // Mostrar modal
                            const modal = new bootstrap.Modal(document.getElementById('assignTeamModal'));
                            modal.show();
                        })
                        .catch(error => {
                            console.error('Erro ao calcular rota:', error);
                        });
                })
                .catch(error => {
                    console.error('Erro ao carregar equipes:', error);
                });
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao buscar detalhes do chamado. Verifique o console para mais detalhes.');
        });
}

// Mostrar modal de atribuição a partir da equipe
function showTeamAssignmentModal(teamId) {
    // Buscar dados da equipe
    fetch('/api/dispatch/teams')
        .then(response => response.json())
        .then(data => {
            const team = data.find(item => item.id === parseInt(teamId));
            
            if (!team) {
                alert('Equipe não encontrada!');
                return;
            }
            
            // Preencher detalhes da equipe
            const teamDetails = document.getElementById('teamDetails');
            teamDetails.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Equipe #${team.id}</h5>
                        <p class="card-text"><strong>Nome:</strong> ${team.nome}</p>
                        <p class="card-text"><strong>Base:</strong> ${team.base}</p>
                        <p class="card-text"><strong>Status:</strong> <span class="badge ${team.status === 'disponível' ? 'bg-success' : 'bg-warning'}">${team.status}</span></p>
                    </div>
                </div>
            `;
            
            // Buscar chamados pendentes
            fetch('/api/dispatch/prioritized')
                .then(response => response.json())
                .then(emergencies => {
                    // Filtrar chamados pendentes
                    const pendingEmergencies = emergencies.filter(e => e.status === 'pendente');
                    
                    if (pendingEmergencies.length === 0) {
                        alert('Não há chamados pendentes para atribuir a esta equipe.');
                        return;
                    }
                    
                    // Pegar o chamado de maior prioridade
                    const emergency = pendingEmergencies[0];
                    
                    // Preencher detalhes do chamado
                    const emergencyDetails = document.getElementById('emergencyDetails');
                    emergencyDetails.innerHTML = `
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">Chamado #${emergency.id}</h5>
                                <p class="card-text"><strong>Local:</strong> ${emergency.local}</p>
                                <p class="card-text"><strong>Severidade:</strong> ${emergency.severidade}</p>
                                <p class="card-text"><strong>Vegetação:</strong> ${formatVegetationType(emergency.tipo_vegetacao)}</p>
                                <p class="card-text"><strong>Clima:</strong> ${formatClimateType(emergency.clima)}</p>
                                <p class="card-text"><strong>Status:</strong> ${formatStatus(emergency.status)}</p>
                            </div>
                        </div>
                    `;
                    
                    // Calcular rota
                    calculateRoute(team.base, emergency.local)
                        .then(route => {
                            // Preencher detalhes da rota
                            const routeDetails = document.getElementById('routeDetailsModal');
                            routeDetails.innerHTML = `
                                <div class="alert alert-info">
                                    <p><strong>Origem:</strong> ${route.origem}</p>
                                    <p><strong>Destino:</strong> ${route.destino}</p>
                                    <p><strong>Distância:</strong> ${route.distancia} km</p>
                                    <p><strong>Tempo Estimado:</strong> ${route.tempo_estimado} min</p>
                                    <p><strong>Rota:</strong> ${route.rota.join(' → ')}</p>
                                </div>
                            `;
                            
                            // Configurar botão de confirmação
                            const confirmButton = document.getElementById('confirmAssignment');
                            confirmButton.setAttribute('data-emergency-id', emergency.id);
                            confirmButton.setAttribute('data-team-id', teamId);
                            
                            // Mostrar modal
                            const modal = new bootstrap.Modal(document.getElementById('assignTeamModal'));
                            modal.show();
                        })
                        .catch(error => {
                            console.error('Erro ao calcular rota:', error);
                        });
                })
                .catch(error => {
                    console.error('Erro ao carregar chamados:', error);
                });
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao buscar detalhes da equipe. Verifique o console para mais detalhes.');
        });
}

// Mostrar detalhes da rota
function showRouteDetails(origem, destino) {
    // Calcular menor caminho
    calculateRoute(origem, destino)
        .then(result => {
            // Preencher informações da rota
            const routeInfo = document.getElementById('routeInfo');
            routeInfo.innerHTML = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Origem
                    <span class="badge bg-primary rounded-pill">${result.origem}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Destino
                    <span class="badge bg-danger rounded-pill">${result.destino}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Distância Total
                    <span class="badge bg-info rounded-pill">${result.distancia} km</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    Tempo Estimado
                    <span class="badge bg-warning rounded-pill">${result.tempo_estimado} min</span>
                </li>
            `;
            
            // Preencher pontos de passagem
            const routeWaypoints = document.getElementById('routeWaypoints');
            routeWaypoints.innerHTML = '';
            
            result.rota.forEach(function(point) {
                const item = document.createElement('li');
                item.className = 'list-group-item';
                item.textContent = point;
                routeWaypoints.appendChild(item);
            });
            
            // Inicializar mapa de detalhes da rota
            setTimeout(function() {
                const routeDetailMap = L.map('routeDetailMap').setView([-15.7801, -47.9292], 10);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 18
                }).addTo(routeDetailMap);
                
                // Adicionar marcadores e linha da rota
                const routeCoordinates = getRouteCoordinates(result.rota);
                
                // Adicionar marcador de origem
                L.marker(routeCoordinates[0])
                    .addTo(routeDetailMap)
                    .bindPopup(`<b>${result.origem}</b><br>Ponto de partida`)
                    .openPopup();
                
                // Adicionar marcador de destino
                L.marker(routeCoordinates[routeCoordinates.length - 1])
                    .addTo(routeDetailMap)
                    .bindPopup(`<b>${result.destino}</b><br>Destino`);
                
                // Adicionar linha da rota
                L.polyline(routeCoordinates, {color: 'blue', weight: 5}).addTo(routeDetailMap);
                
                // Ajustar visualização para mostrar toda a rota
                routeDetailMap.fitBounds(routeCoordinates);
            }, 500);
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('routeDetailsModal'));
            modal.show();
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao calcular rota. Verifique o console para mais detalhes.');
        });
}

// Mostrar modal de atualização de status de área
function showUpdateAreaStatusModal(emergencyId) {
    // Configurar botão de confirmação
    const confirmButton = document.getElementById('confirmAreaStatusUpdate');
    confirmButton.setAttribute('data-emergency-id', emergencyId);
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('updateAreaStatusModal'));
    modal.show();
}

// Obter coordenadas para a rota (simuladas)
function getRouteCoordinates(path) {
    // Mapeamento de locais para coordenadas (simulado)
    const coordinates = {
        "Base Central": [-15.7801, -47.9292],
        "Zona Norte": [-15.7201, -47.9092],
        "Zona Sul": [-15.8401, -47.9392],
        "Mata Alta": [-15.7101, -47.8592],
        "Vila Verde": [-15.7601, -47.8892],
        "Parque Nacional": [-15.8101, -47.8792]
    };
    
    return path.map(point => coordinates[point] || [-15.7801, -47.9292]);
}

// Funções auxiliares de formatação
function formatVegetationType(type) {
    switch (type) {
        case 'cerrado':
            return 'Cerrado';
        case 'mata_atlantica':
            return 'Mata Atlântica';
        case 'pantanal':
            return 'Pantanal';
        default:
            return type;
    }
}

function formatClimateType(type) {
    switch (type) {
        case 'seco':
            return 'Seco';
        case 'ventoso':
            return 'Ventoso';
        case 'umido':
            return 'Úmido';
        default:
            return type;
    }
}

function formatStatus(status) {
    switch (status) {
        case 'pendente':
            return '<span class="badge bg-danger">Pendente</span>';
        case 'em_atendimento':
            return '<span class="badge bg-warning">Em Atendimento</span>';
        case 'resolvido':
            return '<span class="badge bg-success">Resolvido</span>';
        case 'controle em andamento':
            return '<span class="badge bg-info">Controle em Andamento</span>';
        case 'contido':
            return '<span class="badge bg-primary">Contido</span>';
        default:
            return '<span class="badge bg-secondary">' + status + '</span>';
    }
}

function formatAreaStatus(status) {
    switch (status) {
        case 'ativo':
            return '<span class="badge bg-danger">Ativo</span>';
        case 'controle em andamento':
            return '<span class="badge bg-warning">Controle em Andamento</span>';
        case 'contido':
            return '<span class="badge bg-info">Contido</span>';
        case 'resolvido':
            return '<span class="badge bg-success">Resolvido</span>';
        default:
            return '<span class="badge bg-secondary">' + status + '</span>';
    }
}
