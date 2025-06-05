"""
Serviço para criação e manipulação de grafos para análise regional de risco de incêndio.
"""
import networkx as nx
import numpy as np
import matplotlib.pyplot as plt
import matplotlib
import io
import base64
from src.models.fire_risk import FireRiskCalculator

class GraphService:
    """
    Serviço para criar e manipular grafos para análise regional de risco de incêndio.
    """
    
    def __init__(self, openweather_service):
        """
        Inicializa o serviço de grafo.
        
        Args:
            openweather_service: Serviço para obtenção de dados meteorológicos
        """
        self.graph = None
        self.weather_service = openweather_service
        
    def create_regional_graph(self, center_lat, center_lon, radius=0.5, num_points=8):
        """
        Cria um grafo regional com um nó central e nós vizinhos.
        
        Args:
            center_lat (float): Latitude do ponto central
            center_lon (float): Longitude do ponto central
            radius (float): Raio em graus para os pontos vizinhos
            num_points (int): Número de pontos vizinhos a serem criados
        """
        try:
            # Criar grafo
            self.graph = nx.Graph()
            
            # Adicionar nó central
            center_id = f"center_{center_lat:.4f}_{center_lon:.4f}"
            self.graph.add_node(center_id, 
                               lat=center_lat, 
                               lon=center_lon, 
                               type='center',
                               weather_data=None,
                               fire_risk=None)
            
            # Adicionar nós vizinhos em círculo ao redor do centro
            neighbor_nodes = []
            
            for i in range(num_points):
                # Calcular posição do vizinho
                angle = 2 * np.pi * i / num_points
                neighbor_lat = center_lat + radius * np.sin(angle)
                neighbor_lon = center_lon + radius * np.cos(angle)
                
                # Limitar latitude entre -90 e 90
                neighbor_lat = max(-90, min(90, neighbor_lat))
                
                # Normalizar longitude entre -180 e 180
                while neighbor_lon > 180:
                    neighbor_lon -= 360
                while neighbor_lon < -180:
                    neighbor_lon += 360
                
                # Criar ID único para o vizinho
                neighbor_id = f"neighbor_{i}_{neighbor_lat:.4f}_{neighbor_lon:.4f}"
                
                # Adicionar nó vizinho
                self.graph.add_node(neighbor_id, 
                                   lat=neighbor_lat, 
                                   lon=neighbor_lon, 
                                   type='neighbor',
                                   weather_data=None,
                                   fire_risk=None)
                
                # Conectar ao centro
                self.graph.add_edge(center_id, neighbor_id, weight=1.0)
                
                # Armazenar para conectar vizinhos entre si
                neighbor_nodes.append(neighbor_id)
            
            # Conectar vizinhos adjacentes
            for i in range(num_points):
                current = neighbor_nodes[i]
                next_neighbor = neighbor_nodes[(i + 1) % num_points]
                self.graph.add_edge(current, next_neighbor, weight=0.5)
                
            return True
        except Exception as e:
            print(f"Erro ao criar grafo regional: {e}")
            # Garantir que temos um grafo mesmo em caso de erro
            if self.graph is None:
                self.graph = nx.Graph()
                self.graph.add_node(f"center_{center_lat:.4f}_{center_lon:.4f}", 
                                   lat=center_lat, 
                                   lon=center_lon, 
                                   type='center',
                                   weather_data=None,
                                   fire_risk=None)
            return False
    
    def populate_graph_with_weather_data(self):
        """
        Obtém dados meteorológicos para todos os nós do grafo e calcula o risco de incêndio.
        """
        if not self.graph:
            print("Grafo não inicializado")
            return False
        
        try:
            for node_id in self.graph.nodes:
                node_data = self.graph.nodes[node_id]
                lat = node_data['lat']
                lon = node_data['lon']
                
                try:
                    # Obter dados meteorológicos
                    weather_data = self.weather_service.get_weather_by_location(lat, lon)
                    node_data['weather_data'] = weather_data
                    
                    # Calcular risco de incêndio
                    risk_index, risk_category = FireRiskCalculator.calculate_risk(
                        weather_data.temperature,
                        weather_data.humidity,
                        weather_data.wind_speed,
                        weather_data.precipitation
                    )
                    
                    # Obter cor e descrição do risco
                    risk_color = FireRiskCalculator.get_risk_color(risk_index)
                    risk_description = FireRiskCalculator.get_risk_description(risk_category)
                    
                    # Armazenar dados de risco
                    node_data['fire_risk'] = {
                        'index': risk_index,
                        'category': risk_category,
                        'color': risk_color,
                        'description': risk_description
                    }
                except Exception as e:
                    print(f"Erro ao obter dados para o nó {node_id}: {e}")
                    # Definir valores padrão em caso de erro
                    node_data['weather_data'] = None
                    node_data['fire_risk'] = {
                        'index': 0,
                        'category': 'desconhecido',
                        'color': '#CCCCCC',
                        'description': 'Não foi possível calcular o risco para este ponto.'
                    }
            
            return True
        except Exception as e:
            print(f"Erro ao popular grafo com dados meteorológicos: {e}")
            return False
    
    def get_regional_comparison_data(self):
        """
        Obtém dados comparativos entre o nó central e os nós vizinhos.
        
        Returns:
            dict: Dados comparativos
        """
        if not self.graph:
            print("Grafo não inicializado")
            return None
        
        try:
            # Encontrar nó central
            center_node = None
            neighbor_nodes = []
            
            for node_id, node_data in self.graph.nodes(data=True):
                if node_data['type'] == 'center':
                    center_node = (node_id, node_data)
                elif node_data['type'] == 'neighbor':
                    neighbor_nodes.append((node_id, node_data))
            
            if not center_node:
                print("Nó central não encontrado")
                return None
            
            # Extrair dados do centro
            center_id, center_data = center_node
            center_weather = center_data['weather_data']
            center_risk = center_data['fire_risk']
            
            # Preparar dados do centro
            center_info = {
                'location': center_weather.location_name if center_weather else f"{center_data['lat']:.4f}, {center_data['lon']:.4f}",
                'coordinates': [center_data['lat'], center_data['lon']],
                'weather': {
                    'temperature': center_weather.temperature if center_weather else 0,
                    'humidity': center_weather.humidity if center_weather else 0,
                    'wind_speed': center_weather.wind_speed if center_weather else 0,
                    'precipitation': center_weather.precipitation if center_weather else 0,
                    'description': center_weather.weather_description if center_weather else 'Desconhecido'
                },
                'fire_risk': center_risk
            }
            
            # Preparar dados dos vizinhos
            neighbors_info = {
                'nodes': [],
                'average': {
                    'temperature': 0,
                    'humidity': 0,
                    'wind_speed': 0,
                    'precipitation': 0,
                    'risk_index': 0
                }
            }
            
            # Calcular médias e coletar dados dos vizinhos
            valid_neighbors = 0
            
            for neighbor_id, neighbor_data in neighbor_nodes:
                neighbor_weather = neighbor_data['weather_data']
                neighbor_risk = neighbor_data['fire_risk']
                
                if neighbor_weather:
                    valid_neighbors += 1
                    neighbors_info['average']['temperature'] += neighbor_weather.temperature
                    neighbors_info['average']['humidity'] += neighbor_weather.humidity
                    neighbors_info['average']['wind_speed'] += neighbor_weather.wind_speed
                    neighbors_info['average']['precipitation'] += neighbor_weather.precipitation
                    neighbors_info['average']['risk_index'] += neighbor_risk['index']
                
                neighbors_info['nodes'].append({
                    'id': neighbor_id,
                    'lat': neighbor_data['lat'],
                    'lon': neighbor_data['lon'],
                    'location': neighbor_weather.location_name if neighbor_weather else f"{neighbor_data['lat']:.4f}, {neighbor_data['lon']:.4f}",
                    'weather': {
                        'temperature': neighbor_weather.temperature if neighbor_weather else 0,
                        'humidity': neighbor_weather.humidity if neighbor_weather else 0,
                        'wind_speed': neighbor_weather.wind_speed if neighbor_weather else 0,
                        'precipitation': neighbor_weather.precipitation if neighbor_weather else 0,
                        'description': neighbor_weather.weather_description if neighbor_weather else 'Desconhecido'
                    },
                    'fire_risk': neighbor_risk
                })
            
            # Calcular médias finais
            if valid_neighbors > 0:
                neighbors_info['average']['temperature'] /= valid_neighbors
                neighbors_info['average']['humidity'] /= valid_neighbors
                neighbors_info['average']['wind_speed'] /= valid_neighbors
                neighbors_info['average']['precipitation'] /= valid_neighbors
                neighbors_info['average']['risk_index'] /= valid_neighbors
            
            # Calcular diferenças
            comparison = {
                'temperature_diff': center_info['weather']['temperature'] - neighbors_info['average']['temperature'],
                'humidity_diff': center_info['weather']['humidity'] - neighbors_info['average']['humidity'],
                'wind_speed_diff': center_info['weather']['wind_speed'] - neighbors_info['average']['wind_speed'],
                'precipitation_diff': center_info['weather']['precipitation'] - neighbors_info['average']['precipitation'],
                'risk_index_diff': center_info['fire_risk']['index'] - neighbors_info['average']['risk_index']
            }
            
            return {
                'center': center_info,
                'neighbors': neighbors_info,
                'comparison': comparison
            }
        except Exception as e:
            print(f"Erro ao obter dados comparativos: {e}")
            return None
    
    def generate_graph_visualization(self):
        """
        Gera uma visualização do grafo.
        
        Returns:
            str: Imagem do grafo em formato base64
        """
        if not self.graph:
            print("Grafo não inicializado")
            return None
        
        try:
            # Configurar matplotlib para não exibir a figura
            matplotlib.use('Agg')
            
            # Criar figura
            plt.figure(figsize=(10, 8))
            
            # Obter posições dos nós
            pos = {}
            node_colors = []
            labels = {}
            
            for node_id, node_data in self.graph.nodes(data=True):
                # Usar coordenadas como posição
                pos[node_id] = (node_data['lon'], node_data['lat'])
                
                # Definir cor com base no risco
                if node_data['fire_risk']:
                    node_colors.append(node_data['fire_risk']['color'])
                else:
                    node_colors.append('#CCCCCC')
                
                # Criar rótulos
                if node_data['type'] == 'center':
                    labels[node_id] = 'Centro'
                else:
                    # Extrair número do vizinho do ID
                    neighbor_num = node_id.split('_')[1]
                    labels[node_id] = f'V{neighbor_num}'
            
            # Desenhar grafo
            nx.draw(self.graph, pos, with_labels=False, node_color=node_colors, 
                   node_size=500, edge_color='gray', width=1.5, alpha=0.8)
            
            # Adicionar rótulos
            nx.draw_networkx_labels(self.graph, pos, labels=labels, font_size=10, 
                                   font_color='black', font_weight='bold')
            
            # Adicionar título
            center_node = None
            for node_id, node_data in self.graph.nodes(data=True):
                if node_data['type'] == 'center':
                    center_node = node_data
                    break
            
            if center_node and center_node['weather_data']:
                plt.title(f"Análise Regional de Risco de Incêndio para {center_node['weather_data'].location_name}")
            else:
                plt.title("Análise Regional de Risco de Incêndio")
            
            # Adicionar legenda de cores
            plt.figtext(0.15, 0.02, "Muito Baixo", color='#3CB371')
            plt.figtext(0.3, 0.02, "Baixo", color='#ADFF2F')
            plt.figtext(0.45, 0.02, "Moderado", color='#FFD700')
            plt.figtext(0.6, 0.02, "Alto", color='#FF8C00')
            plt.figtext(0.75, 0.02, "Muito Alto", color='#FF0000')
            
            # Salvar em buffer
            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
            buf.seek(0)
            
            # Converter para base64
            img_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
            
            # Limpar figura
            plt.close()
            
            return img_base64
        except Exception as e:
            print(f"Erro ao gerar visualização do grafo: {e}")
            return None
    
    def get_heatmap_data(self):
        """
        Obtém dados para o mapa de calor.
        
        Returns:
            list: Lista de pontos para o mapa de calor [lat, lon, intensidade]
        """
        if not self.graph:
            print("Grafo não inicializado")
            return []
        
        try:
            heatmap_data = []
            
            for node_id, node_data in self.graph.nodes(data=True):
                if node_data['fire_risk']:
                    # Intensidade baseada no índice de risco
                    intensity = node_data['fire_risk']['index'] / 100
                    
                    # Aumentar intensidade para o nó central
                    if node_data['type'] == 'center':
                        intensity *= 2
                    
                    heatmap_data.append([node_data['lat'], node_data['lon'], intensity])
            
            return heatmap_data
        except Exception as e:
            print(f"Erro ao obter dados para mapa de calor: {e}")
            return []
