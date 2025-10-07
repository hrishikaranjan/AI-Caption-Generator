import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import google.generativeai as genai
from PIL import Image
import io

# ====== CONFIG ======
# ✅ Use your actual Gemini API key here
GEMINI_API_KEY = "AIzaSyA5zdew34KdrB4aFccLLrbIZzjK0OPiEwI"  # <-- replace with your valid key
MODEL_NAME = "gemini-2.5-flash"  # ✅ Updated model

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# ====== APP ======
app = Flask(__name__)
CORS(app)  # Allow all origins for development

@app.route("/health", methods=["GET"])
def health():
    ok = bool(GEMINI_API_KEY)
    return jsonify({
        "ok": ok,
        "has_token": ok,
        "model": MODEL_NAME,
    }), (200 if ok else 500)


@app.route("/api/caption", methods=["POST"])
def caption():
    if not GEMINI_API_KEY:
        return jsonify({"error": "Gemini API key not set"}), 500

    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    try:
        # Read image bytes and open via PIL
        img_bytes = file.read()
        image = Image.open(io.BytesIO(img_bytes))

        # ✅ Use updated model name
        model = genai.GenerativeModel(MODEL_NAME)

        prompt = "🖼️ Generate a short and meaningful caption for this image with a friendly tone."

        # Generate caption
        response = model.generate_content([prompt, image])

        caption_text = response.text.strip() if response and response.text else "No caption generated."

        return jsonify({"caption": caption_text})

    except Exception as e:
        print("Server error:", e)
        return jsonify({"error": f"Server error: {e}"}), 500


@app.route("/")
def index_page():
    return send_from_directory("..", "index.html")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=True)
