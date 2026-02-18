"""
Enhanced Jarvis AI - Local-First LangChain Handler
Prioritizes local models, falls back to APIs only when needed
"""

import os
import logging
import requests
from typing import List, Dict, Optional, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LangChainHandler:
    """Local-first AI handler with API fallbacks"""
    
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY', '')
        self.huggingface_token = os.getenv('HUGGINGFACE_TOKEN', '')
        self.initialized = False
        self.chat_history = []
        self.available_models = {}
        
        try:
            self._initialize_ai()
            self.initialized = True
            logger.info(f"AI handler initialized successfully - Provider: {self.ai_provider}")
        except Exception as e:
            logger.error(f"Failed to initialize AI handler: {e}")
            self.initialized = False
    
    def _initialize_ai(self):
        """Initialize AI components with local-first priority"""
        
        # Priority 1: Check for local Ollama models
        if self._check_ollama_available():
            self.ai_provider = "ollama"
            logger.info("Using local Ollama models")
            return
        
        # Priority 2: Check for local HuggingFace models
        if self._check_local_huggingface():
            self.ai_provider = "local_hf"
            logger.info("Using local HuggingFace models")
            return
            
        # Priority 3: HuggingFace API (free tier available)
        if self._check_huggingface_api():
            self.ai_provider = "huggingface_api"
            logger.info("Using HuggingFace API")
            return
            
        # Priority 4: OpenAI API (paid service)
        if self.openai_api_key:
            self.ai_provider = "openai"
            logger.info("Using OpenAI API")
            return
            
        # Fallback: Local mock responses
        self.ai_provider = "local_mock"
        logger.info("Using local mock responses - no AI models available")
    
    def _check_ollama_available(self) -> bool:
        """Check if Ollama is running and has models"""
        try:
            # Check if Ollama is running (could be on host or in container)
            ollama_urls = [
                "http://localhost:11434",  # Standard Ollama port
                "http://host.docker.internal:11434",  # Docker host access
                "http://ollama:11434",  # If Ollama running as Docker service
            ]
            
            for url in ollama_urls:
                try:
                    response = requests.get(f"{url}/api/tags", timeout=3)
                    if response.status_code == 200:
                        models = response.json()
                        if models.get('models'):
                            self.ollama_url = url
                            self.available_models['ollama'] = [m['name'] for m in models['models']]
                            logger.info(f"Found Ollama models: {self.available_models['ollama']}")
                            return True
                except requests.RequestException:
                    continue
            
            return False
        except Exception as e:
            logger.warning(f"Error checking Ollama: {e}")
            return False
    
    def _check_local_huggingface(self) -> bool:
        """Check for local HuggingFace models"""
        try:
            # Check for transformers library and local models
            import transformers
            from transformers import AutoTokenizer, AutoModelForCausalLM
            
            # Common local model paths
            local_model_paths = [
                "microsoft/DialoGPT-small",
                "facebook/blenderbot-400M-distill", 
                "gpt2",
            ]
            
            available_models = []
            for model_name in local_model_paths:
                try:
                    # Try to load tokenizer to check if model is available
                    tokenizer = AutoTokenizer.from_pretrained(model_name, local_files_only=True)
                    available_models.append(model_name)
                except:
                    continue
            
            if available_models:
                self.available_models['local_hf'] = available_models
                logger.info(f"Found local HF models: {available_models}")
                return True
                
            return False
        except ImportError:
            logger.warning("Transformers library not available for local models")
            return False
        except Exception as e:
            logger.warning(f"Error checking local HF models: {e}")
            return False
    
    def _check_huggingface_api(self) -> bool:
        """Check HuggingFace Inference API availability"""
        try:
            # HuggingFace has free inference API endpoints
            test_url = "https://huggingface.co/api/models"
            response = requests.get(test_url, timeout=5)
            if response.status_code == 200:
                logger.info("HuggingFace API available")
                return True
            return False
        except Exception as e:
            logger.warning(f"HuggingFace API not available: {e}")
            return False
    
    def chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """Handle chat conversation with local-first approach"""
        try:
            if not self.initialized:
                return "AI system not fully initialized. Please check your configuration."
            
            # Route to appropriate chat handler based on priority
            if self.ai_provider == "ollama":
                return self._ollama_chat(message, chat_history)
            elif self.ai_provider == "local_hf":
                return self._local_hf_chat(message, chat_history)
            elif self.ai_provider == "huggingface_api":
                return self._huggingface_api_chat(message, chat_history)
            elif self.ai_provider == "openai":
                return self._openai_chat(message, chat_history)
            else:
                return self._local_mock_chat(message, chat_history)
                
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return f"Chat error: {str(e)}"
    
    def _ollama_chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """Chat using local Ollama models"""
        try:
            # Use the first available model or prefer qwen if available
            models = self.available_models.get('ollama', [])
            preferred_models = ['qwen2.5-coder', 'qwen', 'llama3', 'mistral', 'codellama']
            
            model_to_use = None
            for preferred in preferred_models:
                for available in models:
                    if preferred in available.lower():
                        model_to_use = available
                        break
                if model_to_use:
                    break
            
            if not model_to_use and models:
                model_to_use = models[0]  # Use first available model
            
            if not model_to_use:
                return "No Ollama models available. Please install a model using 'ollama pull <model_name>'"
            
            # Prepare the prompt with context
            system_prompt = "You are Enhanced Jarvis, a helpful AI assistant. Be concise and helpful."
            
            # Build conversation context
            conversation = f"System: {system_prompt}\n"
            if chat_history:
                for chat in chat_history[-5:]:  # Last 5 messages for context
                    role = "Human" if chat["role"] == "user" else "Assistant"
                    conversation += f"{role}: {chat['content']}\n"
            
            conversation += f"Human: {message}\nAssistant: "
            
            # Call Ollama API
            payload = {
                "model": model_to_use,
                "prompt": conversation,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "max_tokens": 1000
                }
            }
            
            response = requests.post(
                f"{self.ollama_url}/api/generate", 
                json=payload, 
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('response', '').strip()
                return f"**Enhanced Jarvis (Ollama - {model_to_use})**\n\n{ai_response}"
            else:
                return f"Ollama API error: {response.status_code} - {response.text}"
                
        except Exception as e:
            logger.error(f"Ollama chat error: {e}")
            return f"Ollama error: {str(e)}. Falling back to next available provider."
    
    def _local_hf_chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """Chat using local HuggingFace models"""
        try:
            from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
            
            model_name = self.available_models['local_hf'][0]  # Use first available
            
            # Create a text generation pipeline
            generator = pipeline('text-generation', model=model_name, tokenizer=model_name)
            
            # Generate response
            response = generator(
                message, 
                max_length=200, 
                num_return_sequences=1, 
                temperature=0.7,
                pad_token_id=generator.tokenizer.eos_token_id
            )
            
            generated_text = response[0]['generated_text']
            # Remove the input prompt from the response
            ai_response = generated_text.replace(message, '').strip()
            
            return f"**Enhanced Jarvis (Local HF - {model_name})**\n\n{ai_response}"
            
        except Exception as e:
            logger.error(f"Local HF chat error: {e}")
            return f"Local HuggingFace error: {str(e)}"
    
    def _huggingface_api_chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """Chat using HuggingFace Inference API"""
        try:
            # Use free HuggingFace models
            model_endpoint = "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium"
            
            headers = {}
            if self.huggingface_token:
                headers["Authorization"] = f"Bearer {self.huggingface_token}"
            
            payload = {"inputs": message}
            
            response = requests.post(model_endpoint, headers=headers, json=payload, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and result:
                    ai_response = result[0].get('generated_text', message).replace(message, '').strip()
                else:
                    ai_response = str(result)
                return f"**Enhanced Jarvis (HuggingFace API)**\n\n{ai_response}"
            else:
                return f"HuggingFace API error: {response.status_code}"
                
        except Exception as e:
            logger.error(f"HuggingFace API error: {e}")
            return f"HuggingFace API error: {str(e)}"
    
    def _openai_chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """OpenAI chat (fallback option)"""
        try:
            import openai
            
            client = openai.OpenAI(api_key=self.openai_api_key)
            
            messages = [
                {"role": "system", "content": "You are Enhanced Jarvis, a helpful AI assistant. Mention that you're using OpenAI as a fallback since local models weren't available."}
            ]
            
            if chat_history:
                for chat in chat_history[-10:]:
                    if chat["role"] in ["user", "assistant"]:
                        messages.append({"role": chat["role"], "content": chat["content"]})
            
            messages.append({"role": "user", "content": message})
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                max_tokens=1000,
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content
            return f"**Enhanced Jarvis (OpenAI Fallback)**\n\n{ai_response}"
            
        except Exception as e:
            logger.error(f"OpenAI chat error: {e}")
            return f"OpenAI API error: {str(e)}"
    
    def _local_mock_chat(self, message: str, chat_history: List[Dict] = None) -> str:
        """Local mock responses when no AI models are available"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['hello', 'hi', 'hey']):
            return f"""**Enhanced Jarvis (Local Mode)**

Hello! I'm Enhanced Jarvis running in local-first mode.

Your message: "{message}"

**Current Status:**
- No local AI models detected (Ollama, HuggingFace)
- Running with basic response system

**To enable AI capabilities:**
1. **Install Ollama**: `curl https://ollama.ai/install.sh | sh`
2. **Pull a model**: `ollama pull qwen2.5-coder` or `ollama pull llama3`
3. **Or add API keys**: Set OPENAI_API_KEY or HUGGINGFACE_TOKEN

How can I help you today?"""
        
        elif 'models' in message_lower or 'ollama' in message_lower:
            return f"""**Enhanced Jarvis - AI Models Status**

Your query: "{message}"

**Local Models Status:**
- Ollama: Not detected (install with: `ollama pull qwen2.5-coder`)
- HuggingFace Local: Not available
- Available APIs: {', '.join([k for k in ['OpenAI' if self.openai_api_key else None, 'HuggingFace' if self.huggingface_token else None] if k])}

**Recommended Setup:**
1. Install Ollama locally for privacy and speed
2. Pull coding models: `ollama pull qwen2.5-coder` or `ollama pull codellama`
3. General models: `ollama pull llama3` or `ollama pull mistral`

This provides local, private AI without API costs."""
        
        else:
            return f"""**Enhanced Jarvis (Local-First Mode)**

Message: "{message}"

I'm designed to prioritize local AI models for privacy and cost efficiency. Currently running without AI models.

**Setup Priority (Recommended Order):**
1. **Local Ollama** - Fast, private, free
2. **HuggingFace API** - Free tier available  
3. **OpenAI API** - Paid fallback

**Quick Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull your preferred model
ollama pull qwen2.5-coder  # For coding tasks
ollama pull llama3         # For general chat
```

Would you like help setting up local models?"""

    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive handler status"""
        return {
            "initialized": self.initialized,
            "ai_provider": getattr(self, 'ai_provider', 'unknown'),
            "available_models": self.available_models,
            "has_openai_key": bool(self.openai_api_key),
            "has_hf_token": bool(self.huggingface_token),
            "chat_history_length": len(self.chat_history),
            "ollama_url": getattr(self, 'ollama_url', None)
        }

    def process_document(self, document_content: str, filename: str) -> Dict[str, Any]:
        """Process uploaded documents"""
        try:
            word_count = len(document_content.split())
            char_count = len(document_content)
            lines = len(document_content.split('\n'))
            
            return {
                "success": True,
                "filename": filename,
                "word_count": word_count,
                "char_count": char_count,
                "lines": lines,
                "message": f"Document '{filename}' processed successfully!\n\nAnalysis:\n- Words: {word_count}\n- Characters: {char_count}\n- Lines: {lines}",
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