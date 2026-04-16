import asyncio
import httpx
import sys
import logging
from pprint import pprint

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_connectivity():
    timeout = 30.0
    urls = {
        "Telegram API": "https://api.telegram.org",
        "OpenRouter API": "https://openrouter.ai/api/v1/models"
    }
    
    results = {}
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        for name, url in urls.items():
            logger.info(f"Testing connectivity to {name} ({url})...")
            try:
                # Use a simple HEAD or GET request
                response = await client.get(url)
                results[name] = {
                    "status": "Success",
                    "status_code": response.status_code,
                    "time": response.elapsed.total_seconds()
                }
                logger.info(f"✅ {name} reached in {response.elapsed.total_seconds():.2f}s")
            except httpx.ConnectTimeout:
                results[name] = {"status": "Timeout", "detail": "Connection timed out"}
                logger.error(f"❌ {name} timed out after {timeout}s")
            except httpx.ConnectError as e:
                results[name] = {"status": "ConnectError", "detail": str(e)}
                logger.error(f"❌ {name} connection error: {e}")
            except Exception as e:
                results[name] = {"status": "Error", "detail": str(e)}
                logger.error(f"❌ {name} unexpected error: {e}")
                
    return results

if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(test_connectivity())
    
    print("\n--- Summary ---")
    pprint(results)
    
    if all(r["status"] == "Success" for r in results.values()):
        print("\nAll external services are reachable.")
        sys.exit(0)
    else:
        print("\nSome external services are unreachable. Check your internet connection or proxy settings.")
        sys.exit(1)
