import httpx, json, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
resp = httpx.get('https://openrouter.ai/api/v1/models', timeout=15)
models = resp.json().get('data', [])
free_models = [m for m in models if ':free' in m.get('id','')]
print(f'Total free models: {len(free_models)}')
for m in free_models[:30]:
    print(f'  {m["id"]}')
