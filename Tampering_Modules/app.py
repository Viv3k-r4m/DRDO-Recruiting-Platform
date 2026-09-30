from flask import Flask, render_template, request
import cv2
import numpy as np
from ultralytics import YOLO
from PIL import Image, ImageChops, ImageEnhance
import os

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "static/outputs"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# 🔹 Load models (TensorFlow removed for lightweight processing)
yolo_model = YOLO("yolov8n.pt")  # lightweight pretrained

IMG_SIZE = 128

# ---------------- Lightweight ELA Prediction ----------------
def predict_tamper(image_path):
    # Using lightweight Error Level Analysis (ELA) statistics instead of heavy CNN
    ela_img = get_ela_image(image_path)
    gray = cv2.cvtColor(ela_img, cv2.COLOR_BGR2GRAY)
    
    # Analyze the standard deviation (variance in compression artifacts)
    std_val = np.std(gray)
    mean_val = np.mean(gray)
    
    # Normalize score between 0 and 1 using an empirical threshold
    # High standard deviation indicates localized tampering
    pred = min(std_val / 40.0, 1.0) 
    
    label = "Tampered" if pred > 0.55 else "Authentic"
    return label, float(pred)

# ---------------- ELA Bounding Boxes ----------------
def get_ela_image(path, quality=90):
    original = Image.open(path).convert('RGB')
    temp_path = "temp.jpg"
    original.save(temp_path, 'JPEG', quality=quality)
    compressed = Image.open(temp_path)

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

        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        # CNN
        label, confidence = predict_tamper(filepath)

        # ELA
        image, tamper_regions = detect_tamper_regions(filepath)

        # YOLO
        image, seal_count = detect_seal(image)

        output_path = os.path.join(OUTPUT_FOLDER, file.filename)
        cv2.imwrite(output_path, image)

        return render_template("index.html",
                               result=label,
                               confidence=round(confidence, 2),
                               tamper_regions=tamper_regions,
                               seals=seal_count,
                               image_path=file.filename)

    return render_template("index.html")

@app.route("/api/check_tamper", methods=["POST"])
def check_tamper_api():
    if "file" not in request.files:
        return {"error": "No file provided"}, 400
        
    file = request.files["file"]
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)
    
    label, confidence = predict_tamper(filepath)
    image, tamper_regions = detect_tamper_regions(filepath)
    image, seal_count = detect_seal(image)
    
    # Save output image so frontend can display the ELA/YOLO bounding boxes if needed
    output_filename = "processed_" + file.filename
    output_path = os.path.join(OUTPUT_FOLDER, output_filename)
    cv2.imwrite(output_path, image)
    
    return {
        "result": label,
        "confidence": round(float(confidence), 2),
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

# Enable CORS for the API
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == "__main__":
    app.run(debug=True)