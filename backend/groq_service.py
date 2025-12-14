"""
Groq AI Service for Document Analysis
Uses Llama 3.2 Vision for document extraction
"""

import os
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

class GroqService:
    """Service for document analysis using Groq's Llama 3.3 (Text Only)"""
    
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            print("⚠️ GROQ_API_KEY not found in environment variables")
            self.client = None
            return
        
        self.client = Groq(api_key=self.api_key)
        self.model = "llama-3.3-70b-versatile"  # High-performance Text Model
    
    def analyze_text(self, text_content: str, prompt: str) -> str:
        """
        Analyze text content using Groq's Llama 3.3
        
        Args:
            text_content: Extracted text from document
            prompt: Analysis prompt
            
        Returns:
            AI response text
        """
        if not self.client:
             raise ValueError("Groq client not initialized. Check GROQ_API_KEY.")

        try:
            # Call Groq API with Text
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a specialized document verification AI. Analyze the provided text and return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": f"{prompt}\n\n--- DOCUMENT CONTENT ---\n{text_content}"
                    }
                ],
                temperature=0.1,
                max_tokens=4096,
                top_p=1,
                stream=False
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"❌ Groq API Error: {e}")
            raise e
    
    def check_connection(self) -> bool:
        """Test Groq API connection"""
        if not self.client: return False
        try:
            # Simple test call
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=10
            )
            return True
        except Exception as e:
            print(f"❌ Groq connection failed: {e}")
            return False

# Test if running directly
if __name__ == "__main__":
    print("🤖 Testing Groq Service (Text Mode)\n")
    
    try:
        service = GroqService()
        if service.client:
            print("✅ Groq service initialized")
            
            # Test connection
            if service.check_connection():
                print("✅ Groq API connection successful")
                print(f"✅ Using model: {service.model}")
            else:
                print("❌ Groq API connection failed")
        else:
             print("❌ Groq service client failed to init")
            
    except Exception as e:
        print(f"❌ Error: {e}")
