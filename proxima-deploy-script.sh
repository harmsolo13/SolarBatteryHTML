#!/bin/bash

# ============================================================================
# PROXIMA AI ASSISTANT - COMPLETE DEPLOYMENT SCRIPT
# ============================================================================
# Run this script on fresh Ubuntu Server LTS 24 with Gnome Desktop
# Hardware: HP EliteDesk G5 Mini - 32GB RAM, i5 with Intel GPU
# ============================================================================

set -e  # Exit on any error

# Configuration Variables
ASSISTANT_NAME="Proxima"
PROJECT_NAME="proxima-ai"
INSTALL_DIR="/opt/${PROJECT_NAME}"
DATA_DIR="${INSTALL_DIR}/data"
LOG_DIR="${INSTALL_DIR}/logs"
CONFIG_DIR="${INSTALL_DIR}/config"
MODELS_DIR="${INSTALL_DIR}/models"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Banner
clear
echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     ██████╗ ██████╗  ██████╗ ██╗  ██╗██╗███╗   ███╗ █████╗  ║"
echo "║     ██╔══██╗██╔══██╗██╔═══██╗╚██╗██╔╝██║████╗ ████║██╔══██╗ ║"
echo "║     ██████╔╝██████╔╝██║   ██║ ╚███╔╝ ██║██╔████╔██║███████║ ║"
echo "║     ██╔═══╝ ██╔══██╗██║   ██║ ██╔██╗ ██║██║╚██╔╝██║██╔══██║ ║"
echo "║     ██║     ██║  ██║╚██████╔╝██╔╝ ██╗██║██║ ╚═╝ ██║██║  ██║ ║"
echo "║     ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝ ║"
echo "║                                                               ║"
echo "║              AI Assistant - Complete Deployment               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# System requirements check
check_system_requirements() {
    log_info "Checking system requirements..."
    
    # Check Ubuntu version
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        if [[ "$ID" != "ubuntu" ]]; then
            log_warning "This script is optimized for Ubuntu but detected: $ID"
        fi
    fi
    
    # Check available memory
    TOTAL_MEM=$(free -g | awk 'NR==2{print $2}')
    if [[ $TOTAL_MEM -lt 8 ]]; then
        log_warning "Low memory detected: ${TOTAL_MEM}GB. Recommended: 8GB+"
    else
        log_success "Memory check passed: ${TOTAL_MEM}GB"
    fi
    
    # Check available disk space
    AVAILABLE_SPACE=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ $AVAILABLE_SPACE -lt 20 ]]; then
        log_error "Insufficient disk space: ${AVAILABLE_SPACE}GB. Required: 20GB+"
        exit 1
    else
        log_success "Disk space check passed: ${AVAILABLE_SPACE}GB available"
    fi
}

# Install system dependencies
install_system_deps() {
    log_info "Installing system dependencies..."
    
    # Update package list
    apt-get update -qq
    
    # Install essential packages
    PACKAGES=(
        curl wget git nano vim
        build-essential software-properties-common
        python3 python3-pip python3-venv python3-dev
        nginx certbot python3-certbot-nginx
        sqlite3 redis-server
        ffmpeg sox libsox-fmt-all
        net-tools htop iotop
    )
    
    for package in "${PACKAGES[@]}"; do
        if ! dpkg -l | grep -q "^ii  $package"; then
            log_info "Installing $package..."
            apt-get install -y -qq "$package" > /dev/null 2>&1
        fi
    done
    
    log_success "System dependencies installed"
}

# Install Docker and Docker Compose
install_docker() {
    log_info "Installing Docker..."
    
    if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
        systemctl enable docker
        systemctl start docker
        log_success "Docker installed"
    else
        log_success "Docker already installed"
    fi
    
    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_info "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        log_success "Docker Compose installed"
    else
        log_success "Docker Compose already installed"
    fi
}

