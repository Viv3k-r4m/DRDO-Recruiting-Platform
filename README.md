# SIH1652 — DRDO RAC NextGen Recruitment Platform

A fully integrated, multi-tier recruitment system built for the Defence Research and Development Organisation (DRDO) Recruitment & Assessment Centre (RAC). This platform automates the ingestion, forensic validation, and eligibility screening of applicant documents using Machine Learning, OCR, and AI heuristics.

## Features & Architecture

1. **Intelligent Applicant Dashboard (`React/Vite`)**:
   - Secure applicant login and document uploading.
   - Real-time application tracking (Pending -> Verification -> Eligible -> Role Assigned).
   - **Dynamic Resume Upload**: If marked eligible, the dashboard instantly prompts the candidate to upload their resume.

2. **Admin & AI Verification Engine (`React/Vite` + `Python/Flask`)**:
   - **Forensic Tampering Check**: A Python-based TensorFlow CNN model checks documents for digital forgery (Error Level Analysis).
   - **Smart OCR Extraction**: Tesseract.js dynamically scans specific files (12th marksheet, B.Tech degree, caste certificate) to extract scores, ignoring chaotic layouts.
   - **Multilingual Cross-Referencing**: Extracts Candidate & Father Names, translates them using a free MyMemory API, and cross-references them across all Hindi/English documents to prevent identity fraud.
   
3. **AI Role Assignment**:
   - **Resume Overview**: Admins can view the uploaded resume directly in the browser via an iframe.
   - **Role Heuristics**: The system analyzes the verified technical discipline (e.g., CS, EC, ME) from the OCR extraction and intelligently suggests the appropriate scientist tier/role.

4. **100% Free Automated SMTP Emailing (`Node.js/Express`)**:
   - Replaced paid Firebase Email Extensions with a bespoke `mail_server.js` using `nodemailer`.
   - Dispatches real-time approval, rejection, and final role-assignment emails directly to applicants via a Gmail App Password.

---

## 🛠️ Installation & Setup

You will need three separate terminal windows to run the full stack locally.

### 1. React Frontend (Vite)
Navigate to the root directory and install dependencies:
```bash
npm install
npm run dev
```
- App runs on: `http://localhost:5173`
- Default Admin Login: `admin@rac.gov.in` / `admin123`

### 2. Python AI Backend (Forensics & Translation)
Navigate to the tampering modules directory, install requirements, and run the Flask server:
```bash
cd Tampering_modules
pip install -r requirements.txt
python app.py
```
- Backend runs on: `http://127.0.0.1:5000`

*(Note: The Python backend requires `tensorflow`. If you encounter an `ImportError` on Python 3.14, ensure you are using a compatible Python version (3.9 - 3.11).)*

### 3. Node.js Mail Server
To enable 100% free automated emails, you must run the standalone mail server.

**Configuration:**
Before running, open `mail_server.js` in the root directory. Update lines 14 & 15 with your Gmail address and a **16-digit Gmail App Password**. *(Do NOT use your regular email password. Go to Google Account > Security > App Passwords).*

```bash
# From the root directory:
node mail_server.js
```
- Mail server runs on: `http://localhost:3001`

---

## 🚨 Troubleshooting
- **Firebase Permission Denied**: Ensure your `firebaseConfig` in `src/firebase.js` is correct and your Firestore Rules allow read/write access.
- **Emails Not Sending**: The Node mail server will throw an `EAUTH 535` error if your App Password is wrong or if you forgot to restart `mail_server.js` after saving your credentials.
- **Translation Rate Limits**: The Python backend uses `MyMemoryTranslator`. It is completely free and allows up to 10,000 words/day using the configured DRDO admin email.
