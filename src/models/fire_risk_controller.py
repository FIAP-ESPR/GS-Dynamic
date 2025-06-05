"""
Controlador para integração dos serviços de meteorologia, cálculo de risco de incêndio e análise de grafo.
"""
from src.models.openweather_service import OpenWeatherService
from src.models.fire_risk import FireRiskCalculator
from src.models.maps_service import MapsService
from src.models.graph_service import GraphService
import os
import json

class FireRiskController:
    """
    Controlador para gerenciar a integração entre os serviços de meteorologia, cálculo de risco de incêndio e análise de grafo.
    """
    
    def __init__(self):
        """
        Inicializa o controlador com os serviços necessários.
        """
        # Inicializar serviços com chaves de API do ambiente
        openweather_api_key = os.environ.get("OPENWEATHER_API_KEY", "demo_key")
        maps_api_key = os.environ.get("GOOGLE_MAPS_API_KEY", "demo_key")
        
        self.weather_service = OpenWeatherService(api_key=openweather_api_key)
        self.maps_service = MapsService(api_key=maps_api_key)
        self.graph_service = GraphService(openweather_service=self.weather_service)
    
    def calculate_fire_risk_for_location(self, lat, lon):
        """
        Calcula o risco de incêndio para uma localização específica.
        
        Args:
            lat (float): Latitude da localização
            lon (float): Longitude da localização
            
        Returns:
            dict: Informações sobre o risco de incêndio e dados meteorológicos
        """
        try:
            # Obter dados meteorológicos
            weather_data = self.weather_service.get_weather_by_location(lat, lon)
            
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
            
            # Preparar resposta
            result = {
                'location': {
                    'name': weather_data.location_name,
                    'coordinates': weather_data.coordinates
                },
                'weather': {
                    'temperature': weather_data.temperature,
                    'humidity': weather_data.humidity,
                    'wind_speed': weather_data.wind_speed,
                    'precipitation': weather_data.precipitation,
                    'description': weather_data.weather_description
                },
                'fire_risk': {
                    'index': risk_index,
                    'category': risk_category,
                    'color': risk_color,
                    'description': risk_description
                }
            }
            
            return result
        except Exception as e:
            print(f"Erro ao calcular risco de incêndio: {e}")
            raise
    
    def calculate_fire_risk_for_region(self, bounds, grid_size=5):
        """
        Calcula o risco de incêndio para uma região definida por limites geográficos.
        
        Args:
            bounds (dict): Limites da região {north, south, east, west}
            grid_size (int): Tamanho da grade para amostragem de pontos
            
        Returns:
            dict: Dados de risco de incêndio para a região
        """
        # Extrair limites
        north = bounds['north']
        south = bounds['south']
        east = bounds['east']
        west = bounds['west']
        
        # Calcular incrementos para a grade
        lat_step = (north - south) / grid_size
        lon_step = (east - west) / grid_size
        
        # Inicializar listas para armazenar resultados
        risk_points = []
        heat_map_data = []
        
        # Calcular centro da região para o mapa
        center_lat = (north + south) / 2
        center_lon = (east + west) / 2
        
        # Calcular risco para cada ponto da grade
        for i in range(grid_size + 1):
            lat = south + (i * lat_step)
            for j in range(grid_size + 1):
                lon = west + (j * lon_step)
                
                try:
                    # Calcular risco para este ponto
                    result = self.calculate_fire_risk_for_location(lat, lon)
                    
                    # Adicionar à lista de pontos de risco
                    risk_points.append({
                        'lat': lat,
                        'lon': lon,
                        'risk_index': result['fire_risk']['index'],
                        'risk_category': result['fire_risk']['category'],
                        'color': result['fire_risk']['color']
                    })
                    
                    # Adicionar à lista de dados para mapa de calor
                    heat_map_data.append([lat, lon, result['fire_risk']['index']])
                except Exception as e:
                    print(f"Erro ao processar ponto ({lat}, {lon}): {e}")
                    # Continuar com o próximo ponto
        
        # Calcular risco médio para a região
        if risk_points:
            avg_risk = sum(point['risk_index'] for point in risk_points) / len(risk_points)
            _, risk_category = FireRiskCalculator.calculate_risk(0, 0, 0, 0)  # Apenas para obter a categoria
            for category, threshold in FireRiskCalculator.RISK_THRESHOLDS.items():
                if avg_risk <= threshold:
                    risk_category = category
                    break
            
            risk_color = FireRiskCalculator.get_risk_color(avg_risk)
            risk_description = FireRiskCalculator.get_risk_description(risk_category)
        else:
            avg_risk = 0
            risk_category = 'desconhecido'
            risk_color = '#CCCCCC'
            risk_description = 'Não foi possível calcular o risco para esta região.'
        
        # Criar mapas
        risk_map = self.maps_service.create_risk_map(
            risk_points, 
            center_lat=center_lat, 
            center_lon=center_lon, 
            zoom_start=8
        )
        
        heat_map = self.maps_service.create_heat_map(
            heat_map_data,
            center_lat=center_lat,
            center_lon=center_lon,
            zoom_start=8
        )
        
        # Preparar resposta
        result = {
            'region': {
                'bounds': bounds,
                'center': {
                    'lat': center_lat,
                    'lon': center_lon
                }
            },
            'fire_risk': {
                'average_index': avg_risk,
                'category': risk_category,
                'color': risk_color,
                'description': risk_description,
                'points': risk_points
            },
            'maps': {
                'risk_map_html': self.maps_service.generate_map_html(risk_map),
                'heat_map_html': self.maps_service.generate_map_html(heat_map)
            }
        }
        
        return result
    
    def calculate_regional_fire_risk(self, lat, lon, radius=0.5, num_points=8):
        """
        Calcula o risco de incêndio para uma localização e suas regiões vizinhas usando grafo.
        
        Args:
            lat (float): Latitude da localização central
            lon (float): Longitude da localização central
            radius (float): Raio em graus para os pontos vizinhos
            num_points (int): Número de pontos vizinhos a serem criados
            
        Returns:
            dict: Dados de risco de incêndio para a região e comparações
        """
        try:
            # Criar grafo regional
            self.graph_service.create_regional_graph(lat, lon, radius, num_points)
            
            # Obter dados meteorológicos para todos os nós
            self.graph_service.populate_graph_with_weather_data()
            
            # Obter dados comparativos
            comparison_data = self.graph_service.get_regional_comparison_data()
            
            # Gerar visualização do grafo
            graph_image_base64 = self.graph_service.generate_graph_visualization()
            
            # Obter dados para mapa de calor
            heatmap_data = self.graph_service.get_heatmap_data()
            
            # Criar mapa de calor
            heat_map = self.maps_service.create_heat_map(
                heatmap_data,
                center_lat=lat,
                center_lon=lon,
                zoom_start=9
            )
            
            # Preparar resposta
            result = {
                'center': comparison_data['center'],
                'neighbors': comparison_data['neighbors'],
                'comparison': comparison_data['comparison'],
                'graph_image': graph_image_base64,
                'heatmap_html': self.maps_service.generate_map_html(heat_map)
            }
            
            return result
        except Exception as e:
            print(f"Erro ao calcular risco regional: {e}")
            raise
