from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:password@localhost/quantaview"
)

# Configure SSL for Railway PostgreSQL
connect_args = {
    "connect_timeout": 30,
    "application_name": "quantaview-api",
    "options": "-c statement_timeout=30000"
}

# Add SSL configuration for Railway PostgreSQL if not localhost
if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL:
    connect_args.update({
        "sslmode": "require",
        "sslcert": None,
        "sslkey": None,
        "sslrootcert": None
    })

# Create SQLAlchemy engine with connection pooling and retry logic
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=3,
    max_overflow=7,
    connect_args=connect_args
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()