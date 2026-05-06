"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LiveInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [interviewId, setInterviewId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState("");
  
  const [evaluation, setEvaluation] = useState<any>(null);
  
  useEffect(() => {
    if (params.id) {
      setInterviewId(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    const fetchInterview = async () => {
      if (!interviewId) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/auth");
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/interviews/${interviewId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setQuestions(data.questions || []);
          
          // Determine current question based on past answers length
          const pastAnswers = data.answers || [];
          if (pastAnswers.length > 0) {
              const nextIndex = pastAnswers.length;
              if (nextIndex >= data.questions.length) {
                  // already finished answering all questions
                  router.push(`/interview/${interviewId}/report`);
              } else {
                  setCurrentIndex(nextIndex);
              }
          }
        } else {
          setError("Failed to load interview.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInterview();
  }, [interviewId, router, supabase]);

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) return;
    
    setSubmitting(true);
    setEvaluation(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/interviews/${interviewId}/answer`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question_index: currentIndex,
          answer: answerText
        })
      });
      
      if (!response.ok) throw new Error("Failed to submit answer");
      
      const evalData = await response.json();
      setEvaluation(evalData);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswerText("");
      setEvaluation(null);
    } else {
      // Complete interview
      setSubmitting(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/interviews/${interviewId}/complete`, {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });
        
        if (response.ok) {
          router.push(`/interview/${interviewId}/report`);
        } else {
          throw new Error("Failed to complete interview");
        }
      } catch (err: any) {
        setError(err.message);
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading Interview...</div>;
  }

  if (error) {
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
            <h2 className="text-red-500 mb-4">{error}</h2>
            <button onClick={() => router.push('/dashboard')} className="text-blue-400">Back to Dashboard</button>
        </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercentage = ((currentIndex) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto relative">
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Question {currentIndex + 1} of {questions.length}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 mb-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 leading-relaxed">
            {currentQuestion}
          </h2>
          
          <textarea
            className="w-full h-48 bg-gray-900 border border-gray-600 rounded-lg p-4 text-white focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Type your answer here..."
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            disabled={submitting || !!evaluation}
          />
          
          {!evaluation && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmitAnswer}
                disabled={submitting || !answerText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition"
              >
                {submitting ? 'Evaluating...' : 'Submit Answer'}
              </button>
            </div>
          )}
        </div>

        {evaluation && (
          <div className="bg-gray-800 rounded-xl p-8 border border-blue-900/50 mb-8 animate-in slide-in-from-bottom-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Feedback</h3>
              <div className={`text-2xl font-bold ${evaluation.score >= 7 ? 'text-green-400' : evaluation.score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                {evaluation.score}/10
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">{evaluation.feedback}</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-green-400 font-semibold mb-3 flex items-center">
                  <span className="mr-2">✓</span> Strengths
                </h4>
                <ul className="space-y-2">
                  {evaluation.strengths?.map((s: string, i: number) => (
                    <li key={i} className="text-gray-300 text-sm bg-gray-900/50 p-2 rounded border border-green-900/30">{s}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-yellow-400 font-semibold mb-3 flex items-center">
                  <span className="mr-2">⚠</span> Improvements
                </h4>
                <ul className="space-y-2">
                  {evaluation.improvements?.map((s: string, i: number) => (
                    <li key={i} className="text-gray-300 text-sm bg-gray-900/50 p-2 rounded border border-yellow-900/30">{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="mt-8 border-t border-gray-700 pt-6">
              <h4 className="text-gray-400 font-semibold mb-3">Model Answer</h4>
              <p className="text-sm text-gray-300 bg-gray-900 p-4 rounded-lg">{evaluation.model_answer}</p>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleNext}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition"
              >
                {currentIndex < questions.length - 1 ? 'Next Question' : 'Complete Interview'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}