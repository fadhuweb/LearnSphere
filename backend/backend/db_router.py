import os

class DatabaseRouter:
    """
    Directs database operations to SQLite when offline,
    and to PostgreSQL when online.
    """
    
    def db_for_read(self, model, **hints):
        """Read operations go to SQLite if offline mode is enabled."""
        return 'default' if os.getenv('USE_SQLITE', 'false').lower() == 'true' else 'default'

    def db_for_write(self, model, **hints):
        """Write operations go to SQLite if offline mode is enabled."""
        return 'default' if os.getenv('USE_SQLITE', 'false').lower() == 'true' else 'default'

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Migrations apply to both databases."""
        return True
