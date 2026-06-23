from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "sqlite:///./wifimeter.db"
    scan_interval: int = 30
    traffic_interval: int = 1
    subnet: str = "192.168.1.0/24"
    openwrt_host: str = ""
    openwrt_user: str = "root"
    openwrt_password: str = ""
    openwrt_port: int = 22
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
