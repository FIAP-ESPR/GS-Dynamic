"""
Modelos para o banco de dados SQLite.
"""
import sqlite3
import os
import json
from datetime import datetime

class DatabaseManager:
    """
    Gerenciador de banco de dados SQLite para o sistema de emergências.
    """
    
    def __init__(self, db_path='/home/ubuntu/fire-risk-app/src/data/emergency.db'):
        """
        Inicializa o gerenciador de banco de dados.
        
        Args:
            db_path (str): Caminho para o arquivo do banco de dados
        """
        # Garantir que o diretório existe
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        self.db_path = db_path
        self.conn = None
        self.cursor = None
        
        # Inicializar banco de dados
        self.initialize_db()
    
    def connect(self):
        """
        Estabelece conexão com o banco de dados.
        """
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row  # Para retornar resultados como dicionários
        self.cursor = self.conn.cursor()
    
    def disconnect(self):
        """
        Fecha a conexão com o banco de dados.
        """
        if self.conn:
            self.conn.close()
            self.conn = None
            self.cursor = None
    
    def initialize_db(self):
        """
        Inicializa o banco de dados com as tabelas necessárias.
        """
        self.connect()
        
        # Tabela de chamados de emergência
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS emergency_calls (
            id INTEGER PRIMARY KEY,
            local TEXT NOT NULL,
            severidade INTEGER NOT NULL,
            tipo_vegetacao TEXT NOT NULL,
            clima TEXT NOT NULL,
            status TEXT NOT NULL,
            prioridade REAL NOT NULL,
            data_criacao TEXT NOT NULL
        )
        ''')
        
        # Tabela de equipes
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS teams (
            id INTEGER PRIMARY KEY,
            nome TEXT NOT NULL,
            base TEXT NOT NULL,
            status TEXT NOT NULL
        )
        ''')
        
        # Tabela de ações das equipes
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS team_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            team_id INTEGER NOT NULL,
            emergency_id INTEGER,
            action TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (team_id) REFERENCES teams (id),
            FOREIGN KEY (emergency_id) REFERENCES emergency_calls (id)
        )
        ''')
        
        # Tabela de áreas afetadas
        self.cursor.execute('''
        CREATE TABLE IF NOT EXISTS affected_areas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            emergency_id INTEGER NOT NULL,
            local TEXT NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY (emergency_id) REFERENCES emergency_calls (id)
        )
        ''')
        
        # Inserir equipes padrão se não existirem
        self.cursor.execute('SELECT COUNT(*) FROM teams')
        if self.cursor.fetchone()[0] == 0:
            default_teams = [
                (1, 'Equipe Alpha', 'Base Central', 'disponível'),
                (2, 'Equipe Bravo', 'Base Central', 'disponível'),
                (3, 'Equipe Charlie', 'Vila Verde', 'disponível')
            ]
            self.cursor.executemany('INSERT INTO teams VALUES (?, ?, ?, ?)', default_teams)
        
        self.conn.commit()
        self.disconnect()
    
    def add_emergency_call(self, local, severidade, tipo_vegetacao, clima):
        """
        Adiciona um novo chamado de emergência.
        
        Args:
            local (str): Local do chamado
            severidade (int): Nível de severidade (1-5)
            tipo_vegetacao (str): Tipo de vegetação
            clima (str): Condição climática
        
        Returns:
            int: ID do chamado criado
        """
        self.connect()
        
        # Calcular prioridade
        vegetacao_pesos = {
            'cerrado': 1.2,
            'mata_atlantica': 1.5,
            'pantanal': 2.0
        }
        peso = vegetacao_pesos.get(tipo_vegetacao, 1.0)
        prioridade = severidade * peso
        
        # Obter próximo ID
        self.cursor.execute('SELECT MAX(id) FROM emergency_calls')
        result = self.cursor.fetchone()[0]
        next_id = 1 if result is None else result + 1
        
        # Inserir chamado
        self.cursor.execute('''
        INSERT INTO emergency_calls 
        (id, local, severidade, tipo_vegetacao, clima, status, prioridade, data_criacao)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            next_id,
            local,
            severidade,
            tipo_vegetacao,
            clima,
            'pendente',
            prioridade,
            datetime.now().isoformat()
        ))
        
        # Adicionar à lista de áreas afetadas
        self.cursor.execute('''
        INSERT INTO affected_areas
        (emergency_id, local, status)
        VALUES (?, ?, ?)
        ''', (
            next_id,
            local,
            'ativo'
        ))
        
        self.conn.commit()
        self.disconnect()
        
        return next_id
    
    def get_emergency_calls(self):
        """
        Obtém todos os chamados de emergência ordenados por prioridade.
        
        Returns:
            list: Lista de chamados
        """
        self.connect()
        
        self.cursor.execute('''
        SELECT * FROM emergency_calls
        ORDER BY prioridade DESC
        ''')
        
        calls = [dict(row) for row in self.cursor.fetchall()]
        
        self.disconnect()
        
        return calls
    
    def get_teams(self):
        """
        Obtém todas as equipes.
        
        Returns:
            list: Lista de equipes
        """
        self.connect()
        
        self.cursor.execute('SELECT * FROM teams')
        
        teams = [dict(row) for row in self.cursor.fetchall()]
        
        self.disconnect()
        
        return teams
    
    def update_team_status(self, team_id, status):
        """
        Atualiza o status de uma equipe.
        
        Args:
            team_id (int): ID da equipe
            status (str): Novo status
        
        Returns:
            bool: True se atualizado com sucesso
        """
        self.connect()
        
        self.cursor.execute('''
        UPDATE teams
        SET status = ?
        WHERE id = ?
        ''', (status, team_id))
        
        self.conn.commit()
        self.disconnect()
        
        return True
    
    def update_emergency_status(self, emergency_id, status):
        """
        Atualiza o status de um chamado de emergência.
        
        Args:
            emergency_id (int): ID do chamado
            status (str): Novo status
        
        Returns:
            bool: True se atualizado com sucesso
        """
        self.connect()
        
        self.cursor.execute('''
        UPDATE emergency_calls
        SET status = ?
        WHERE id = ?
        ''', (status, emergency_id))
        
        self.conn.commit()
        self.disconnect()
        
        return True
    
    def update_area_status(self, emergency_id, status):
        """
        Atualiza o status de uma área afetada.
        
        Args:
            emergency_id (int): ID do chamado
            status (str): Novo status
        
        Returns:
            bool: True se atualizado com sucesso
        """
        self.connect()
        
        self.cursor.execute('''
        UPDATE affected_areas
        SET status = ?
        WHERE emergency_id = ?
        ''', (status, emergency_id))
        
        self.conn.commit()
        self.disconnect()
        
        return True
    
    def add_team_action(self, team_id, emergency_id, action):
        """
        Adiciona uma ação à pilha de ações de uma equipe.
        
        Args:
            team_id (int): ID da equipe
            emergency_id (int): ID do chamado
            action (str): Descrição da ação
        
        Returns:
            bool: True se adicionado com sucesso
        """
        self.connect()
        
        self.cursor.execute('''
        INSERT INTO team_actions
        (team_id, emergency_id, action, timestamp)
        VALUES (?, ?, ?, ?)
        ''', (
            team_id,
            emergency_id,
            action,
            datetime.now().isoformat()
        ))
        
        self.conn.commit()
        self.disconnect()
        
        return True
    
    def get_team_actions(self, team_id):
        """
        Obtém todas as ações de uma equipe.
        
        Args:
            team_id (int): ID da equipe
        
        Returns:
            list: Lista de ações
        """
        self.connect()
        
        self.cursor.execute('''
        SELECT * FROM team_actions
        WHERE team_id = ?
        ORDER BY timestamp DESC
        ''', (team_id,))
        
        actions = [dict(row) for row in self.cursor.fetchall()]
        
        self.disconnect()
        
        return actions
    
    def assign_team_to_emergency(self, team_id, emergency_id, actions):
        """
        Atribui uma equipe a um chamado de emergência.
        
        Args:
            team_id (int): ID da equipe
            emergency_id (int): ID do chamado
            actions (list): Lista de ações a realizar
        
        Returns:
            bool: True se atribuído com sucesso
        """
        # Atualizar status da equipe
        self.update_team_status(team_id, 'em missão')
        
        # Atualizar status do chamado
        self.update_emergency_status(emergency_id, 'em_atendimento')
        
        # Atualizar status da área
        self.update_area_status(emergency_id, 'controle em andamento')
        
        # Registrar ações
        for action in actions:
            self.add_team_action(team_id, emergency_id, action)
        
        return True
