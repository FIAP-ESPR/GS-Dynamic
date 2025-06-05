"""
Modelo para cálculo de risco de incêndio florestal baseado em dados meteorológicos.
"""

class FireRiskCalculator:
    """
    Classe para calcular o risco de incêndio florestal com base em dados meteorológicos.
    
    O cálculo considera fatores como temperatura, humidade, velocidade do vento e precipitação
    para determinar o nível de risco de incêndio numa escala de 0 a 100.
    """
    
    # Constantes para o cálculo de risco
    TEMP_WEIGHT = 0.4
    HUMIDITY_WEIGHT = 0.3
    WIND_WEIGHT = 0.2
    RAIN_WEIGHT = 0.1
    
    # Limiares para categorias de risco
    RISK_THRESHOLDS = {
        'muito_baixo': 20,
        'baixo': 40,
        'moderado': 60,
        'alto': 80,
        'muito_alto': 100
    }
    
    @staticmethod
    def calculate_risk(temperature, humidity, wind_speed, precipitation_3h):
        """
        Calcula o índice de risco de incêndio florestal.
        
        Args:
            temperature (float): Temperatura em Celsius
            humidity (float): Humidade relativa em percentagem
            wind_speed (float): Velocidade do vento em m/s
            precipitation_3h (float): Precipitação nas últimas 3 horas em mm
        
        Returns:
            tuple: (índice de risco numérico, categoria de risco)
        """
        # Normalização dos valores para uma escala de 0-100
        temp_factor = min(100, max(0, (temperature - 5) * 4))  # Temperatura acima de 5°C aumenta o risco
        humidity_factor = min(100, max(0, 100 - humidity))  # Menor humidade = maior risco
        wind_factor = min(100, max(0, wind_speed * 10))  # Maior velocidade do vento = maior risco
        
        # Fator de precipitação (chuva reduz o risco)
        rain_factor = min(100, max(0, 100 - (precipitation_3h * 20)))
        
        # Cálculo ponderado do risco
        risk_index = (
            FireRiskCalculator.TEMP_WEIGHT * temp_factor +
            FireRiskCalculator.HUMIDITY_WEIGHT * humidity_factor +
            FireRiskCalculator.WIND_WEIGHT * wind_factor +
            FireRiskCalculator.RAIN_WEIGHT * rain_factor
        )
        
        # Determinação da categoria de risco
        risk_category = 'muito_alto'
        for category, threshold in FireRiskCalculator.RISK_THRESHOLDS.items():
            if risk_index <= threshold:
                risk_category = category
                break
                
        return risk_index, risk_category
    
    @staticmethod
    def get_risk_color(risk_index):
        """
        Retorna uma cor hexadecimal correspondente ao índice de risco.
        
        Args:
            risk_index (float): Índice de risco de 0 a 100
            
        Returns:
            str: Código de cor hexadecimal
        """
        if risk_index <= FireRiskCalculator.RISK_THRESHOLDS['muito_baixo']:
            return '#3CB371'  # Verde médio
        elif risk_index <= FireRiskCalculator.RISK_THRESHOLDS['baixo']:
            return '#ADFF2F'  # Verde amarelado
        elif risk_index <= FireRiskCalculator.RISK_THRESHOLDS['moderado']:
            return '#FFD700'  # Amarelo
        elif risk_index <= FireRiskCalculator.RISK_THRESHOLDS['alto']:
            return '#FF8C00'  # Laranja escuro
        else:
            return '#FF0000'  # Vermelho
    
    @staticmethod
    def get_risk_description(risk_category):
        """
        Retorna uma descrição detalhada para cada categoria de risco.
        
        Args:
            risk_category (str): Categoria de risco
            
        Returns:
            str: Descrição detalhada do risco
        """
        descriptions = {
            'muito_baixo': 'Risco muito baixo de incêndio florestal. Condições meteorológicas favoráveis para prevenção de incêndios.',
            'baixo': 'Risco baixo de incêndio florestal. Condições geralmente seguras, mas é recomendável manter vigilância básica.',
            'moderado': 'Risco moderado de incêndio florestal. Recomenda-se cautela em atividades ao ar livre que possam gerar faíscas ou chamas.',
            'alto': 'Risco alto de incêndio florestal. Evite atividades que possam causar incêndios e esteja preparado para resposta rápida.',
            'muito_alto': 'Risco muito alto de incêndio florestal. Situação crítica que requer máxima vigilância e preparação para emergências.'
        }
        
        return descriptions.get(risk_category, 'Categoria de risco desconhecida')
