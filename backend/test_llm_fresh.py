import asyncio
import os
import sys
from openai import AsyncOpenAI

# Add the backend directory to sys.path to import settings
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from app.core.config import settings

async def test_llm():
    api_key = settings.openrouter_api_key
    print(f"Testing with API Key: {api_key[:10]}...")
    
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )
    
    models_to_test = [
        "meta-llama/llama-3.1-8b-instruct:free",
        "meta-llama/llama-3.2-3b-instruct:free",
        "google/gemma-2-9b-it:free",
        "mistralai/mistral-7b-instruct:free",
        "qwen/qwen-2.5-72b-instruct:free",
        "microsoft/phi-3-mini-128k-instruct:free",
    ]
    
    for model in models_to_test:
        print(f"\n--- Testing model: {model} ---")
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "Say 'hello'"}],
                max_tokens=10
            )
            print(f"Success! Response: {response.choices[0].message.content}")
        except Exception as e:
            print(f"Failed: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(test_llm())
