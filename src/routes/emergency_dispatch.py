"""
Rotas para o sistema de despacho de emergências.
Implementa APIs para fila, heap, pilha, lista ligada, árvore e grafo.
"""
from flask import Blueprint, render_template, jsonify, request
from src.models.emergency_dispatch_service import EmergencyDispatchService

# Criar blueprint para as rotas de despacho de emergência
emergency_dispatch_bp = Blueprint('emergency_dispatch', __name__)

# Inicializar serviço de despacho de emergência
dispatch_service = EmergencyDispatchService()

@emergency_dispatch_bp.route('/emergency-dispatch', methods=['GET'])
def show_emergency_dispatch():
    """
    Página para visualização do dashboard de despacho de emergências.
    
    Returns:
        HTML: Página com dashboard de despacho
    """
    return render_template('emergency_dispatch.html')

# API para Fila (Queue) - Organização de chamadas por ordem de chegada
@emergency_dispatch_bp.route('/api/dispatch/calls', methods=['GET'])
def get_emergency_calls():
    """
    Endpoint para obter chamados de emergência em ordem de chegada.
    
    Returns:
        JSON: Lista de chamados de emergência
    """
    # Retorna os chamados da fila em ordem de chegada
    calls = list(dispatch_service.emergency_queue)
    return jsonify(calls)

@emergency_dispatch_bp.route('/api/dispatch/calls', methods=['POST'])
def add_emergency_call():
    """
    Endpoint para adicionar um novo chamado de emergência.
    
    Request body:
        local (str): Local do chamado
        severidade (int): Nível de severidade (1-5)
        tipo_vegetacao (str): Tipo de vegetação
        clima (str): Condição climática
    
    Returns:
        JSON: Dados do chamado criado
    """
    data = request.json
    
    local = data.get('local')
    severidade = int(data.get('severidade'))
    tipo_vegetacao = data.get('tipo_vegetacao')
    clima = data.get('clima')
    
    emergency = dispatch_service.add_emergency_call(local, severidade, tipo_vegetacao, clima)
    
    return jsonify({
        "success": True,
        "message": "Chamado adicionado com sucesso",
        "emergency": emergency
    })

# API para Heap - Priorização de chamados
@emergency_dispatch_bp.route('/api/dispatch/prioritized', methods=['GET'])
def get_prioritized_calls():
    """
    Endpoint para obter chamados priorizados pelo heap.
    
    Returns:
        JSON: Lista de chamados ordenados por prioridade
    """
    calls = dispatch_service.get_prioritized_calls()
    return jsonify(calls)

# API para Pilha (Stack) - Histórico de ações por equipe
@emergency_dispatch_bp.route('/api/dispatch/teams/<int:team_id>/actions', methods=['GET'])
def get_team_actions(team_id):
    """
    Endpoint para obter ações de uma equipe.
    
    Args:
        team_id (int): ID da equipe
    
    Returns:
        JSON: Lista de ações da equipe
    """
    actions = dispatch_service.get_team_actions(team_id)
    return jsonify(actions)

@emergency_dispatch_bp.route('/api/dispatch/teams/<int:team_id>/actions', methods=['POST'])
def add_team_action(team_id):
    """
    Endpoint para adicionar uma ação à pilha de ações de uma equipe.
    
    Args:
        team_id (int): ID da equipe
    
    Request body:
        emergency_id (int): ID do chamado
        action (str): Descrição da ação
    
    Returns:
        JSON: Dados da ação adicionada
    """
    data = request.json
    
    emergency_id = int(data.get('emergency_id'))
    action = data.get('action')
    
    action_data = dispatch_service.add_team_action(team_id, emergency_id, action)
    
    return jsonify({
        "success": True,
        "message": "Ação adicionada com sucesso",
        "action": action_data
    })

# API para Lista Ligada - Gestão de áreas afetadas
@emergency_dispatch_bp.route('/api/dispatch/areas', methods=['GET'])
def get_affected_areas():
    """
    Endpoint para obter áreas afetadas.
    
    Returns:
        JSON: Lista de áreas afetadas
    """
    areas = dispatch_service.get_affected_areas()
    return jsonify(areas)

