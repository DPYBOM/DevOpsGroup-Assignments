import os
import pytest

os.environ["SKIP_DB_INIT"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"  # <-- override before import

from app import app, db, AppData


@pytest.fixture
def client():
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    with app.app_context():
        db.create_all()

        if AppData.query.first() is None:
            db.session.add(AppData(data={
                "notes": [],
                "viewport": {
                    "scale": 1,
                    "offsetX": 0,
                    "offsetY": 0
                },
                "theme": "light"
            }))
            db.session.commit()

        yield app.test_client()

        db.session.remove()
        db.drop_all()


def test_home_status_code(client):
    response = client.get("/")
    assert response.status_code == 200


def test_health_status_code(client):
    response = client.get("/health")
    assert response.status_code == 200


def test_load_notes_returns_json(client):
    response = client.get("/api/notes")
    assert response.status_code == 200
    data = response.get_json()
    assert "notes" in data
    assert "theme" in data


def test_save_notes(client):
    payload = {
        "notes": [{"id": 1, "text": "Test note"}],
        "viewport": {"scale": 1, "offsetX": 0, "offsetY": 0},
        "theme": "dark"
    }
    response = client.post("/api/notes", json=payload)
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}

    get_response = client.get("/api/notes")
    saved = get_response.get_json()
    assert saved["theme"] == "dark"
    assert len(saved["notes"]) == 1