# Sistema de Monitorização de Risco de Incêndio

**Grupo:**
- Vinicius Silva - RM553240
- Victor Didoff - RM552965
- Matheus Zottis - RM94119

## Sobre o Projeto

O Sistema de Monitorização de Risco de Incêndio é uma aplicação web desenvolvida em Flask que integra as APIs OpenWeather e Maps para analisar e visualizar o risco de incêndios florestais em diferentes regiões. O sistema utiliza dados meteorológicos em tempo real para calcular índices de risco e apresenta visualizações interativas, incluindo mapas de calor, gráficos comparativos e análise regional baseada em estrutura de grafos.

## Funcionalidades

- **Mapa Interativo**: Permite selecionar áreas específicas para análise de risco
- **Dashboard Analítico**: Visualização detalhada de dados meteorológicos e índices de risco
- **Mapa de Calor Regional**: Visualização da distribuição de risco em uma região
- **Análise Comparativa**: Comparação entre o ponto central e regiões vizinhas
- **Estrutura de Grafo**: Análise de relações entre pontos geográficos próximos
- **Cálculo de Risco**: Algoritmo que considera temperatura, humidade, vento e precipitação
- **Calculo de Distancia**: Algoritmo de dijkstra
- **Listagem dos chamados**: Armazenados por HEAP ou Por Queue
- **Squads Infos**: Pilhas

## Requisitos

- Python 3.8 ou superior
- Conexão com a internet (para acesso às APIs)
- Navegador web moderno

## Dependências

As principais dependências do projeto estão listadas no arquivo `requirements.txt` e incluem:

- Flask
- Requests
- Folium
- Matplotlib
- NetworkX
- NumPy

## Instalação

1. Clone ou baixe este repositório para sua máquina local
2. Instale as dependências necessárias:

```bash
pip install -r requirements.txt
```

## Configuração

Para utilizar o sistema com dados reais, você precisará de chaves de API:

