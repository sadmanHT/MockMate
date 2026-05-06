from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.auth import verify_supabase_token, User
from app.database import get_supabase_client
from app.services.resume_parser import extract_text_from_pdf, parse_resume_with_ai
from app.services.interview_engine import generate_questions, evaluate_answer, generate_final_report, get_groq_client
import uuid

router = APIRouter()
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    user = verify_supabase_token(token)
    return user

@router.get("/me", response_model=User)
def get_current_user_route(user: User = Depends(get_current_user)):
    return user

@router.post("/interviews/start")
async def start_interview(
    user: User = Depends(get_current_user),
    job_title: str = Form(...),
    job_description: str = Form(...),
    resume_text: Optional[str] = Form(None),
    pdf_file: Optional[UploadFile] = File(None)
):
    if not resume_text and not pdf_file:
        raise HTTPException(status_code=400, detail="Must provide either resume_text or pdf_file")
        
    text = resume_text or ""
    if pdf_file:
        file_bytes = await pdf_file.read()
        text = extract_text_from_pdf(file_bytes)
        
    groq_client = get_groq_client()
    resume_data = parse_resume_with_ai(text, groq_client)
    questions = generate_questions(resume_data, job_title, job_description)
    
    supabase = get_supabase_client()
    interview_data = {
        "user_id": user.id,
        "job_title": job_title,
        "job_description": job_description,
        "resume_data": resume_data,
        "questions": questions,
        "status": "in_progress",
        "answers": [],
        "evaluations": []
    }
    
    response = supabase.table("interviews").insert(interview_data).execute()
    
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create interview")
        
    interview = response.data[0]
    return {
        "interview_id": interview["id"],
        "questions": questions
    }

from pydantic import BaseModel

class AnswerRequest(BaseModel):
    question_index: int
    answer: str

@router.post("/interviews/{interview_id}/answer")
def answer_question(interview_id: str, request: AnswerRequest, user: User = Depends(get_current_user)):
    supabase = get_supabase_client()
    response = supabase.table("interviews").select("*").eq("id", interview_id).eq("user_id", user.id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    interview = response.data[0]
    questions = interview.get("questions", [])
    
    if request.question_index < 0 or request.question_index >= len(questions):
        raise HTTPException(status_code=400, detail="Invalid question index")
        
    question = questions[request.question_index]
    resume_data = interview.get("resume_data", {})
    
    groq_client = get_groq_client()
    evaluation = evaluate_answer(question, request.answer, resume_data, groq_client)
    
    answers = interview.get("answers", [])
    evaluations = interview.get("evaluations", [])
    
    while len(answers) <= request.question_index:
        answers.append("")
        evaluations.append({})
        
    answers[request.question_index] = request.answer
    evaluations[request.question_index] = evaluation
    
    update_response = supabase.table("interviews").update({
        "answers": answers,
        "evaluations": evaluations
    }).eq("id", interview_id).execute()
    
    return evaluation

@router.post("/interviews/{interview_id}/complete")
def complete_interview(interview_id: str, user: User = Depends(get_current_user)):
    supabase = get_supabase_client()
    response = supabase.table("interviews").select("*").eq("id", interview_id).eq("user_id", user.id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    interview = response.data[0]
    
    questions = interview.get("questions", [])
    answers = interview.get("answers", [])
    evaluations = interview.get("evaluations", [])
    job_title = interview.get("job_title", "")
    
    report = generate_final_report(questions, answers, evaluations, job_title)
    
    update_response = supabase.table("interviews").update({
        "status": "completed",
        "report": report
    }).eq("id", interview_id).execute()
    
    return report

@router.get("/interviews")
def get_interviews(user: User = Depends(get_current_user)):
    supabase = get_supabase_client()
    response = supabase.table("interviews").select("id, job_title, status, created_at, report").eq("user_id", user.id).order("created_at", desc=True).execute()
    return response.data

@router.get("/interviews/{interview_id}")
def get_interview(interview_id: str, user: User = Depends(get_current_user)):
    supabase = get_supabase_client()
    response = supabase.table("interviews").select("*").eq("id", interview_id).eq("user_id", user.id).execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    return response.data[0]

