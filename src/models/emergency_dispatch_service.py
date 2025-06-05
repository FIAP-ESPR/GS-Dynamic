"""
Serviço para gestão de emergências com estruturas de dados especializadas.
Implementa fila, heap, pilha, lista ligada, árvore e grafo para operações de despacho.
"""
import heapq
import json
from datetime import datetime
from collections import deque

class EmergencyNode:
    """Nó para representação de chamados de emergência na lista ligada."""
    def __init__(self, emergency_id, local, status="ativo"):
        self.emergency_id = emergency_id
        self.local = local
        self.status = status
        self.next = None
    
    def to_dict(self):
        """Converte o nó para dicionário."""
        return {
            "emergency_id": self.emergency_id,
            "local": self.local,
            "status": self.status
        }

class EmergencyLinkedList:
    """Lista ligada para gestão de áreas afetadas com status dinâmico."""
    def __init__(self):
        self.head = None
    
    def add(self, emergency_id, local, status="ativo"):
        """Adiciona uma nova área afetada à lista."""
        new_node = EmergencyNode(emergency_id, local, status)
        if not self.head:
            self.head = new_node
            return
        
        # Adicionar no final da lista
        current = self.head
        while current.next:
            current = current.next
        current.next = new_node
    
    def update_status(self, emergency_id, new_status):
        """Atualiza o status de uma área afetada."""
        current = self.head
        while current:
            if current.emergency_id == emergency_id:
                current.status = new_status
                return True
            current = current.next
        return False
    
    def get_all(self):
        """Retorna todas as áreas afetadas."""
        areas = []
        current = self.head
        while current:
            areas.append(current.to_dict())
            current = current.next
        return areas
    
    def get_by_id(self, emergency_id):
        """Retorna uma área afetada pelo ID."""
        current = self.head
        while current:
            if current.emergency_id == emergency_id:
                return current.to_dict()
            current = current.next
        return None

class RegionTreeNode:
    """Nó para representação hierárquica de regiões na árvore."""
    def __init__(self, name, level):
        self.name = name
        self.level = level  # Estado, Município ou Zona
        self.children = []
    
    def add_child(self, child):
        """Adiciona um filho ao nó."""
        self.children.append(child)
    
    def to_dict(self):
        """Converte o nó e seus filhos para dicionário."""
        return {
            "name": self.name,
            "level": self.level,
            "children": [child.to_dict() for child in self.children]
        }

class RegionTree:
    """Árvore para representação hierárquica de regiões."""
    def __init__(self):
        self.root = None
    
    def build_default_tree(self):
        """Constrói uma árvore padrão com estados, municípios e zonas."""
        # Estado
        self.root = RegionTreeNode("São Paulo", "Estado")
        
        # Municípios
        municipio1 = RegionTreeNode("Campinas", "Município")
        municipio2 = RegionTreeNode("São José dos Campos", "Município")
        
        # Zonas para Campinas
        municipio1.add_child(RegionTreeNode("Zona Norte", "Zona"))
        municipio1.add_child(RegionTreeNode("Zona Sul", "Zona"))
        municipio1.add_child(RegionTreeNode("Parque Nacional", "Zona"))
        
        # Zonas para São José dos Campos
        municipio2.add_child(RegionTreeNode("Vila Verde", "Zona"))
        municipio2.add_child(RegionTreeNode("Mata Alta", "Zona"))
        
        # Adicionar municípios ao estado
        self.root.add_child(municipio1)
        self.root.add_child(municipio2)
    
    def get_tree(self):
        """Retorna a árvore completa."""
        if not self.root:
            self.build_default_tree()
        return self.root.to_dict()
    
    def find_zone_path(self, zone_name):
        """Encontra o caminho até uma zona específica."""
        if not self.root:
            self.build_default_tree()
        
        def search_zone(node, target, path):
            if node.name == target:
                return path + [node.name]
            
            for child in node.children:
                result = search_zone(child, target, path + [node.name])
                if result:
                    return result
            return None
        
        return search_zone(self.root, zone_name, [])