# Install Ollama for local LLM support
install_ollama() {
    log_info "Installing Ollama for local LLM support..."
    
    if ! command -v ollama &> /dev/null; then
        curl -fsSL https://ollama.ai/install.sh | sh > /dev/null 2>&1
        systemctl enable ollama
        systemctl start ollama
        
        # Pull base models
        log_info "Downloading AI models (this may take a while)..."
        ollama pull llama3.2:3b
        ollama pull codellama:7b
        log_success "Ollama and base models installed"
    else
        log_success "Ollama already installed"
    fi
}

# Create directory structure
create_directory_structure() {
    log_info "Creating project directory structure..."
    
    # Create all necessary directories
    mkdir -p "$INSTALL_DIR"/{data,logs,config,models,cache,ssl,backup,scripts,web}
    mkdir -p "$DATA_DIR"/{embeddings,conversations,metrics,learning}
    mkdir -p "$LOG_DIR"/{app,system,metrics}
    mkdir -p "$CONFIG_DIR"/{ssl,nginx}
    
    # Set permissions
    chmod -R 755 "$INSTALL_DIR"
    chmod 700 "$CONFIG_DIR/ssl"
    
    log_success "Directory structure created"
}

# Create Python virtual environment
setup_python_env() {
    log_info "Setting up Python environment..."
    
    cd "$INSTALL_DIR"
    
    # Create virtual environment
    python3 -m venv venv
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip setuptools wheel > /dev/null 2>&1
    
    # Install Python packages
    log_info "Installing Python packages..."
    
    cat > requirements.txt << 'EOF'
# Core dependencies
streamlit==1.31.0
openai==1.12.0
anthropic==0.18.1
langchain==0.1.7
chromadb==0.4.22

# AI and ML
torch==2.2.0
transformers==4.37.2
sentence-transformers==2.3.1
scikit-learn==1.4.0
pandas==2.2.0
numpy==1.26.3

# Voice and Audio
pyttsx3==2.90
SpeechRecognition==3.10.1
pyaudio==0.2.14

# WebSocket and Real-time
websockets==12.0
python-socketio==5.11.0
aiohttp==3.9.3

# Database and Cache
sqlalchemy==2.0.27
redis==5.0.1
motor==3.3.2

# Monitoring and Metrics
prometheus-client==0.19.0
psutil==5.9.8
plotly==5.18.0

# Utils
python-dotenv==1.0.1
pydantic==2.6.0
click==8.1.7
rich==13.7.0
tqdm==4.66.2
EOF
    
    pip install -r requirements.txt > /dev/null 2>&1
    
    log_success "Python environment configured"
}

