from flask import Flask, render_template, request
import cv2
import numpy as np
import tensorflow as tf
from ultralytics import YOLO
from PIL import Image, ImageChops, ImageEnhance
from io import BytesIO
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
OUTPUT_FOLDER = os.path.join(BASE_DIR, "static", "outputs")
MODEL_FOLDER = os.path.join(BASE_DIR, "model")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

IMG_SIZE = 128
TAMPER_THRESHOLD = 0.5
tamper_models = {
    "tamper_cnn": tf.keras.models.load_model(
        os.path.join(MODEL_FOLDER, "tamper_cnn.h5"), compile=False
    ),
    "aiforge_doc_cnn": tf.keras.models.load_model(
        os.path.join(MODEL_FOLDER, "aiforge_doc_cnn.keras"), compile=False
    ),
}
yolo_model = YOLO(os.path.join(BASE_DIR, "yolov8n.pt"))

# ---------------- CNN Tamper Prediction ----------------
def predict_tamper(image_path):
    with Image.open(image_path) as image:
        image = image.convert("RGB").resize((IMG_SIZE, IMG_SIZE))
        input_tensor = np.asarray(image, dtype=np.float32) / 255.0
    input_tensor = np.expand_dims(input_tensor, axis=0)

    model_scores = {
        name: float(np.asarray(model.predict(input_tensor, verbose=0)).reshape(-1)[0])
        for name, model in tamper_models.items()
    }
    is_tampered = any(score >= TAMPER_THRESHOLD for score in model_scores.values())
    label = "Tampered" if is_tampered else "Authentic"
    strongest_tamper_score = max(model_scores.values())
    confidence = (
        strongest_tamper_score
        if is_tampered
        else 1.0 - strongest_tamper_score
    )
    return label, float(confidence), model_scores

# ---------------- ELA Bounding Boxes ----------------
def get_ela_image(path, quality=90):
    with Image.open(path) as source:
        original = source.convert("RGB")
    temp_image = BytesIO()
    original.save(temp_image, "JPEG", quality=quality)
    temp_image.seek(0)
    compressed = Image.open(temp_image)

    ela = ImageChops.difference(original, compressed)

    extrema = ela.getextrema()
    max_diff = max([ex[1] for ex in extrema])

    scale = 255.0 / max_diff if max_diff != 0 else 1
    ela = ImageEnhance.Brightness(ela).enhance(scale)

    return np.array(ela)

def detect_tamper_regions(image_path):
    ela_img = get_ela_image(image_path)

    gray = cv2.cvtColor(ela_img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    image = cv2.imread(image_path)

    count = 0
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w*h > 500:
            count += 1
            cv2.rectangle(image, (x,y), (x+w,y+h), (0,0,255), 2)

    return image, count

# ---------------- YOLO Seal Detection ----------------
def detect_seal(image):
    results = yolo_model(image)[0]

    count = 0
    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        count += 1
        cv2.rectangle(image, (x1,y1), (x2,y2), (255,0,0), 2)

    return image, count

# ---------------- MAIN ROUTE ----------------
@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        file = request.files["file"]

        filename = secure_filename(file.filename)
        if not filename:
            return "Please select a valid file.", 400

        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        label, confidence, model_scores = predict_tamper(filepath)

        # ELA
        image, tamper_regions = detect_tamper_regions(filepath)

        # YOLO
        image, seal_count = detect_seal(image)

        output_path = os.path.join(OUTPUT_FOLDER, filename)
        cv2.imwrite(output_path, image)

        return render_template("index.html",
                               result=label,
                               confidence=confidence,
                               model_scores=model_scores,
                               tamper_regions=tamper_regions,
                               seals=seal_count,
                               image_path=filename)

    return render_template("index.html")

@app.route("/api/check_tamper", methods=["POST"])
def check_tamper_api():
    if "file" not in request.files:
        return {"error": "No file provided"}, 400
        
    file = request.files["file"]
    filename = secure_filename(file.filename)
    if not filename:
        return {"error": "Invalid file name"}, 400

    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    
    label, confidence, model_scores = predict_tamper(filepath)
    image, tamper_regions = detect_tamper_regions(filepath)
    image, seal_count = detect_seal(image)
    
    # Save output image so frontend can display the ELA/YOLO bounding boxes if needed
    output_filename = "processed_" + filename
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)
    cv2.imwrite(output_path, image)
    
    return {
        "result": label,
        "confidence": round(float(confidence), 2),
        "model_scores": model_scores,
        "tamper_regions": tamper_regions,
        "seals": seal_count,
        "output_image_url": f"http://127.0.0.1:5000/static/outputs/{output_filename}"
    }

from deep_translator import MyMemoryTranslator, PonsTranslator

@app.route("/api/translate", methods=["POST"])
def translate_api():
    data = request.json
    if not data or "text" not in data:
        return {"error": "No text provided"}, 400
        
    text = data["text"]
    try:
        # Use MyMemoryTranslator as the primary completely free service
        # Providing an email bumps the free limit to 10,000 words/day!
        translated = MyMemoryTranslator(source='en-GB', target='hi-IN', email='admin@drdo.gov.in').translate(text)
        return {"translated_text": translated}
    except Exception as e:
        print(f"MyMemory failed: {e}. Trying fallback PonsTranslator...")
        try:
            # Another completely free alternative
            translated = PonsTranslator(source='en', target='hi').translate(text)
            return {"translated_text": translated}
        except Exception as fallback_e:
            return {"error": f"All free translators failed. {str(fallback_e)}"}, 500

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

@app.route("/api/send_email", methods=["POST"])
def send_email_api():
    data = request.json
    if not data or "to" not in data or "subject" not in data or "text" not in data:
        return {"error": "Missing email fields"}, 400
        
    sender_email = "vigneshwarlal@student.tce.edu" # Replace with user's real email
    app_password = "DRDO"            # Replace with 16-digit App Password
    
    try:
        # Construct Email
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = data["to"]
        msg['Subject'] = data["subject"]
        msg.attach(MIMEText(data["text"], 'plain'))
        
        # Connect to Gmail SMTP Server securely
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(sender_email, app_password)
        server.send_message(msg)
        server.quit()
        
        return {"success": True, "message": "Email sent successfully"}
    except Exception as e:
        print(f"SMTP failed: {e}")
        return {"error": f"Failed to send email. Ensure you configured your App Password in app.py. Error: {str(e)}"}, 500

# Enable CORS for the API
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == "__main__":
    app.run(debug=True)