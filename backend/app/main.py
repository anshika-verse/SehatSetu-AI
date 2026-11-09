from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import conversation, health, language, places, reports, resources, speech, websocket_conversation
from app.config import settings
from app.services.database import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="SehatSetu AI", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(health.router, prefix="/api")
app.include_router(speech.router, prefix="/api")
app.include_router(conversation.router, prefix="/api")
app.include_router(resources.router, prefix="/api")
app.include_router(places.router, prefix="/api")
app.include_router(language.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(websocket_conversation.router, prefix="/api")
