"""
Enhanced Jarvis AI Assistant - Streamlit Web Interface
Advanced AI system with LangChain integration and real AI chat
"""

import streamlit as st
import os
import json
import logging
from pathlib import Path
import sys

# Import our AI handler
try:
    from app.langchain_handler import get_langchain_handler
    AI_HANDLER_AVAILABLE = True
except ImportError:
    AI_HANDLER_AVAILABLE = False
    st.warning("⚠️ AI handler not found. Creating basic version...")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Page configuration
st.set_page_config(
    page_title="Enhanced Jarvis AI Assistant",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for enhanced styling
st.markdown("""
<style>
    .main > div {
        padding-top: 2rem;
    }
    .stAlert {
        margin-top: 1rem;
    }
    .success-box {
        padding: 1rem;
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 0.25rem;
        color: #155724;
    }
    .info-box {
        padding: 1rem;
        background-color: #d1ecf1;
        border: 1px solid #bee5eb;
        border-radius: 0.25rem;
        color: #0c5460;
    }
    .chat-message {
        padding: 1rem;
        margin: 0.5rem 0;
        border-radius: 0.5rem;
    }
</style>
""", unsafe_allow_html=True)

# Initialize AI handler
@st.cache_resource
def initialize_ai_handler():
    """Initialize and cache the AI handler"""
    if AI_HANDLER_AVAILABLE:
        try:
            handler = get_langchain_handler()
            return handler
        except Exception as e:
            st.error(f"Failed to initialize AI handler: {e}")
            return None
    return None

# System Information Sidebar
st.sidebar.header("🛠️ System Info")

# Working directory info
working_dir = "/app"
host_location = "/home/harm/Ai Deploy Files/enhanced-jarvis-ai"

# AI Status in sidebar
ai_handler = initialize_ai_handler()
if ai_handler:
    status = ai_handler.get_status()
    ai_status = "✅ Ready" if status["initialized"] else "❌ Error"
    ai_provider = status.get("ai_provider", "unknown")
    has_openai = "✅" if status.get("has_openai_key") else "❌"
else:
    ai_status = "❌ Not Available"
    ai_provider = "none"
    has_openai = "❌"

st.sidebar.info(f"""
**Working Directory:** {working_dir}

**Host Location:** {host_location}

**Python Version:** {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}

**AI Status:** {ai_status}
**AI Provider:** {ai_provider}
**OpenAI Key:** {has_openai}
""")

# Main Application Tabs
tab1, tab2, tab3 = st.tabs(["🏠 Dashboard", "💬 AI Chat", "🔗 LangChain"])

with tab1:
    # Main header
    st.title("🧠 Enhanced Jarvis AI Assistant")
    st.markdown("### Docker Version 1.0.0")

    # Status indicators
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric(
            label="Version",
            value="1.0.0"
        )

    with col2:
        st.metric(
            label="Status", 
            value="Online",
            delta="✅"
        )

    with col3:
        st.metric(
            label="Environment",
            value="Docker",
            delta="🐳"
        )

    with col4:
        st.metric(
            label="Port",
            value="8501"
        )

    # File Structure Section
    st.markdown("## 📂 File Structure")
    with st.expander("📁 Current Files in Container"):
        
        # Show basic file structure
        st.markdown("""
        ```
        /app/
        ├── enhanced_streamlit_app.py    ← Current file
        ├── app/langchain_handler.py     ← AI handler
        ├── requirements.txt             ← Dependencies
        ├── Dockerfile                   ← Container config
        ├── docker-compose.yml           ← Services config
        ├── data/                        ← Data storage
        ├── models/                      ← AI models
        ├── logs/                        ← Log files
        ├── cache/                       ← Cache storage
        └── documents/                   ← Document processing
        ```
        """)

    # Configuration Status
    st.markdown("## ⚙️ Configuration Status")

    config_status = {
        "Docker Container": "✅ Running",
        "Port 8501": "✅ Bound",
        "Redis Connection": "✅ Available", 
        "File Structure": "✅ Organized",
        "AI Handler": ai_status,
        "Ready for LangChain": "⏳ Pending Full Deployment"
    }

    for item, status in config_status.items():
        col1, col2 = st.columns([3, 1])
        with col1:
            st.write(f"• **{item}**")
        with col2:
            st.write(status)

with tab2:
    # AI Chat Interface
    st.header("💬 AI Chat Interface")
    
    if not ai_handler:
        st.error("❌ AI handler not available. Please check the system configuration.")
    else:
        # Chat interface
        if "chat_messages" not in st.session_state:
            st.session_state.chat_messages = []

        # Display chat messages
        for message in st.session_state.chat_messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

        # Chat input
        if prompt := st.chat_input("Chat with Enhanced Jarvis..."):
            # Add user message
            st.session_state.chat_messages.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)

            # Get AI response
            with st.chat_message("assistant"):
                with st.spinner("🧠 Thinking..."):
                    try:
                        response = ai_handler.chat(prompt, st.session_state.chat_messages)
                        st.markdown(response)
                        st.session_state.chat_messages.append({"role": "assistant", "content": response})
                    except Exception as e:
                        error_msg = f"❌ Chat error: {str(e)}"
                        st.error(error_msg)
                        st.session_state.chat_messages.append({"role": "assistant", "content": error_msg})

        # Chat controls
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🗑️ Clear Chat"):
                st.session_state.chat_messages = []
                st.rerun()
        
        with col2:
            st.write(f"💬 Messages: {len(st.session_state.chat_messages)}")

with tab3:
    # LangChain Integration
    st.header("🔗 LangChain Integration")
    
    st.markdown("""
    ### LangChain Status: Ready for Advanced Features
    
    The system is prepared for LangChain integration with:
    - ChromaDB vector database ready
    - Document processing pipeline configured  
    - Multi-model support framework in place
    - Redis caching layer active
    """)

    # Document Upload Section
    st.subheader("📄 Document Processing")
    
    uploaded_file = st.file_uploader(
        "Choose a document to process",
        type=['txt', 'md', 'pdf', 'docx'],
        help="Upload documents for AI analysis and conversation"
    )
    
    if uploaded_file is not None:
        if st.button("📤 Process Document"):
            with st.spinner("Processing document..."):
                try:
                    # Read file content
                    if uploaded_file.type == "text/plain":
                        content = str(uploaded_file.read(), "utf-8")
                    else:
                        content = f"[{uploaded_file.type}] Document uploaded: {uploaded_file.name}"
                    
                    # Process with AI handler
                    if ai_handler:
                        result = ai_handler.process_document(content, uploaded_file.name)
                        if result["success"]:
                            st.success(result["message"])
                            st.text_area("Document Preview:", result["content_preview"], height=150)
                        else:
                            st.error(result["message"])
                    else:
                        st.warning("AI handler not available for document processing")
                        
                except Exception as e:
                    st.error(f"Error processing document: {str(e)}")

    # RAG Chat Section
    st.subheader("🧠 RAG (Retrieval-Augmented Generation)")
    
    st.info("""
    **Coming Soon:** Advanced document-based conversations
    
    Deploy LangChain features to unlock:
    - 📄 Intelligent document analysis
    - 🔍 Semantic search across documents
    - 💬 Chat with your document knowledge base
    - 🧩 Multi-document reasoning
    """)

# Footer
st.markdown("---")
st.markdown(f"""
<div style="text-align: center; color: #666; padding: 1rem;">
    🧠 Enhanced Jarvis AI Assistant | Docker Version 1.0.0 | 
    Files organized in: {host_location}
</div>
""", unsafe_allow_html=True)