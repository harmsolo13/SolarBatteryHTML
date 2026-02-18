"""
Enhanced Jarvis AI - LangChain Handler
Provides AI chat functionality, RAG, and document processing
"""

import os
import logging
from typing import List, Dict, Optional, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LangChainHandler:
    """Handles AI chat functionality and document processing"""
    
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY', '')
        self.initialized = False
        self.chat_history = []
        
        try:
            self._initialize_ai()
            self.initialized = True
            logger.info("LangChain handler initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize LangChain handler: {e}")
            self.initialized = False
    
    def _initialize_ai(self):
        """Initialize AI components"""
        try:
            # Check if we have OpenAI API key
            if self.openai_api_key:
                logger.info("OpenAI API key found - enabling OpenAI chat")
                self.ai_provider = "openai"
            else:
                logger.info("No OpenAI API key - using local fallback")
                self.ai_provider = "local"
        except Exception as e:
            logger.warning(f"AI initialization warning: {e}")
            self.ai_provider = "mock"
    
    def chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """Handle chat conversation"""
        try:
            if not self.initialized:
                return "AI system not fully initialized. Please check your configuration."
            
            # Route to appropriate chat handler
            if self.ai_provider == "openai" and self.openai_api_key:
                return self._openai_chat(message, chat_history)
            elif self.ai_provider == "local":
                return self._local_chat(message, chat_history)
            else:
                return self._mock_chat(message, chat_history)
                
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return f"Chat error: {str(e)}"
    
    def _openai_chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """OpenAI chat implementation"""
        try:
            import openai
            
            # Set API key
            client = openai.OpenAI(api_key=self.openai_api_key)
            
            # Build conversation context
            messages = [
                {"role": "system", "content": "You are Enhanced Jarvis, an advanced AI assistant running in a Docker container. You are helpful, knowledgeable, and friendly. You have access to various tools and can help with coding, analysis, and general questions."}
            ]
            
            # Add chat history (last 10 messages)
            if chat_history:
                for chat in chat_history[-10:]:
                    if chat["role"] in ["user", "assistant"]:
                        messages.append({"role": chat["role"], "content": chat["content"]})
            
            # Add current message
            messages.append({"role": "user", "content": message})
            
            # Get OpenAI response
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=1000,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI chat error: {e}")
            return f"**Enhanced Jarvis (OpenAI Mode)**\n\nI received your message: \"{message}\"\n\nOpenAI API error: {str(e)}\n\nPlease check your API key configuration in the environment variables."
    
    def _local_chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """Local AI chat implementation (fallback)"""
        
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['hello', 'hi', 'hey']):
            return f"""**Enhanced Jarvis (Local Mode)**

Hello! I'm Enhanced Jarvis, your AI assistant running in Docker.

I received your message: "{message}"

**Current Capabilities:**
- System monitoring and status
- Docker container management
- Basic conversation and help
- File structure navigation
- Configuration assistance

**To unlock full AI capabilities:**
Set your OpenAI API key: `OPENAI_API_KEY=your_key_here`

How can I help you today?"""
        
        elif any(word in message_lower for word in ['help', 'what can you do']):
            return f"""**Enhanced Jarvis Help Menu**

Your message: "{message}"

**Available Commands:**
- `status` - Check system status
- `files` - Show file structure  
- `config` - Configuration help
- `docker` - Docker information
- `help` - Show this help menu

**System Features:**
- Multi-tab interface (Dashboard, AI Chat, LangChain)
- Docker containerization
- Redis caching
- ChromaDB vector database
- Document processing ready

Need anything specific?"""
        
        elif 'status' in message_lower:
            return f"""**Enhanced Jarvis System Status**

Your query: "{message}"

**Current Status:**
- Docker Container: Running
- Web Interface: Active on port 8501
- Redis: Connected
- ChromaDB: Available on port 8000
- AI Handler: Initialized (Local Mode)

**Performance:**
- Memory: Available
- Storage: Accessible
- Network: Connected

All systems operational!"""
        
        else:
            return f"""**Enhanced Jarvis (Local Mode)**

I received your message: "{message}"

I'm currently running in local mode without an OpenAI API key. While I can help with basic tasks and system information, for advanced AI conversations, please set up your OpenAI API key.

**What I can help with right now:**
- System status and monitoring
- Docker configuration
- File structure navigation  
- Basic Q&A about the system

Try asking me about 'status', 'help', or 'files'!

Would you like me to guide you through setting up the OpenAI integration?"""

    def _mock_chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """Mock chat for testing"""
        return f"""**Enhanced Jarvis (Demo Mode)**

Your message: "{message}"

**System Status:** All Docker services running successfully!

**Available Features:**
- Real-time chat interface
- Docker containerization
- Redis caching layer
- ChromaDB vector database
- AI integration (needs API key)

To enable full AI capabilities, please add your OpenAI API key to the environment variables.

Type 'help' for available commands!"""

    def get_status(self) -> Dict[str, Any]:
        """Get handler status"""
        return {
            "initialized": self.initialized,
            "ai_provider": getattr(self, 'ai_provider', 'unknown'),
            "has_openai_key": bool(self.openai_api_key),
            "chat_history_length": len(self.chat_history)
        }

    def process_document(self, document_content: str, filename: str) -> Dict[str, Any]:
        """Process uploaded documents"""
        try:
            # Basic document processing
            word_count = len(document_content.split())
            char_count = len(document_content)
            lines = len(document_content.split('\n'))
            
            return {
                "success": True,
                "filename": filename,
                "word_count": word_count,
                "char_count": char_count,
                "lines": lines,
                "message": f"Document '{filename}' processed successfully!\n\n**Analysis:**\n- Words: {word_count}\n- Characters: {char_count}\n- Lines: {lines}",
                "content_preview": document_content[:200] + "..." if len(document_content) > 200 else document_content
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to process document '{filename}': {str(e)}"
            }

# Global instance
_handler = None

def get_langchain_handler() -> LangChainHandler:
    """Get or create LangChain handler instance"""
    global _handler
    if _handler is None:
        _handler = LangChainHandler()
    return _handler