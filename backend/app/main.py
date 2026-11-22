import os

os.environ.setdefault("GRPC_ENABLE_FORK_SUPPORT", "0")
os.environ.setdefault("GRPC_POLL_STRATEGY", "poll")
os.environ.setdefault("OBJC_DISABLE_INITIALIZE_FORK_SAFETY", "YES")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
except Exception:
    pass

try:
    import torch
    torch.set_num_threads(os.cpu_count() or 4)
except Exception:
    pass

from contextlib import asynccontextmanager
import logging
import signal
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import OUTPUT_DIR, settings
from app.services import job_queue
from app.services.track_repository import cleanup_stale_processing_tasks

logger = logging.getLogger(__name__)


def handle_shutdown():
    logger.info("Server shutting down: cancelling active AI jobs...")
    try:
        job_queue.cancel_active_job()
    except Exception as exc:
        logger.warning("Error cancelling active job during shutdown: %s", exc)


def force_exit(signum, frame):
    handle_shutdown()
    os._exit(0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run startup cleanup in background so uvicorn binds port 8000 immediately
    threading.Thread(target=cleanup_stale_processing_tasks, daemon=True).start()
    yield
    handle_shutdown()


try:
    signal.signal(signal.SIGINT, force_exit)
    signal.signal(signal.SIGTERM, force_exit)
except (ValueError, AttributeError):
    pass


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI Backend for Listu Audio & Music Studio",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
