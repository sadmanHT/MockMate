import os
import json
from groq import Groq

# Initialize Groq client using environment variable
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

def generate_questions(resume_data: dict, job_title: str, job_description: str) -> list:
    system_prompt = (
        "You are an expert technical interviewer. Generate exactly 7 interview questions based "
        "on the candidate resume and job description. Mix behavioural (3), technical (3), and "
        "situational (1) questions. Return ONLY a JSON array of strings. No numbering, no explanation."
    )
    
    prompt = f"""
    Job Title: {job_title}
    Job Description: {job_description}
    Resume Data: {json.dumps(resume_data)}
    """
    
    completion = groq_client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        # Cannot easily enforce json array using json_object response_format, 
        # so we rely on prompt and parse manually. We can also ask for an object with a "questions" key to be safe.
    )
    
    response_content = completion.choices[0].message.content
    try:
        # Assuming model returns a json array directly due to prompt
        # We might need to handle cases where it returns a wrapper object or markdown
        response_content = response_content.strip()
        if response_content.startswith('```json'):
            response_content = response_content[7:-3].strip()
        elif response_content.startswith('```'):
            response_content = response_content[3:-3].strip()
            
        questions = json.loads(response_content)
        if isinstance(questions, list):
            return questions
        elif isinstance(questions, dict) and "questions" in questions:
            return questions["questions"]
        return questions
    except Exception as e:
        print(f"Error parsing questions: {e}")
        return []

def evaluate_answer(question: str, answer: str, resume_data: dict, groq_client_instance: Groq) -> dict:
    system_prompt = (
        "You are an expert technical interviewer evaluating an answer. "
        "Return valid JSON with keys: score (int 1-10), feedback (string), model_answer (string), "
        "strengths (list of strings), improvements (list of strings). "
        "No explanation, just JSON."
    )
    
    prompt = f"""
    Resume Data: {json.dumps(resume_data)}
    Question: {question}
    Candidate Answer: {answer}
    """
    
    completion = groq_client_instance.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        temperature=0.5,
        response_format={"type": "json_object"}
    )
    
    response_content = completion.choices[0].message.content
    try:
        return json.loads(response_content)
    except Exception as e:
        return {"error": "Failed to parse JSON response"}

def generate_final_report(questions: list, answers: list, evaluations: list, job_title: str) -> dict:
    system_prompt = (
        "You are an expert technical interviewer generating a final report. "
        "Return valid JSON with keys: overall_score (int 1-10), summary (string), "
        "top_strengths (list of strings), critical_improvements (list of strings), "
        "recommended_resources (list of strings). No explanation, just JSON."
    )
    
    prompt = f"""
    Job Title: {job_title}
    Questions: {json.dumps(questions)}
    Answers: {json.dumps(answers)}
    Evaluations: {json.dumps(evaluations)}
    """
    
    completion = groq_client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        temperature=0.5,
        response_format={"type": "json_object"}
    )
    
    response_content = completion.choices[0].message.content
    try:
        return json.loads(response_content)
    except Exception as e:
        return {"error": "Failed to parse JSON response"}