class EmergencyDispatchService:
    """
    Serviço principal para gestão de emergências com estruturas de dados especializadas.
    """
    def __init__(self):
        # Fila (Queue) para organização de chamadas por ordem de chegada
        self.emergency_queue = deque()
        
        # Heap para priorização de chamados
        self.priority_heap = []
        
        # Pilha (Stack) para histórico de ações por equipe
        self.team_actions = {}  # {team_id: [actions]}
        
        # Lista ligada para áreas afetadas
        self.affected_areas = EmergencyLinkedList()
        
        # Árvore para hierarquia de regiões
        self.region_tree = RegionTree()
        self.region_tree.build_default_tree()
        
        # Grafo para mapa de locais conectados
        self.location_graph = {
            "Base Central": {"Zona Norte": 10, "Vila Verde": 5, "Zona Sul": 8},
            "Zona Norte": {"Base Central": 10, "Mata Alta": 7},
            "Vila Verde": {"Base Central": 5, "Mata Alta": 3, "Parque Nacional": 6},
            "Zona Sul": {"Base Central": 8, "Parque Nacional": 4},
            "Mata Alta": {"Zona Norte": 7, "Vila Verde": 3},
            "Parque Nacional": {"Vila Verde": 6, "Zona Sul": 4}
        }
        
        # Contador para IDs de emergência
        self.emergency_counter = 1
        
        # Equipes disponíveis
        self.teams = [
            {"id": 1, "nome": "Equipe Alpha", "base": "Base Central", "status": "disponível"},
            {"id": 2, "nome": "Equipe Bravo", "base": "Base Central", "status": "disponível"},
            {"id": 3, "nome": "Equipe Charlie", "base": "Vila Verde", "status": "disponível"}
        ]
    
    def add_emergency_call(self, local, severidade, tipo_vegetacao, clima):
        """
        Adiciona um novo chamado de emergência.
        
        Args:
            local (str): Local do chamado
            severidade (int): Nível de severidade (1-5)
            tipo_vegetacao (str): Tipo de vegetação
            clima (str): Condição climática
        
        Returns:
            dict: Dados do chamado criado
        """
        # Criar chamado
        emergency_id = self.emergency_counter
        self.emergency_counter += 1
        
        # Calcular prioridade
        prioridade = self._calculate_priority(severidade, tipo_vegetacao)
        
        # Criar objeto do chamado
        emergency = {
            "id": emergency_id,
            "local": local,
            "severidade": severidade,
            "tipo_vegetacao": tipo_vegetacao,
            "clima": clima,
            "prioridade": prioridade,
            "status": "pendente",
            "data_criacao": datetime.now().isoformat()
        }
        
        # Adicionar à fila (Queue)
        self.emergency_queue.append(emergency)
        
        # Adicionar ao heap de prioridade
        # Usamos negativo da prioridade porque heapq é um min-heap
        heapq.heappush(self.priority_heap, (-prioridade, emergency_id, emergency))
        
        # Adicionar à lista ligada de áreas afetadas
        self.affected_areas.add(emergency_id, local)
        
        return emergency
    
    def _calculate_priority(self, severidade, tipo_vegetacao):
        """
        Calcula a prioridade do chamado.
        
        Args:
            severidade (int): Nível de severidade (1-5)
            tipo_vegetacao (str): Tipo de vegetação
        
        Returns:
            float: Valor de prioridade calculado
        """
        # Pesos por tipo de vegetação
        vegetacao_pesos = {
            "cerrado": 1.2,
            "mata_atlantica": 1.5,
            "pantanal": 2.0
        }
        
        peso = vegetacao_pesos.get(tipo_vegetacao, 1.0)
        return severidade * peso
    
    def get_prioritized_calls(self):
        """
        Obtém chamados priorizados pelo heap.
        
        Returns:
            list: Lista de chamados ordenados por prioridade
        """
        # Criar uma cópia do heap para não modificar o original
        heap_copy = self.priority_heap.copy()
        result = []
        
        # Extrair chamados do heap em ordem de prioridade
        while heap_copy:
            _, _, emergency = heapq.heappop(heap_copy)
            result.append(emergency)
        
        return result
    
    def get_emergency_by_id(self, emergency_id):
        """
        Obtém um chamado pelo ID.
        
        Args:
            emergency_id (int): ID do chamado
        
        Returns:
            dict: Dados do chamado ou None se não encontrado
        """
        for _, eid, emergency in self.priority_heap:
            if eid == emergency_id:
                return emergency
        return None
    
    def add_team_action(self, team_id, emergency_id, action):
        """
        Adiciona uma ação à pilha de ações de uma equipe.
        
        Args:
            team_id (int): ID da equipe
            emergency_id (int): ID do chamado
            action (str): Descrição da ação
        
        Returns:
            dict: Dados da ação adicionada
        """
        # Inicializar pilha se não existir
        if team_id not in self.team_actions:
            self.team_actions[team_id] = []
        
        # Criar objeto da ação
        action_data = {
            "team_id": team_id,
            "emergency_id": emergency_id,
            "action": action,
            "timestamp": datetime.now().isoformat()
        }
        
        # Adicionar à pilha (Stack) - o último adicionado é o primeiro a ser recuperado
        self.team_actions[team_id].append(action_data)
        
        return action_data
    
    def get_team_actions(self, team_id):
        """
        Obtém todas as ações de uma equipe.
        
        Args:
            team_id (int): ID da equipe
        
        Returns:
            list: Lista de ações
        """
        # Retornar a pilha em ordem inversa (mais recente primeiro)
        return list(reversed(self.team_actions.get(team_id, [])))
    
    def update_area_status(self, emergency_id, status):
        """
        Atualiza o status de uma área afetada na lista ligada.
        
        Args:
            emergency_id (int): ID do chamado
            status (str): Novo status
        
        Returns:
            bool: True se atualizado com sucesso
        """
        # Atualizar na lista ligada
        success = self.affected_areas.update_status(emergency_id, status)
        
        # Atualizar também no heap
        for i, (_, eid, emergency) in enumerate(self.priority_heap):
            if eid == emergency_id:
                emergency["status"] = status
                self.priority_heap[i] = (self.priority_heap[i][0], eid, emergency)
                break
        
        return success
    
    def get_affected_areas(self):
        """
        Obtém todas as áreas afetadas da lista ligada.
        
        Returns:
            list: Lista de áreas afetadas
        """
        return self.affected_areas.get_all()
    
    def get_region_hierarchy(self):
        """
        Obtém a hierarquia completa de regiões da árvore.
        
        Returns:
            dict: Estrutura hierárquica de regiões
        """
        return self.region_tree.get_tree()
    
    def find_zone_path(self, zone_name):
        """
        Encontra o caminho hierárquico até uma zona específica.
        
        Args:
            zone_name (str): Nome da zona
        
        Returns:
            list: Caminho hierárquico até a zona
        """
        return self.region_tree.find_zone_path(zone_name)
    
    def calculate_shortest_path(self, origin, destination):
        """
        Calcula o menor caminho entre dois pontos usando o algoritmo de Dijkstra.
        
        Args:
            origin (str): Local de origem
            destination (str): Local de destino
        
        Returns:
            dict: Dados da rota calculada
        """
        # Verificar se origem e destino existem no grafo
        if origin not in self.location_graph or destination not in self.location_graph:
            return {
                "origem": origin,
                "destino": destination,
                "rota": [origin, destination],
                "distancia": float('inf'),
                "tempo_estimado": float('inf')
            }
        
        # Implementação do algoritmo de Dijkstra
        distances = {node: float('inf') for node in self.location_graph}
        distances[origin] = 0
        previous = {node: None for node in self.location_graph}
        unvisited = list(self.location_graph.keys())
        
        while unvisited:
            # Encontrar o nó não visitado com menor distância
            current = min(unvisited, key=lambda node: distances[node])
            
            # Se chegamos ao destino ou a distância é infinita, paramos
            if current == destination or distances[current] == float('inf'):
                break
            
            # Remover o nó atual dos não visitados
            unvisited.remove(current)
            
            # Verificar vizinhos
            for neighbor, distance in self.location_graph[current].items():
                # Calcular nova distância
                new_distance = distances[current] + distance
                
                # Se a nova distância é menor, atualizamos
                if new_distance < distances[neighbor]:
                    distances[neighbor] = new_distance
                    previous[neighbor] = current
        
        # Reconstruir o caminho
        path = []
        current = destination
        
        while current:
            path.append(current)
            current = previous[current]
        
        # Inverter o caminho para ter origem -> destino
        path.reverse()
        
        # Calcular tempo estimado (2 minutos por unidade de distância)
        tempo_estimado = distances[destination] * 2
        
        return {
            "origem": origin,
            "destino": destination,
            "rota": path,
            "distancia": distances[destination],
            "tempo_estimado": tempo_estimado
        }
    
    def get_teams(self):
        """
        Obtém todas as equipes disponíveis.
        
        Returns:
            list: Lista de equipes
        """
        return self.teams
    
    def update_team_status(self, team_id, status):
        """
        Atualiza o status de uma equipe.
        
        Args:
            team_id (int): ID da equipe
            status (str): Novo status
        
        Returns:
            bool: True se atualizado com sucesso
        """
        for team in self.teams:
            if team["id"] == team_id:
                team["status"] = status
                return True
        return False
    
    def assign_team_to_emergency(self, team_id, emergency_id, actions):
        """
        Atribui uma equipe a um chamado de emergência.
        
        Args:
            team_id (int): ID da equipe
            emergency_id (int): ID do chamado
            actions (list): Lista de ações a realizar
        
        Returns:
            dict: Resultado da atribuição
        """
        # Obter dados do chamado
        emergency = self.get_emergency_by_id(emergency_id)
        if not emergency:
            return {"success": False, "message": "Chamado não encontrado"}
        
        # Obter equipe
        team = None
        for t in self.teams:
            if t["id"] == team_id:
                team = t
                break
        
        if not team:
            return {"success": False, "message": "Equipe não encontrada"}
        
        # Atualizar status da equipe
        self.update_team_status(team_id, "em missão")
        
        # Atualizar status do chamado
        for i, (_, eid, e) in enumerate(self.priority_heap):
            if eid == emergency_id:
                e["status"] = "em_atendimento"
                self.priority_heap[i] = (self.priority_heap[i][0], eid, e)
                break
        
        # Atualizar status da área
        self.update_area_status(emergency_id, "controle em andamento")
        
        # Registrar ações
        for action in actions:
            self.add_team_action(team_id, emergency_id, action)
        
        # Calcular rota
        rota = self.calculate_shortest_path(team["base"], emergency["local"])
        
        return {
            "success": True,
            "ocorrencia_id": emergency_id,
            "equipe_id": team_id,
            "prioridade": emergency["prioridade"],
            "acoes": actions,
            "rota": rota["rota"],
            "tempo_estimado": rota["tempo_estimado"],
            "status_area": "controle em andamento"
        }