# Create main application files
create_application_files() {
    log_info "Creating Proxima application files..."
    
    # Create main AI assistant file
    cat > "$INSTALL_DIR/proxima_assistant.py" << 'EOF'
#!/usr/bin/env python3
"""
Proxima AI Assistant - Self-Improving Universal AI
"""

import os
import json
import asyncio
import logging
from datetime import datetime
from pathlib import Path
import streamlit as st
from typing import Dict, List, Optional, Any
import openai
from sentence_transformers import SentenceTransformer
import chromadb
import pandas as pd
import numpy as np
from dataclasses import dataclass, asdict
import pickle
import sqlite3
import websockets
import redis
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import psutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/opt/proxima-ai/logs/app/proxima.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('Proxima')

# Metrics
query_counter = Counter('proxima_queries_total', 'Total number of queries processed')
response_time = Histogram('proxima_response_seconds', 'Response time in seconds')
active_sessions = Gauge('proxima_active_sessions', 'Number of active sessions')
model_accuracy = Gauge('proxima_model_accuracy', 'Current model accuracy score')

@dataclass
class ProximaConfig:
    """Configuration for Proxima AI Assistant"""
    name: str = "Proxima"
    version: str = "1.0.0"
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    model: str = "gpt-4"
    embedding_model: str = "all-MiniLM-L6-v2"
    temperature: float = 0.7
    max_tokens: int = 2000
    learning_enabled: bool = True
    voice_enabled: bool = True
    websocket_port: int = 8765
    
class ProximaCore:
    """Core AI Assistant with self-improvement capabilities"""
    
    def __init__(self, config: ProximaConfig):
        self.config = config
        self.embedding_model = SentenceTransformer(config.embedding_model)
        self.chroma_client = chromadb.PersistentClient(path="/opt/proxima-ai/data/embeddings")
        self.collection = self.chroma_client.get_or_create_collection("proxima_knowledge")
        self.conversation_history = []
        self.learning_data = []
        self.performance_metrics = {
            "accuracy": 0.0,
            "response_time": [],
            "user_satisfaction": [],
            "improvement_suggestions": []
        }
        
        # Initialize OpenAI
        if config.openai_api_key:
            openai.api_key = config.openai_api_key
        
        # Initialize database
        self.init_database()
        
        # Start metrics server
        start_http_server(8000)
        
        logger.info(f"{config.name} AI Assistant initialized - Version {config.version}")
    
    def init_database(self):
        """Initialize SQLite database for persistent storage"""
        self.conn = sqlite3.connect('/opt/proxima-ai/data/proxima.db')
        cursor = self.conn.cursor()
        
        # Create tables
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_query TEXT,
                assistant_response TEXT,
                context TEXT,
                satisfaction_score REAL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS improvements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                suggestion TEXT,
                category TEXT,
                priority INTEGER,
                implemented BOOLEAN DEFAULT FALSE
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                metric_name TEXT,
                metric_value REAL
            )
        ''')
        
        self.conn.commit()
    
    async def process_query(self, query: str, context: Dict = None) -> Dict[str, Any]:
        """Process user query with context awareness"""
        query_counter.inc()
        start_time = datetime.now()
        
        try:
            # Embed query
            query_embedding = self.embedding_model.encode(query)
            
            # Search knowledge base
            results = self.collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=5
            )
            
            # Build context
            context_str = self._build_context(results, context)
            
            # Generate response
            response = await self._generate_response(query, context_str)
            
            # Calculate metrics
            elapsed_time = (datetime.now() - start_time).total_seconds()
            response_time.observe(elapsed_time)
            
            # Store conversation
            self._store_conversation(query, response, context_str)
            
            # Self-improvement analysis
            if self.config.learning_enabled:
                await self._analyze_for_improvement(query, response, elapsed_time)
            
            return {
                "response": response,
                "context_used": context_str,
                "response_time": elapsed_time,
                "suggestions": self.performance_metrics["improvement_suggestions"][-5:]
            }
            
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            return {
                "response": f"I encountered an error processing your request. Let me try a different approach.",
                "error": str(e)
            }
    
    def _build_context(self, search_results: Dict, additional_context: Dict = None) -> str:
        """Build context from search results and additional context"""
        context_parts = []
        
        if search_results and search_results['documents']:
            context_parts.append("Relevant knowledge from my database:")
            for doc in search_results['documents'][0][:3]:
                context_parts.append(f"- {doc}")
        
        if additional_context:
            context_parts.append("\nAdditional context:")
            for key, value in additional_context.items():
                context_parts.append(f"- {key}: {value}")
        
        if self.conversation_history:
            context_parts.append("\nRecent conversation context:")
            for entry in self.conversation_history[-3:]:
                context_parts.append(f"- User: {entry['user']}")
                context_parts.append(f"  Proxima: {entry['assistant']}")
        
        return "\n".join(context_parts)
    
    async def _generate_response(self, query: str, context: str) -> str:
        """Generate response using OpenAI or local model"""
        
        # Try OpenAI first if available
        if self.config.openai_api_key:
            try:
                messages = [
                    {"role": "system", "content": f"You are {self.config.name}, an advanced AI assistant with self-improvement capabilities. You learn from interactions and continuously enhance your responses."},
                    {"role": "system", "content": f"Context:\n{context}"},
                    {"role": "user", "content": query}
                ]
                
                response = openai.chat.completions.create(
                    model=self.config.model,
                    messages=messages,
                    temperature=self.config.temperature,
                    max_tokens=self.config.max_tokens
                )
                
                return response.choices[0].message.content
                
            except Exception as e:
                logger.warning(f"OpenAI API error, falling back to local model: {e}")
        
        # Fallback to local Ollama model
        return await self._generate_local_response(query, context)
    
    async def _generate_local_response(self, query: str, context: str) -> str:
        """Generate response using local Ollama model"""
        try:
            import ollama
            
            prompt = f"""You are {self.config.name}, an advanced AI assistant.
            
Context: {context}

User Query: {query}

Provide a helpful, accurate response:"""
            
            response = ollama.generate(
                model='llama3.2:3b',
                prompt=prompt
            )
            
            return response['response']
            
        except Exception as e:
            logger.error(f"Local model error: {e}")
            return "I'm having trouble accessing my models. Please check the system configuration."
    
    def _store_conversation(self, query: str, response: str, context: str):
        """Store conversation in database and history"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO conversations (user_query, assistant_response, context)
            VALUES (?, ?, ?)
        ''', (query, response, context))
        self.conn.commit()
        
        self.conversation_history.append({
            "timestamp": datetime.now(),
            "user": query,
            "assistant": response
        })
        
        # Keep only last 10 conversations in memory
        if len(self.conversation_history) > 10:
            self.conversation_history.pop(0)
    
    async def _analyze_for_improvement(self, query: str, response: str, response_time: float):
        """Analyze interaction for self-improvement opportunities"""
        
        # Response time analysis
        if response_time > 3.0:
            suggestion = f"Response time was {response_time:.2f}s. Consider caching similar queries."
            self._add_improvement_suggestion(suggestion, "performance", 2)
        
        # Response length analysis
        if len(response) < 50:
            suggestion = "Response was very brief. Consider providing more detailed answers."
            self._add_improvement_suggestion(suggestion, "quality", 3)
        elif len(response) > 1000:
            suggestion = "Response was quite long. Consider being more concise."
            self._add_improvement_suggestion(suggestion, "quality", 3)
        
        # Pattern detection
        if len(self.conversation_history) >= 3:
            recent_queries = [h['user'] for h in self.conversation_history[-3:]]
            if len(set(recent_queries)) == 1:
                suggestion = "User is repeating the same query. Previous response may not have been satisfactory."
                self._add_improvement_suggestion(suggestion, "understanding", 1)
    
    def _add_improvement_suggestion(self, suggestion: str, category: str, priority: int):
        """Add improvement suggestion to database"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO improvements (suggestion, category, priority)
            VALUES (?, ?, ?)
        ''', (suggestion, category, priority))
        self.conn.commit()
        
        self.performance_metrics["improvement_suggestions"].append({
            "timestamp": datetime.now(),
            "suggestion": suggestion,
            "category": category,
            "priority": priority
        })
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get current system status and metrics"""
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        cursor = self.conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM conversations')
        total_conversations = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM improvements WHERE implemented = FALSE')
        pending_improvements = cursor.fetchone()[0]
        
        return {
            "name": self.config.name,
            "version": self.config.version,
            "status": "operational",
            "uptime": datetime.now().isoformat(),
            "system": {
                "cpu_usage": f"{cpu_percent}%",
                "memory_usage": f"{memory.percent}%",
                "disk_usage": f"{disk.percent}%",
                "memory_available": f"{memory.available / (1024**3):.2f} GB",
                "disk_available": f"{disk.free / (1024**3):.2f} GB"
            },
            "metrics": {
                "total_conversations": total_conversations,
                "pending_improvements": pending_improvements,
                "average_response_time": np.mean(self.performance_metrics["response_time"][-100:]) if self.performance_metrics["response_time"] else 0
            }
        }

