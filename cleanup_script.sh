#!/bin/bash

# Enhanced Jarvis AI Project Cleanup Script
# Cleans up legacy development files while preserving working system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "enhanced_streamlit_app.py" ] || [ ! -f "docker-compose.yml" ]; then
    error "Not in Enhanced Jarvis AI project directory. Please run from project root."
    echo "Expected location: ~/Ai Deploy Files/enhanced-jarvis-ai/"
    exit 1
fi

log "Starting Enhanced Jarvis AI project cleanup..."

# Stop Docker services first
log "Stopping Docker services..."
if docker-compose ps | grep -q "Up"; then
    docker-compose down
    success "Docker services stopped"
else
    log "Docker services already stopped"
fi

# Create archive directory with timestamp
ARCHIVE_DIR="archive-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$ARCHIVE_DIR"
success "Created archive directory: $ARCHIVE_DIR"

# Files to keep (working system)
KEEP_FILES=(
    "enhanced_streamlit_app.py"
    "docker-compose.yml"
    "Dockerfile"
    "requirements.txt"
    ".env"
    "app/"
    "data/"
    "logs/"
    "cache/"
    "documents/"
    "models/"
    "config/"
    "tests/"
)

# Files/directories to archive (legacy development files)
ARCHIVE_FILES=(
    "adaptive_ai_assistant.py"
    "jarvis_adaptive_ai.py"
    "jarvis_langchain_config.py"
    "jarvis_langchain_enhanced.py"
    "learning_database_schema.py"
    "performance_monitoring.py"
    "realtime_websocket_server.py"
    "voice_integration.py"
    "dashboard_app.py"
    "integration_demo.py"
    "streamlit_app.py"
    "setup.py"
    "test_app.py"
    "config.json"
    "langchain_handler.py"
    "backup_*"
    "backups/"
    "*backup*"
    "*.backup.*"
    "venv/"
    "notebooks/"
    "scripts/"
    "ssl/"
    "monitoring/"
    "projects/"
)

# Archive legacy files
log "Archiving legacy development files..."
archived_count=0
for pattern in "${ARCHIVE_FILES[@]}"; do
    # Use find to handle patterns with wildcards
    while IFS= read -r -d '' file; do
        if [ -e "$file" ]; then
            log "Archiving: $file"
            mv "$file" "$ARCHIVE_DIR/"
            ((archived_count++))
        fi
    done < <(find . -maxdepth 1 -name "$pattern" -print0 2>/dev/null || true)
done

# Clean up __pycache__ directories
log "Cleaning Python cache files..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true
find . -name "*.pyo" -delete 2>/dev/null || true

# Remove empty directories
log "Removing empty directories..."
find . -type d -empty -delete 2>/dev/null || true

success "Archived $archived_count legacy files to $ARCHIVE_DIR"

# Create project structure summary
log "Creating clean project structure..."
cat > PROJECT_STRUCTURE.md << 'EOF'
# Enhanced Jarvis AI - Clean Project Structure

## Core Files
```
enhanced-jarvis-ai/
├── app/
│   ├── __init__.py
│   └── langchain_handler.py     # Local-first AI handler
├── enhanced_streamlit_app.py    # Main web interface
├── docker-compose.yml           # Services configuration
├── Dockerfile                   # Container build
├── requirements.txt             # Python dependencies
├── .env                        # Environment variables
├── data/                       # Data storage
├── logs/                       # Application logs  
├── cache/                      # Cache storage
├── documents/                  # Document processing
└── models/                     # AI models storage
```

## Key Features
- Local-first AI with Ollama integration
- Model preloading for fast responses
- ChromaDB vector database
- Redis caching
- Multi-tab web interface
- Docker containerization

## Legacy Files
All development iteration files have been moved to archive-YYYYMMDD_HHMMSS/ directories.
EOF

success "Created PROJECT_STRUCTURE.md"

# Verify working files are present
log "Verifying working system integrity..."
missing_files=()

for file in "${KEEP_FILES[@]}"; do
    if [ ! -e "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    warning "Some expected files are missing:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
fi

# Create a simple README if it doesn't exist
if [ ! -f "README.md" ]; then
    log "Creating README.md..."
    cat > README.md << 'EOF'
# Enhanced Jarvis AI Assistant

A local-first AI assistant with Docker deployment and Ollama integration.

## Quick Start
```bash
# Start the system
docker-compose up -d

# Access the web interface
http://localhost:8501
```

## Features
- Local Ollama models (qwen, codellama, etc.)
- Document processing with ChromaDB
- Multi-provider AI fallbacks
- Redis caching
- Real-time chat interface

## Configuration
- Set `OPENAI_API_KEY` in `.env` for API fallback
- Models automatically detected from local Ollama installation
- Preloads preferred models for fast responses
EOF
    success "Created README.md"
fi

# Show final directory structure
log "Final clean project structure:"
tree -a -I '__pycache__|*.pyc|*.pyo' . 2>/dev/null || ls -la

# Summary
echo ""
success "Cleanup completed successfully!"
echo ""
echo "Summary:"
echo "  - Archived $archived_count legacy files"
echo "  - Archive location: $ARCHIVE_DIR"
echo "  - Clean working system preserved"
echo "  - Docker services ready to restart"
echo ""
echo "To restart your system:"
echo "  docker-compose up -d"
echo ""
echo "Your working Enhanced Jarvis AI is ready!"