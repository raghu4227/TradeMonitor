from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./trademonitor.db"
    DATABASE_URL_SYNC: str = "sqlite:///./trademonitor.db"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    NOTIFY_EMAIL: str = ""

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""
    NOTIFY_PHONE: str = ""

    BASE_POSITION_SIZE: float = 1000.0
    MAX_PORTFOLIO_HEAT: float = 0.15
    ENABLE_NOTIFICATIONS: bool = True
    MARKET_OPEN: str = "09:30"
    MARKET_CLOSE: str = "16:00"
    TIMEZONE: str = "America/New_York"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
