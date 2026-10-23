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
    # Shared secret for the external cron that wakes the server for reminders
    cron_secret: str = os.getenv('CRON_SECRET', '')
    # Comma-separated emails allowed into the admin dashboard (verified email required)
    admin_emails_raw: str = os.getenv('ADMIN_EMAILS', 'jashwanthjavili7@gmail.com')

    @property
    def admin_emails(self) -> List[str]:
        return [e.strip().lower() for e in self.admin_emails_raw.split(',') if e.strip()]

    @property
    def allowed_origins(self) -> List[str]:
        if not self.allowed_origins_raw:
            return ['*']
        return [o.strip() for o in self.allowed_origins_raw.split(',') if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == 'production'


settings = Settings()
