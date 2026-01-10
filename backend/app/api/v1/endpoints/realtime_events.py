"""Real-time SSE endpoints."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

# السطر ده هو اللي هيحل الأيرور اللي ظهرلك
router = APIRouter()

@router.get("/status")
async def get_realtime_status():
    return {"status": "realtime events system is active"}

# مثال لو عندك WebSocket
@router.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Event received: {data}")
    except WebSocketDisconnect:
        print("Client disconnected")
