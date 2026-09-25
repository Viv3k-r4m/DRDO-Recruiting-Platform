# SIH1652 — RAC/DRDO Document Verification (Demo)

This is a React + Vite + Tailwind app for SIH1652 RAC/DRDO document verification. The browser reads the selected `Documents` folder and OCRs its files; a local Ollama agent translates multilingual text, extracts fields, and verifies eligibility from the uploaded criteria.

Select a folder containing these six files:
- caste_certificate.jpg
- class12_marksheet.jpg
- college_marksheet.jpg
- gate_scorecard.jpeg
- application_form.pdf
- eligibility_criteria.pdf

Install and run:

```bash
# from project root (d:/sem7/DRDO_Eligibility)
npm install
ollama pull qwen2.5:3b
ollama serve
npm run dev
```

Open http://localhost:5173 and login with `admin@rac.gov.in` / `admin123`.

## Ollama setup

Install Ollama from https://ollama.com/download/windows. Keep `ollama serve` running in a separate terminal. The app calls Ollama through the Vite development proxy at `/ollama/api/chat`, so browser CORS configuration is not required during local development.

`qwen2.5:3b` is the default model because it is fast enough for structured JSON on a typical laptop. To use another installed model, copy `.env.example` to `.env.local`, change `VITE_OLLAMA_MODEL`, and restart Vite:

```bash
copy .env.example .env.local
# edit .env.local, for example: VITE_OLLAMA_MODEL=qwen2.5:7b
ollama pull qwen2.5:7b
npm run dev
```

The Ollama response is constrained to JSON and temperature 0. The app sends at most 12,000 characters per document, asks the model to translate multilingual text and cite short evidence for each rule, and then applies the extracted eligibility criteria locally as a final guard. If Ollama is stopped or returns invalid JSON, the local parser and rules are used automatically and the dashboard shows a warning.

For faster verification:
- Prefer clear, high-resolution scans and avoid unnecessary pages.
- Use `qwen2.5:3b` for speed; use `qwen2.5:7b` when extraction accuracy matters more than latency.
- Keep Ollama and the browser on the same machine so the request does not leave the local system.
- OCR is currently sequential and is usually the slowest stage; the first Tesseract language-pack download is also slower. The Ollama call is a single request after OCR.

Notes:
- Tesseract.js recognizes English and Hindi; PDF OCR renders the first page with pdf.js.
- The browser folder picker requires selecting the complete `Documents` folder.
- Login: `admin@rac.gov.in` / `admin123`.
- OCR language packs are downloaded by Tesseract.js on first use, so the first run can take a little longer.
- Ollama is optional at runtime because the deterministic fallback remains available.
