from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router # استيراد المجمع اللي عملناه فوق
from app.api.v1.endpoints import auth_login # استيراد الجديد

app = FastAPI(title="Customer Service AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# إضافة المجمع الرئيسي مرة واحدة
app.include_router(api_router, prefix="/api/v1")
app.include_router(auth_login.router, prefix="/api/v1/auth", tags=["Authentication"])

@app.get("/")
async def root():
    return {"status": "online", "message": "API is running successfully"}