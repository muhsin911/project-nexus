from app.core.config import Settings


def test_database_url_encodes_credentials_and_enables_tls() -> None:
    settings = Settings(
        _env_file=None,
        POSTGRES_USER="nexus@example",
        POSTGRES_PASSWORD="p@ss/word",
        POSTGRES_SERVER="db.example",
        POSTGRES_PORT=5432,
        POSTGRES_DB="nexus",
        POSTGRES_SSL=True,
    )

    assert settings.DATABASE_URL == (
        "postgresql+asyncpg://nexus%40example:p%40ss%2Fword@db.example:5432/nexus?ssl=require"
    )


def test_redis_url_supports_tls_and_encoded_password() -> None:
    settings = Settings(
        _env_file=None,
        REDIS_HOST="redis.example",
        REDIS_USERNAME="default",
        REDIS_PASSWORD="token:secret",
        REDIS_USE_TLS=True,
    )

    assert settings.REDIS_URL == "rediss://default:token%3Asecret@redis.example:6379/0"


def test_redis_url_without_credentials_preserves_local_default() -> None:
    settings = Settings(_env_file=None)

    assert settings.REDIS_URL == "redis://localhost:6379/0"
