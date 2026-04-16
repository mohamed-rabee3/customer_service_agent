"""Check the system prompt of the active agent."""
import urllib.request, json, os
env_path = os.path.join(os.path.dirname(__file__), ".env")
env_vars = {}
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env_vars[k.strip()] = v.strip()

headers = {"apikey": env_vars["SUPABASE_SERVICE_KEY"], "Authorization": f"Bearer {env_vars['SUPABASE_SERVICE_KEY']}"}
url = f"{env_vars['SUPABASE_URL']}/rest/v1/agents?select=id,name,system_prompt,status&id=eq.7ae501dd-009b-48ec-b5a3-ae6583554901"
req = urllib.request.Request(url, headers=headers)
resp = urllib.request.urlopen(req, timeout=15)
agents = json.loads(resp.read().decode())
for a in agents:
    print(f"Agent: {a['name']}")
    print(f"Status: {a['status']}")
    print(f"System Prompt:\n{a.get('system_prompt', '(none)')}")
