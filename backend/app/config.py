from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "QuantCopilot AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "quantcopilot"
    REDIS_URL: str = "redis://localhost:6379/0"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/quantcopilot"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    GNN_MODEL_HIDDEN_DIM: int = 64
    GNN_ATTENTION_HEADS: int = 8
    GNN_LAYERS: int = 3

    class Config:
        case_sensitive = True

settings: Settings = Settings()
