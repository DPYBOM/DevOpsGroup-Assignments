from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)
DATA_FILE = "notes.json"

def load_notes():
    if not os.path.exists(DATA_FILE):
        return {
            "notes": [],
            "viewport": {
                "scale": 1,
                "offsetX": 0,
                "offsetY": 0
            },
            "theme": "light"
        }
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []


def save_notes(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/notes", methods=["GET"])
def get_notes():
    return jsonify(load_notes())


@app.route("/api/notes", methods=["POST"])
def save():
    data = request.json
    save_notes(data)
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)