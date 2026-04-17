from enum import Enum


class LLMProvider(Enum):
    OLLAMA = "ollama"
    OPENAI = "openai"
    GOOGLE = "google"
    ANTHROPIC = "anthropic"
    CUSTOM = "custom"
    CODEX = "codex"
    AZURE_AI_FOUNDRY = "azure_ai_foundry"