@emergency_dispatch_bp.route('/api/dispatch/areas/<int:emergency_id>', methods=['PUT'])
def update_area_status(emergency_id):
    """
    Endpoint para atualizar o status de uma área afetada.
    
    Args:
        emergency_id (int): ID do chamado
    
    Request body:
        status (str): Novo status
    
    Returns:
        JSON: Resultado da atualização
    """
    data = request.json
    
    status = data.get('status')
    
    success = dispatch_service.update_area_status(emergency_id, status)
    
    return jsonify({
        "success": success,
        "message": "Status da área atualizado com sucesso" if success else "Área não encontrada"
    })

# API para Árvore - Hierarquia de regiões
@emergency_dispatch_bp.route('/api/dispatch/regions', methods=['GET'])
def get_region_hierarchy():
    """
    Endpoint para obter a hierarquia completa de regiões.
    
    Returns:
        JSON: Estrutura hierárquica de regiões
    """
    hierarchy = dispatch_service.get_region_hierarchy()
    return jsonify(hierarchy)

@emergency_dispatch_bp.route('/api/dispatch/regions/<zone_name>', methods=['GET'])
def get_zone_path(zone_name):
    """
    Endpoint para obter o caminho hierárquico até uma zona específica.
    
    Args:
        zone_name (str): Nome da zona
    
    Returns:
        JSON: Caminho hierárquico até a zona
    """
    path = dispatch_service.find_zone_path(zone_name)
    
    if path:
        return jsonify({
            "success": True,
            "zone": zone_name,
            "path": path
        })
    else:
        return jsonify({
            "success": False,
            "message": "Zona não encontrada"
        })

# API para Grafo - Cálculo de rotas
@emergency_dispatch_bp.route('/api/dispatch/route', methods=['GET'])
def calculate_route():
    """
    Endpoint para calcular rota entre dois pontos.
    
    Query params:
        origem (str): Local de origem
        destino (str): Local de destino
    
    Returns:
        JSON: Dados da rota calculada
    """
    origem = request.args.get('origem', 'Base Central')
    destino = request.args.get('destino', 'Zona Norte')
    
    route = dispatch_service.calculate_shortest_path(origem, destino)
    
    return jsonify(route)

# API para Equipes
@emergency_dispatch_bp.route('/api/dispatch/teams', methods=['GET'])
def get_teams():
    """
    Endpoint para obter equipes disponíveis.
    
    Returns:
        JSON: Lista de equipes
    """
    teams = dispatch_service.get_teams()
    return jsonify(teams)

@emergency_dispatch_bp.route('/api/dispatch/teams/<int:team_id>', methods=['PUT'])
def update_team_status(team_id):
    """
    Endpoint para atualizar o status de uma equipe.
    
    Args:
        team_id (int): ID da equipe
    
    Request body:
        status (str): Novo status
    
    Returns:
        JSON: Resultado da atualização
    """
    data = request.json
    
    status = data.get('status')
    
    success = dispatch_service.update_team_status(team_id, status)
    
    return jsonify({
        "success": success,
        "message": "Status da equipe atualizado com sucesso" if success else "Equipe não encontrada"
    })

# API para Atribuição de Equipe a Chamado
@emergency_dispatch_bp.route('/api/dispatch/assign', methods=['POST'])
def assign_team_to_emergency():
    """
    Endpoint para atribuir equipe a um chamado.
    
    Request body:
        emergency_id (int): ID do chamado
        team_id (int): ID da equipe
        actions (list): Lista de ações a realizar
    
    Returns:
        JSON: Resultado da atribuição
    """
    data = request.json
    
    emergency_id = int(data.get('emergency_id'))
    team_id = int(data.get('team_id'))
    actions = data.get('actions', [])
    
    result = dispatch_service.assign_team_to_emergency(team_id, emergency_id, actions)
    
    return jsonify(result)
