"""
Rotas para a API de risco de incêndio.
"""
from flask import Blueprint, request, jsonify, render_template
from src.models.fire_risk_controller import FireRiskController
import traceback

# Criar blueprint para as rotas de risco de incêndio
fire_risk_bp = Blueprint("fire_risk", __name__)

# Inicializar controlador
controller = FireRiskController()

@fire_risk_bp.route("/api/risk/location", methods=["GET"])
def get_risk_for_location():
    """
    Endpoint para obter o risco de incêndio para uma localização específica.
    
    Query params:
        lat (float): Latitude da localização
        lon (float): Longitude da localização
        city (str, optional): Nome da cidade
        country (str, optional): Código do país
    
    Returns:
        JSON: Dados de risco de incêndio para a localização
    """
    try:
        # Verificar se foram fornecidas coordenadas ou nome da cidade
        if "lat" in request.args and "lon" in request.args:
            lat = float(request.args.get("lat", 0))
            lon = float(request.args.get("lon", 0))
            
            result = controller.calculate_fire_risk_for_location(lat, lon)
            return jsonify(result)
        elif "city" in request.args:
            # Implementação futura para busca por cidade
            # Para evitar erro 501, vamos tentar obter coordenadas da cidade
            city_name = request.args.get("city")
            country_code = request.args.get("country")
            try:
                weather_data = controller.weather_service.get_weather_by_city(city_name, country_code)
                lat, lon = weather_data.coordinates
                if lat is not None and lon is not None:
                    # Se obtivermos coordenadas, calculamos o risco regional
                    radius = float(request.args.get("radius", 0.5))
                    num_points = int(request.args.get("num_points", 8))
                    result = controller.calculate_regional_fire_risk(lat, lon, radius, num_points)
                    return jsonify(result)
                else:
                    return jsonify({"error": f"Não foi possível encontrar coordenadas para {city_name}"}), 404
            except Exception as city_error:
                print(f"Erro ao buscar por cidade {city_name}: {city_error}")
                return jsonify({"error": f"Erro ao processar a cidade {city_name}"}), 500
        else:
            return jsonify({"error": "Parâmetros inválidos. Forneça lat/lon ou city"}), 400
    except ValueError as ve:
        print(f"Erro de valor nos parâmetros: {ve}")
        return jsonify({"error": "Parâmetros inválidos. Latitude e longitude devem ser números."}), 400
    except Exception as e:
        print(f"Erro inesperado em /api/risk/location: {e}")
        traceback.print_exc()
        return jsonify({"error": "Ocorreu um erro interno no servidor."}), 500

@fire_risk_bp.route("/api/risk/region", methods=["POST"])
def get_risk_for_region():
    """
    Endpoint para obter o risco de incêndio para uma região.
    
    Request body:
        bounds (dict): Limites da região {north, south, east, west}
        grid_size (int, optional): Tamanho da grade para amostragem
    
    Returns:
        JSON: Dados de risco de incêndio para a região
    """
    try:
        data = request.json
        if not data or "bounds" not in data:
            return jsonify({"error": "Corpo da requisição inválido ou faltando 'bounds'."}), 400
            
        bounds = data.get("bounds")
        grid_size = int(data.get("grid_size", 5))
        
        if not all(k in bounds for k in ("north", "south", "east", "west")):
             return jsonify({"error": "Objeto 'bounds' incompleto. Necessário: north, south, east, west."}), 400

        result = controller.calculate_fire_risk_for_region(bounds, grid_size)
        return jsonify(result)
    except ValueError as ve:
        print(f"Erro de valor nos parâmetros: {ve}")
        return jsonify({"error": "Parâmetros inválidos. Verifique os limites e grid_size."}), 400
    except Exception as e:
        print(f"Erro inesperado em /api/risk/region: {e}")
        traceback.print_exc()
        return jsonify({"error": "Ocorreu um erro interno no servidor."}), 500

@fire_risk_bp.route("/api/risk/regional", methods=["GET"])
def get_regional_risk():
    """
    Endpoint para obter o risco de incêndio para uma localização e suas regiões vizinhas.
    
    Query params:
        lat (float): Latitude da localização central
        lon (float): Longitude da localização central
        radius (float, optional): Raio em graus para os pontos vizinhos
        num_points (int, optional): Número de pontos vizinhos
    
    Returns:
        JSON: Dados de risco de incêndio regional e comparações
    """
    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
        radius = float(request.args.get("radius", 0.5))
        num_points = int(request.args.get("num_points", 8))
        
        # Validar parâmetros
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return jsonify({"error": "Latitude ou longitude inválida."}), 400
        if not (0.1 <= radius <= 2.0):
             return jsonify({"error": "Raio deve estar entre 0.1 e 2.0."}), 400
        if not (4 <= num_points <= 16):
             return jsonify({"error": "Número de pontos deve estar entre 4 e 16."}), 400

        result = controller.calculate_regional_fire_risk(lat, lon, radius, num_points)
        return jsonify(result)
    except ValueError as ve:
        print(f"Erro de valor nos parâmetros: {ve}")
        return jsonify({"error": "Parâmetros inválidos. Verifique lat, lon, radius e num_points."}), 400
    except Exception as e:
        # Capturar e logar o erro específico que pode vir do controller
        error_message = f"Erro ao calcular risco regional para ({request.args.get('lat')}, {request.args.get('lon')}): {e}"
        print(error_message)
        traceback.print_exc() # Imprime o traceback completo no log do servidor
        # Retornar uma mensagem de erro genérica para o cliente
        return jsonify({"error": "Ocorreu um erro ao processar a análise regional."}), 500

@fire_risk_bp.route("/risk/map", methods=["GET"])
def show_risk_map():
    """
    Página para visualização do mapa de risco de incêndio.
    
    Returns:
        HTML: Página com mapa interativo
    """
    return render_template("risk_map.html")

@fire_risk_bp.route("/risk/dashboard", methods=["GET"])
def show_dashboard():
    """
    Dashboard com visualizações de risco de incêndio.
    
    Returns:
        HTML: Página com dashboard
    """
    return render_template("dashboard.html")