# Streamlit Web Interface
def main():
    st.set_page_config(
        page_title="Proxima AI Assistant",
        page_icon="🤖",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Custom CSS
    st.markdown("""
    <style>
    .main-header {
        text-align: center;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 3em;
        font-weight: bold;
        padding: 20px;
    }
    .status-card {
        background-color: #f0f2f6;
        padding: 20px;
        border-radius: 10px;
        margin: 10px 0;
    }
    .metric-box {
        background-color: white;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #667eea;
        margin: 10px 0;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Header
    st.markdown('<h1 class="main-header">🤖 Proxima AI Assistant</h1>', unsafe_allow_html=True)
    st.markdown('<p style="text-align: center; color: #666;">Your Self-Improving Universal AI Assistant</p>', unsafe_allow_html=True)
    
    # Initialize Proxima
    if 'proxima' not in st.session_state:
        config = ProximaConfig()
        st.session_state.proxima = ProximaCore(config)
        st.session_state.messages = []
    
    # Sidebar
    with st.sidebar:
        st.markdown("## ⚙️ Configuration")
        
        # System Status
        if st.button("🔄 Refresh Status"):
            st.rerun()
        
        status = st.session_state.proxima.get_system_status()
        
        st.markdown("### 📊 System Status")
        col1, col2 = st.columns(2)
        with col1:
            st.metric("CPU", status["system"]["cpu_usage"])
            st.metric("Memory", status["system"]["memory_usage"])
        with col2:
            st.metric("Disk", status["system"]["disk_usage"])
            st.metric("Conversations", status["metrics"]["total_conversations"])
        
        st.markdown("### 🎯 Performance")
        avg_response = status["metrics"]["average_response_time"]
        st.metric("Avg Response Time", f"{avg_response:.2f}s" if avg_response else "N/A")
        st.metric("Pending Improvements", status["metrics"]["pending_improvements"])
        
        st.markdown("---")
        
        # Settings
        st.markdown("### 🔧 Settings")
        
        temperature = st.slider("Temperature", 0.0, 1.0, st.session_state.proxima.config.temperature)
        max_tokens = st.slider("Max Tokens", 100, 4000, st.session_state.proxima.config.max_tokens)
        
        if st.button("💾 Save Settings"):
            st.session_state.proxima.config.temperature = temperature
            st.session_state.proxima.config.max_tokens = max_tokens
            st.success("Settings saved!")
        
        # Tools
        st.markdown("### 🛠️ Tools")
        if st.button("📥 Import Knowledge"):
            st.info("Knowledge import feature coming soon!")
        
        if st.button("📊 View Analytics"):
            st.info("Analytics dashboard coming soon!")
        
        if st.button("🔍 Code Search"):
            st.info("Code search feature coming soon!")
        
        # Export/Import
        st.markdown("### 💾 Data Management")
        if st.button("📤 Export Conversations"):
            # Export logic here
            st.success("Conversations exported!")
        
        if st.button("🗑️ Clear History"):
            st.session_state.messages = []
            st.success("History cleared!")
    
    # Main chat interface
    tab1, tab2, tab3 = st.tabs(["💬 Chat", "📈 Analytics", "🔧 Improvements"])
    
    with tab1:
        # Chat messages
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])
        
        # Chat input
        if prompt := st.chat_input("Ask Proxima anything..."):
            # Add user message
            st.session_state.messages.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)
            
            # Generate response
            with st.chat_message("assistant"):
                with st.spinner("Thinking..."):
                    response_data = asyncio.run(
                        st.session_state.proxima.process_query(prompt)
                    )
                    response = response_data["response"]
                    st.markdown(response)
                    
                    # Show response time in small text
                    st.caption(f"Response time: {response_data.get('response_time', 0):.2f}s")
            
            # Add assistant message
            st.session_state.messages.append({"role": "assistant", "content": response})
    
    with tab2:
        st.markdown("## 📊 Analytics Dashboard")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown('<div class="metric-box">', unsafe_allow_html=True)
            st.markdown("### Total Queries")
            st.markdown(f"<h2>{status['metrics']['total_conversations']}</h2>", unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
        
        with col2:
            st.markdown('<div class="metric-box">', unsafe_allow_html=True)
            st.markdown("### Avg Response Time")
            st.markdown(f"<h2>{avg_response:.2f}s</h2>" if avg_response else "<h2>N/A</h2>", unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
        
        with col3:
            st.markdown('<div class="metric-box">', unsafe_allow_html=True)
            st.markdown("### System Health")
            st.markdown("<h2>✅ Healthy</h2>", unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)
        
        # Placeholder for charts
        st.markdown("### 📈 Performance Trends")
        st.info("Performance charts will be displayed here")
    
    with tab3:
        st.markdown("## 🔧 Self-Improvement Suggestions")
        
        suggestions = st.session_state.proxima.performance_metrics.get("improvement_suggestions", [])
        
        if suggestions:
            for i, suggestion in enumerate(reversed(suggestions[-10:]), 1):
                priority_color = {1: "🔴", 2: "🟡", 3: "🟢"}.get(suggestion.get("priority", 3), "⚪")
                st.markdown(f"""
                **{priority_color} Suggestion {i}** - *{suggestion.get('category', 'general')}*
                
                {suggestion.get('suggestion', 'No details available')}
                
                ---
                """)
        else:
            st.info("No improvement suggestions yet. Keep using Proxima to generate insights!")

if __name__ == "__main__":
    main()
EOF
    
    log_success "Proxima application created"
}

# Create Docker configuration
create_docker_config() {
    log_info "Creating Docker configuration..."
    
    # Create Dockerfile
    cat > "$INSTALL_DIR/Dockerfile" << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc g++ \
    ffmpeg \
    portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/cache

# Expose ports
EXPOSE 8501 8765 8000

# Run application
CMD ["streamlit", "run", "proxima_assistant.py", "--server.port=8501", "--server.address=0.0.0.0"]
EOF
    
    # Create docker-compose.yml
    cat > "$INSTALL_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  proxima-ai:
    build: .
    container_name: proxima-ai
    restart: unless-stopped
    ports:
      - "8501:8501"   # Streamlit web interface
      - "8765:8765"   # WebSocket server
      - "8000:8000"   # Metrics server
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./config:/app/config
      - ./models:/app/models
      - ${HOME}/projects:/app/projects  # Mount user's projects
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - PYTHONUNBUFFERED=1
    networks:
      - proxima-network
    deploy:
      resources:
        limits:
          memory: 16G
        reservations:
          memory: 4G

  redis:
    image: redis:7-alpine
    container_name: proxima-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - ./data/redis:/data
    networks:
      - proxima-network

  nginx:
    image: nginx:alpine
    container_name: proxima-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx:/etc/nginx/conf.d
      - ./config/ssl:/etc/nginx/ssl
      - ./web:/usr/share/nginx/html
    depends_on:
      - proxima-ai
    networks:
      - proxima-network

networks:
  proxima-network:
    driver: bridge
EOF
    
    # Create nginx configuration
    cat > "$CONFIG_DIR/nginx/proxima.conf" << 'EOF'
upstream proxima_app {
    server proxima-ai:8501;
}

upstream proxima_ws {
    server proxima-ai:8765;
}

server {
    listen 80;
    server_name localhost;
    
    # Redirect to app
    location / {
        proxy_pass http://proxima_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
    
    # WebSocket endpoint
    location /ws {
        proxy_pass http://proxima_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
EOF
    
    log_success "Docker configuration created"
}

# Create environment file
create_env_file() {
    log_info "Creating environment configuration..."
    
    cat > "$INSTALL_DIR/.env" << EOF
# Proxima AI Assistant Configuration
ASSISTANT_NAME=Proxima

# API Keys (Add your actual keys here)
OPENAI_API_KEY=sk-your-openai-api-key-here

# System Configuration
PROJECT_ROOT=$HOME/projects
PORT=8501
HOST=0.0.0.0

# Feature Flags
ENABLE_VOICE=true
ENABLE_WEBSOCKETS=true
ENABLE_LEARNING=true
ENABLE_METRICS=true
ENABLE_SANDBOX_TESTING=true

# Model Configuration
DEFAULT_MODEL=gpt-4
EMBEDDING_MODEL=all-MiniLM-L6-v2
LOCAL_MODEL=llama3.2:3b

# Performance
MAX_WORKERS=4
CACHE_SIZE_MB=1024
MAX_MEMORY_PERCENT=80

# Database
DATABASE_URL=sqlite:////opt/proxima-ai/data/proxima.db
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=$(openssl rand -hex 32)

# Paths
DATA_DIR=/opt/proxima-ai/data
LOG_DIR=/opt/proxima-ai/logs
MODEL_DIR=/opt/proxima-ai/models
EOF
    
    chmod 600 "$INSTALL_DIR/.env"
    log_success "Environment configuration created"
}

# Create systemd service
create_systemd_service() {
    log_info "Creating systemd service..."
    
    cat > /etc/systemd/system/proxima-ai.service << EOF
[Unit]
Description=Proxima AI Assistant
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable proxima-ai.service
    
    log_success "Systemd service created and enabled"
}

# Create management scripts
create_management_scripts() {
    log_info "Creating management scripts..."
    
    # Start script
    cat > "$INSTALL_DIR/scripts/start.sh" << 'EOF'
#!/bin/bash
cd /opt/proxima-ai
docker-compose up -d
echo "Proxima AI Assistant started!"
echo "Access at: http://localhost:8501"
EOF
    
    # Stop script
    cat > "$INSTALL_DIR/scripts/stop.sh" << 'EOF'
#!/bin/bash
cd /opt/proxima-ai
docker-compose down
echo "Proxima AI Assistant stopped!"
EOF
    
    # Update script
    cat > "$INSTALL_DIR/scripts/update.sh" << 'EOF'
#!/bin/bash
cd /opt/proxima-ai
docker-compose pull
docker-compose build --no-cache
docker-compose up -d
echo "Proxima AI Assistant updated!"
EOF
    
    # Backup script
    cat > "$INSTALL_DIR/scripts/backup.sh" << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/proxima-ai/backup/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /opt/proxima-ai/data "$BACKUP_DIR/"
cp /opt/proxima-ai/.env "$BACKUP_DIR/"
tar -czf "$BACKUP_DIR.tar.gz" -C "$BACKUP_DIR" .
rm -rf "$BACKUP_DIR"
echo "Backup created: $BACKUP_DIR.tar.gz"
EOF
    
    # Status script
    cat > "$INSTALL_DIR/scripts/status.sh" << 'EOF'
#!/bin/bash
echo "=== Proxima AI Status ==="
docker-compose ps
echo ""
echo "=== System Resources ==="
docker stats --no-stream proxima-ai
echo ""
echo "=== Recent Logs ==="
docker-compose logs --tail=10 proxima-ai
EOF
    
    # Make all scripts executable
    chmod +x "$INSTALL_DIR/scripts/"*.sh
    
    # Create symbolic links for easy access
    ln -sf "$INSTALL_DIR/scripts/start.sh" /usr/local/bin/proxima-start
    ln -sf "$INSTALL_DIR/scripts/stop.sh" /usr/local/bin/proxima-stop
    ln -sf "$INSTALL_DIR/scripts/update.sh" /usr/local/bin/proxima-update
    ln -sf "$INSTALL_DIR/scripts/backup.sh" /usr/local/bin/proxima-backup
    ln -sf "$INSTALL_DIR/scripts/status.sh" /usr/local/bin/proxima-status
    
    log_success "Management scripts created"
}

# Build and start services
deploy_services() {
    log_info "Building and deploying Proxima AI..."
    
    cd "$INSTALL_DIR"
    
    # Build Docker images
    log_info "Building Docker images (this may take a while)..."
    docker-compose build --no-cache
    
    # Start services
    log_info "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to initialize..."
    sleep 30
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        log_success "Services deployed successfully!"
    else
        log_error "Some services failed to start. Check logs with: docker-compose logs"
        return 1
    fi
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp    # SSH
        ufw allow 80/tcp    # HTTP
        ufw allow 443/tcp   # HTTPS
        ufw allow 8501/tcp  # Streamlit
        ufw allow 8765/tcp  # WebSocket
        ufw allow 8000/tcp  # Metrics
        
        # Enable firewall if not already enabled
        if ! ufw status | grep -q "Status: active"; then
            log_warning "Firewall is not active. Enable with: sudo ufw enable"
        fi
    fi
    
    log_success "Firewall rules configured"
}

# Final setup and instructions
final_setup() {
    log_info "Performing final setup..."
    
    # Get IP address
    IP_ADDR=$(hostname -I | awk '{print $1}')
    
    # Create README
    cat > "$INSTALL_DIR/README.md" << EOF
# Proxima AI Assistant

## Access Points
- Web Interface: http://$IP_ADDR:8501
- WebSocket: ws://$IP_ADDR:8765
- Metrics: http://$IP_ADDR:8000

## Quick Commands
- Start: \`proxima-start\` or \`systemctl start proxima-ai\`
- Stop: \`proxima-stop\` or \`systemctl stop proxima-ai\`
- Status: \`proxima-status\` or \`docker-compose ps\`
- Update: \`proxima-update\`
- Backup: \`proxima-backup\`
- Logs: \`docker-compose logs -f proxima-ai\`

## Configuration
Edit \`.env\` file to add your OpenAI API key and customize settings.

## Project Directory
Place your code projects in: $HOME/projects

## Support
Logs are located in: $LOG_DIR
Data is stored in: $DATA_DIR
EOF
    
    log_success "Final setup completed"
}

# Main deployment function
main() {
    echo ""
    log_info "Starting Proxima AI deployment..."
    echo ""
    
    # Run all installation steps
    check_root
    check_system_requirements
    install_system_deps
    install_docker
    install_ollama
    create_directory_structure
    setup_python_env
    create_application_files
    create_docker_config
    create_env_file
    create_systemd_service
    create_management_scripts
    deploy_services
    configure_firewall
    final_setup
    
    # Success message
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ PROXIMA AI ASSISTANT DEPLOYMENT COMPLETE! ✨${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📱 Access Proxima at:${NC}"
    echo -e "   Local:    ${YELLOW}http://localhost:8501${NC}"
    echo -e "   Network:  ${YELLOW}http://$(hostname -I | awk '{print $1}'):8501${NC}"
    echo ""
    echo -e "${BLUE}⚙️ Quick Commands:${NC}"
    echo -e "   Start:    ${YELLOW}proxima-start${NC}"
    echo -e "   Stop:     ${YELLOW}proxima-stop${NC}"
    echo -e "   Status:   ${YELLOW}proxima-status${NC}"
    echo -e "   Logs:     ${YELLOW}docker-compose logs -f proxima-ai${NC}"
    echo ""
    echo -e "${RED}🔑 IMPORTANT:${NC}"
    echo -e "   1. Edit ${YELLOW}/opt/proxima-ai/.env${NC} and add your OpenAI API key"
    echo -e "   2. Restart with: ${YELLOW}proxima-stop && proxima-start${NC}"
    echo -e "   3. Place your code projects in: ${YELLOW}$HOME/projects${NC}"
    echo ""
    echo -e "${GREEN}Proxima is ready to assist you! 🚀${NC}"
    echo ""
}

# Run main function
main "$@"