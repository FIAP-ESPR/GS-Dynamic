"""
Serviço para interação com a API OpenWeather.
"""
import os
import requests
from src.models.weather_data import WeatherData

class OpenWeatherService:
    """
    Serviço para obter dados meteorológicos da API OpenWeather.
    """
    
    # URL base da API
    BASE_URL = "https://api.openweathermap.org/data/2.5"
    
    def __init__(self, api_key=None):
        """
        Inicializa o serviço OpenWeather.
        
        Args:
            api_key (str, optional): Chave da API OpenWeather. Se não fornecida,
                                    tenta obter da variável de ambiente OPENWEATHER_API_KEY.
        """
        self.api_key = api_key or os.environ.get("OPENWEATHER_API_KEY", "demo_key")
    
    def get_weather_by_location(self, lat, lon, units="metric"):
        """
        Obtém dados meteorológicos atuais para uma localização específica.
        
        Args:
            lat (float): Latitude da localização
            lon (float): Longitude da localização
            units (str, optional): Unidades de medida (metric, imperial, standard)
            
        Returns:
            WeatherData: Objeto com os dados meteorológicos processados
            
        Raises:
            Exception: Se ocorrer um erro na chamada à API
        """
        endpoint = f"{self.BASE_URL}/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.api_key,
            "units": units
        }
        
        try:
            response = requests.get(endpoint, params=params)
            response.raise_for_status()  # Lança exceção para códigos de erro HTTP
            return WeatherData(response.json())
        except requests.exceptions.RequestException as e:
            # Registrar o erro e relançar
            print(f"Erro ao obter dados meteorológicos: {e}")
            raise
    
    def get_forecast_by_location(self, lat, lon, units="metric"):
        """
        Obtém previsão meteorológica para os próximos dias para uma localização específica.
        
        Args:
            lat (float): Latitude da localização
            lon (float): Longitude da localização
            units (str, optional): Unidades de medida (metric, imperial, standard)
            
        Returns:
            dict: Dados brutos da previsão meteorológica
            
        Raises:
            Exception: Se ocorrer um erro na chamada à API
        """
        endpoint = f"{self.BASE_URL}/forecast"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.api_key,
            "units": units
        }
        
        try:
            response = requests.get(endpoint, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Erro ao obter previsão meteorológica: {e}")
            raise
    
    def get_weather_by_city(self, city_name, country_code=None, units="metric"):
        """
        Obtém dados meteorológicos atuais para uma cidade.
        
        Args:
            city_name (str): Nome da cidade
            country_code (str, optional): Código do país (ISO 3166)
            units (str, optional): Unidades de medida (metric, imperial, standard)
            
        Returns:
            WeatherData: Objeto com os dados meteorológicos processados
            
        Raises:
            Exception: Se ocorrer um erro na chamada à API
        """
        endpoint = f"{self.BASE_URL}/weather"
        location = f"{city_name}"
        if country_code:
            location = f"{city_name},{country_code}"
            
        params = {
            "q": location,
            "appid": self.api_key,
            "units": units
        }
        
        try:
            response = requests.get(endpoint, params=params)
            response.raise_for_status()
            return WeatherData(response.json())
        except requests.exceptions.RequestException as e:
            print(f"Erro ao obter dados meteorológicos para {location}: {e}")
            raise
