from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@db:5432/notesdb"
)

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


# Single table storing entire app state as JSON
class AppData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    data = db.Column(db.JSON)


if os.getenv("SKIP_DB_INIT") != "1":
    with app.app_context():
        db.create_all()

        # Ensure one row exists
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


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/notes", methods=["GET"])
def load_data():
    appdata = AppData.query.first()
    return jsonify(appdata.data)


@app.route("/api/notes", methods=["POST"])
def save_data():
    appdata = AppData.query.first()
    appdata.data = request.json
    db.session.commit()
    return jsonify({"status": "ok"})

@app.route("/health")
def health():
    return {"status": "ok"}, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)