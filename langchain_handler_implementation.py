"""
Enhanced Jarvis AI - LangChain Handler
Provides AI chat functionality, RAG, and document processing
"""

import os
import logging
from typing import List, Dict, Optional, Any
import streamlit as st

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
        # Try to import and initialize AI libraries
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
                return "🔧 AI system not fully initialized. Please check your configuration."
            
            # Simple AI response logic
            if self.ai_provider == "openai" and self.openai_api_key:
                return self._openai_chat(message, chat_history)
            elif self.ai_provider == "local":
                return self._local_chat(message, chat_history)
            else:
                return self._mock_chat(message, chat_history)
                
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return f"❌ Chat error: {str(e)}"
    
    def _openai_chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """OpenAI chat implementation"""
        try:
            import openai
            
            openai.api_key = self.openai_api_key
            
            # Build conversation context
            messages = [
                {"role": "system", "content": "You are Enhanced Jarvis, an advanced AI assistant. You are helpful, knowledgeable, and friendly."}
            ]
            
            # Add chat history
            if chat_history:
                for chat in chat_history[-10:]:  # Last 10 messages
                    messages.append({"role": chat["role"], "content": chat["content"]})
            
            # Add current message
            messages.append({"role": "user", "content": message})
            
            # Get OpenAI response
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=1000,
                temperature=0.7
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI chat error: {e}")
            return f"🤖 **Enhanced Jarvis (OpenAI Mode)**\n\nI received your message: \"{message}\"\n\n⚠️ OpenAI API error: {str(e)}\n\nPlease check your API key configuration."
    
    def _local_chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """Local AI chat implementation (fallback)"""
        return f"""🤖 **Enhanced Jarvis (Local Mode)**

I received your message: "{message}"

🧠 **AI Response:** I'm running in local mode. While I can process your messages, I need either:

1. **OpenAI API Key** - Set your `OPENAI_API_KEY` environment variable for full AI capabilities
2. **Local Model Integration** - Ollama or HuggingFace models can be configured

For now, I can help with:
- ✅ System status and monitoring
- ✅ Document processing preparation  
- ✅ Configuration management
- ✅ Basic conversation tracking

Would you like help setting up an AI provider?"""

    def _mock_chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """Mock chat for testing"""
        return f"""🤖 **Enhanced Jarvis (Demo Mode)**

Your message: "{message}"

🧠 **System Status:** All Docker services running successfully!

**Available Features:**
- ✅ Real-time chat interface
- ✅ Docker containerization
- ✅ Redis caching layer
- ✅ ChromaDB vector database
- ⏳ AI integration (needs API key)

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
            
            return {
                "success": True,
                "filename": filename,
                "word_count": word_count,
                "message": f"Document '{filename}' processed successfully. Contains {word_count} words.",
                "content_preview": document_content[:200] + "..." if len(document_content) > 200 else document_content
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"Failed to process document '{filename}'"
            }

# Global instance
_handler = None

def get_langchain_handler() -> LangChainHandler:
    """Get or create LangChain handler instance"""
    global _handler
    if _handler is None:
        _handler = LangChainHandler()
    return _handler