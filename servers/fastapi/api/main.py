from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.lifespan import app_lifespan
from api.middlewares import UserConfigEnvUpdateMiddleware
from api.v1.ppt.router import API_V1_PPT_ROUTER
from api.v1.webhook.router import API_V1_WEBHOOK_ROUTER
from api.v1.mock.router import API_V1_MOCK_ROUTER
from middleware.auth import EntraJWTAuthMiddleware
from utils.telemetry import setup_telemetry


app = FastAPI(lifespan=app_lifespan)

# OpenTelemetry + Azure Monitor (no-op when APPLICATIONINSIGHTS_CONNECTION_STRING is unset)
setup_telemetry(app)


# Routers
app.include_router(API_V1_PPT_ROUTER)
app.include_router(API_V1_WEBHOOK_ROUTER)
app.include_router(API_V1_MOCK_ROUTER)

# Middlewares
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(UserConfigEnvUpdateMiddleware)

# Entra ID JWT auth (opt-in: no-op when AZURE_AD_TENANT_ID is unset)
app.add_middleware(EntraJWTAuthMiddleware)
