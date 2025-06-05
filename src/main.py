"""
Arquivo principal da aplicação Flask.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))  # DON'T CHANGE THIS !!!

from flask import Flask, render_template, send_from_directory
from src.routes.fire_risk import fire_risk_bp
from src.routes.emergency_dispatch import emergency_dispatch_bp

app = Flask(__name__)

# Registrar blueprints
app.register_blueprint(fire_risk_bp)
app.register_blueprint(emergency_dispatch_bp)

# Rota principal
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/emergency')
def emergency():
    return render_template('emergency_dispatch.html')

# Rota para servir arquivos estáticos da pasta static
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

# Configurar variáveis de ambiente para as APIs
os.environ['OPENWEATHER_API_KEY'] = 'd62661d391222e279b7f701301e788cf'  # Substituir pela chave real em produção
os.environ['GOOGLE_MAPS_API_KEY'] = 'AIzaSyBQqKvaAGMz2l2aQ5zi8LoPgBxC_XV_PJ0'  # Substituir pela chave real em produção

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
