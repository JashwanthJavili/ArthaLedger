import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    firebase_credentials_path: str = os.getenv('FIREBASE_ADMIN_CREDENTIALS', '')
    firebase_database_url: str = os.getenv('FIREBASE_DATABASE_URL', '')
    allowed_origins_raw: str = os.getenv('ALLOWED_ORIGINS', '')
    rate_limit_per_minute: int = int(os.getenv('RATE_LIMIT_PER_MINUTE', '120'))
    environment: str = os.getenv('ENVIRONMENT', 'development')

    @property
    def allowed_origins(self) -> List[str]:
        if not self.allowed_origins_raw:
            return ['*']
        return [o.strip() for o in self.allowed_origins_raw.split(',') if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == 'production'


settings = Settings()
