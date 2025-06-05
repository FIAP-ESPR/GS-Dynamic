"""
Serviço para interação com a Google Maps API.
"""
import os
import json
import folium
from folium.plugins import HeatMap

class MapsService:
    """
    Serviço para interação com a Google Maps API e criação de visualizações geográficas.
    """
    
    def __init__(self, api_key=None):
        """
        Inicializa o serviço de mapas.
        
        Args:
            api_key (str, optional): Chave da API Google Maps. Se não fornecida,
                                    tenta obter da variável de ambiente GOOGLE_MAPS_API_KEY.
        """
        self.api_key = api_key or os.environ.get("GOOGLE_MAPS_API_KEY", "demo_key")
    
    def create_base_map(self, center_lat=0, center_lon=0, zoom_start=2):
        """
        Cria um mapa base usando Folium.
        
        Args:
            center_lat (float): Latitude central do mapa
            center_lon (float): Longitude central do mapa
            zoom_start (int): Nível de zoom inicial
            
        Returns:
            folium.Map: Objeto de mapa Folium
        """
        return folium.Map(
            location=[center_lat, center_lon],
            zoom_start=zoom_start,
            tiles='OpenStreetMap'
        )
    
    def create_heat_map(self, data_points, center_lat=0, center_lon=0, zoom_start=2):
        """
        Cria um mapa de calor com base em pontos de dados.
        
        Args:
            data_points (list): Lista de tuplas (lat, lon, intensidade)
            center_lat (float): Latitude central do mapa
            center_lon (float): Longitude central do mapa
            zoom_start (int): Nível de zoom inicial
            
        Returns:
            folium.Map: Objeto de mapa Folium com camada de mapa de calor
        """
        # Criar mapa base
        heat_map = self.create_base_map(center_lat, center_lon, zoom_start)
        
        # Adicionar camada de mapa de calor
        HeatMap(data_points).add_to(heat_map)
        
        return heat_map
    
    def create_risk_map(self, risk_points, center_lat=0, center_lon=0, zoom_start=2):
        """
        Cria um mapa com marcadores coloridos indicando níveis de risco.
        
        Args:
            risk_points (list): Lista de dicionários com lat, lon, risco e cor
            center_lat (float): Latitude central do mapa
            center_lon (float): Longitude central do mapa
            zoom_start (int): Nível de zoom inicial
            
        Returns:
            folium.Map: Objeto de mapa Folium com marcadores de risco
        """
        # Criar mapa base
        risk_map = self.create_base_map(center_lat, center_lon, zoom_start)
        
        # Adicionar marcadores para cada ponto de risco
        for point in risk_points:
            folium.CircleMarker(
                location=[point['lat'], point['lon']],
                radius=10,
                color=point['color'],
                fill=True,
                fill_color=point['color'],
                fill_opacity=0.7,
                popup=f"Risco: {point['risk_category']}<br>Índice: {point['risk_index']:.1f}"
            ).add_to(risk_map)
        
        return risk_map
    
    def save_map(self, map_obj, file_path):
        """
        Salva o mapa como um arquivo HTML.
        
        Args:
            map_obj (folium.Map): Objeto de mapa Folium
            file_path (str): Caminho para salvar o arquivo HTML
            
        Returns:
            str: Caminho do arquivo salvo
        """
        map_obj.save(file_path)
        return file_path
    
    def generate_map_html(self, map_obj):
        """
        Gera o HTML do mapa para incorporação em páginas web.
        
        Args:
            map_obj (folium.Map): Objeto de mapa Folium
            
        Returns:
            str: HTML do mapa
        """
        return map_obj._repr_html_()