1. **OpenWeather API**: Obtenha uma chave em [https://openweathermap.org/api](https://openweathermap.org/api)
2. **Google Maps API**: Obtenha uma chave em [https://developers.google.com/maps](https://developers.google.com/maps)

Configure as chaves de API no arquivo `src/main.py`:

```python
# Configurar chaves de API
os.environ["OPENWEATHER_API_KEY"] = "sua_chave_openweather_aqui"
os.environ["GOOGLE_MAPS_API_KEY"] = "sua_chave_google_maps_aqui"
```

## Execução

Para iniciar o servidor localmente:

```bash
python src/main.py
```

Após iniciar o servidor, acesse a aplicação em seu navegador:

```
http://localhost:5000
```

## Estrutura do Projeto

```
fire-risk-app/
├── requirements.txt      # Dependências do projeto
├── src/                  # Código-fonte da aplicação
│   ├── main.py           # Ponto de entrada da aplicação
│   ├── models/           # Modelos e serviços
│   │   ├── emergency_db.py               # Consistencia na Informacao
│   │   ├── emergency_dispatch_service.py # Integracoes das APIs de gerenciamento
│   │   ├── fire_risk.py                  # Cálculo de risco de incêndio
│   │   ├── fire_risk_controller.py       # Controlador principal
│   │   ├── graph_service.py              # Serviço de grafo para análise regional
│   │   ├── maps_service.py               # Integração com Maps API
│   │   ├── openweather_service.py        # Integração com OpenWeather API
│   │   ├── user.py                       # User Log and DB
│   │   └── weather_data.py               # Modelo de dados meteorológicos
│   ├── routes/                   # Rotas da API e páginas web
|   |   ├── emergency_dispatch.py # Endpoints da API de gerenciamento
│   │   ├── fire_risk.py          # Endpoints da API de risco
│   │   └── user.py               # User Log and DB
│   ├── static/           # Arquivos estáticos
│   │   ├── css/          # Folhas de estilo
│   │   ├── img/          # Imagens
│   │   └── js/           # Scripts JavaScript
│   └── templates/        # Templates HTML
│       ├── dashboard.html           # Página do dashboard 
│       ├── emergency_dispatch.html  # Página do gerenciamento
│       ├── index.html               # Página inicial
│       └── risk_map.html            # Página do mapa de risco
└── README.md             # Este arquivo
```
## Layouts

### Tela Inicial
![image](https://github.com/user-attachments/assets/e1e3f16e-ce3e-4b63-b775-f30f349165fa)

### Mapa de Risco
![image](https://github.com/user-attachments/assets/51a55133-ac2c-4407-a0a8-342757172c24)
![image](https://github.com/user-attachments/assets/dcbd1b89-888e-40de-b0f0-e8602403d8d6)
![image](https://github.com/user-attachments/assets/c958bc5e-f346-40c1-a414-167dd08f0230)

### DashBoard
![image](https://github.com/user-attachments/assets/bbd83a8b-b014-41a2-b5ca-4528e5dda61a)
![image](https://github.com/user-attachments/assets/bd3f97ed-4a14-4910-912a-f82920fd7368)
![image](https://github.com/user-attachments/assets/702534ec-2397-459d-8695-341a7958f95b)
![image](https://github.com/user-attachments/assets/a93f6ec5-b963-45d7-81f8-18f1b592dbc6)

### Gestao de Emergencias
![image](https://github.com/user-attachments/assets/cdb49202-ae56-46ba-ae87-d3ea794a6cec)
![image](https://github.com/user-attachments/assets/dc51b399-7c29-4c3d-95fd-bc5b50c80cb2)

## Uso do Sistema

### Mapa de Risco

1. Acesse a página "Mapa de Risco" no menu de navegação
2. Clique no botão de desenho no canto superior esquerdo do mapa
3. Desenhe um retângulo na área que deseja analisar
4. Visualize os resultados no painel lateral
5. Alterne entre visualização de mapa de risco e mapa de calor usando os botões no topo

### Dashboard

1. Acesse a página "Dashboard" no menu de navegação
2. Pesquise por coordenadas específicas ou nome de cidade
3. Ajuste o raio e número de pontos para análise regional
4. Visualize os dados meteorológicos, índice de risco, mapa de calor e gráficos comparativos
5. Explore a análise de fatores de risco e comparação regional

## Cálculo do Risco de Incêndio

O índice de risco é calculado considerando quatro fatores principais:

1. **Temperatura**: Temperaturas mais altas aumentam o risco
2. **Humidade**: Baixa humidade aumenta o risco
3. **Vento**: Ventos fortes aumentam o risco
4. **Precipitação**: Baixa precipitação aumenta o risco

A fórmula utiliza pesos diferentes para cada fator e normaliza o resultado em uma escala de 0 a 100.

## Análise Regional com Grafos

O sistema utiliza uma estrutura de grafo para analisar a região ao redor do ponto selecionado:

1. Um nó central representa o ponto de interesse
2. Nós vizinhos são distribuídos em círculo ao redor do centro
3. Conexões entre nós representam proximidade geográfica
4. Cada nó contém dados meteorológicos e índice de risco
5. A análise comparativa mostra diferenças entre o centro e a média regional

## Limitações Conhecidas

- O sistema utiliza chaves de API de demonstração por padrão, o que limita o número de requisições
- A precisão do cálculo de risco depende da qualidade dos dados meteorológicos disponíveis
- Algumas regiões remotas podem não ter dados meteorológicos detalhados

## Solução de Problemas

- **Erro ao carregar o mapa**: Verifique sua conexão com a internet e se as APIs estão acessíveis
- **Erro 401 Unauthorized**: Verifique se suas chaves de API estão configuradas corretamente
- **Erro ao calcular risco regional**: Tente reduzir o número de pontos ou o raio da análise
