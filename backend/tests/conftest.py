"""Test fixtures: an in-memory SQLite DB + seeded TestClient, so the API suite runs
without Postgres. (Production uses Postgres via docker-compose.)"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.database as database


@pytest.fixture(scope="session")
def seeded_client():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    database.engine = engine
    database.SessionLocal = TestingSession

    import app.models  # noqa: F401  (register tables)
    import scripts.seed as seed

    seed.SessionLocal = TestingSession
    database.Base.metadata.create_all(engine)
    seed.main()

    from app.database import get_db
    from app.main import app

    def _override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_db
    yield TestClient(app)
    app.dependency_overrides.clear()


MAIN_SLUG = "transparenta-preturilor-medicamentelor-compensate"
