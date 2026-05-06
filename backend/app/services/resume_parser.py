import json
import PyPDF2
import io
from groq import Groq

def extract_text_from_pdf(file_bytes: bytes) -> str:
    pdf_file = io.BytesIO(file_bytes)
    reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
    return text

def parse_resume_with_ai(text: str, groq_client: Groq) -> dict:
    system_prompt = (
        "You are a resume parser. Extract information and return ONLY valid JSON "
        "with keys: skills (list), experience_years (int), job_titles (list), "
        "education (list), projects (list). No explanation, just JSON."
    )
    
    completion = groq_client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text}
        ],
        temperature=0,
        response_format={"type": "json_object"}
    )
    
    response_content = completion.choices[0].message.content
    try:
        return json.loads(response_content)
    except Exception as e:
        return {"error": "Failed to parse JSON response"}
