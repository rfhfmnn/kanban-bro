import argparse
from app.db.database import Base, SessionLocal, engine
from app.db.seed import seed_database

def main():
    parser = argparse.ArgumentParser(description="Reset the Kanban Bro database.")
    parser.add_argument(
        "--empty",
        action="store_true",
        help="Wipe the database completely clean (0 users, 0 boards, no seed data).",
    )
    args = parser.parse_args()

    print("Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    print("Recreating database schema...")
    Base.metadata.create_all(bind=engine)

    if args.empty:
        print("Database reset from zero: 0 users, 0 boards, completely blank.")
    else:
        db = SessionLocal()
        try:
            seed_database(db, force_reset=True)
            print("Database reset to clean initial demo state (Alex, Sarah, Miguel).")
        finally:
            db.close()

if __name__ == "__main__":
    main()
