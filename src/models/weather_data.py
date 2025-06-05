"""
Modelo para armazenamento e processamento de dados meteorológicos.
"""

class WeatherData:
    """
    Classe para armazenar e processar dados meteorológicos obtidos da API OpenWeather.
    """
    
    def __init__(self, data):
        """
        Inicializa um objeto WeatherData com os dados da API OpenWeather.
        
        Args:
            data (dict): Dados brutos da API OpenWeather
        """
        self.data = data
        
    @property
    def temperature(self):
        """Retorna a temperatura em Celsius."""
        return self.data.get('main', {}).get('temp')
    
    @property
    def humidity(self):
        """Retorna a humidade em percentagem."""
        return self.data.get('main', {}).get('humidity')
    
    @property
    def wind_speed(self):
        """Retorna a velocidade do vento em m/s."""
        return self.data.get('wind', {}).get('speed')
    
    @property
    def precipitation(self):
        """Retorna a precipitação em mm nas últimas 3 horas, se disponível."""
        return self.data.get('rain', {}).get('3h', 0)
    
    @property
    def weather_description(self):
        """Retorna a descrição do clima."""
        weather_data = self.data.get('weather', [{}])
        return weather_data[0].get('description') if weather_data else ""
    
    @property
    def location_name(self):
        """Retorna o nome da localização."""
        return self.data.get('name', '')
    
    @property
    def coordinates(self):
        """Retorna as coordenadas (latitude, longitude) da localização."""
        coord = self.data.get('coord', {})
        return (coord.get('lat'), coord.get('lon'))
