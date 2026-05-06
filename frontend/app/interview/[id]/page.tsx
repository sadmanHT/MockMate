"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Mic, Settings, Volume2, Type } from "lucide-react";
import VoiceButton from "@/components/VoiceButton";
import InterviewerSpeaker from "@/components/InterviewerSpeaker";
import AudioVisualizer from "@/components/AudioVisualizer";
import { MockMateSpeechRecognition } from "@/lib/speechRecognition";

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

  // --- Voice Mode State ---
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Settings
  const [preferredVoiceURI, setPreferredVoiceURI] = useState<string>("");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [silenceTimeout, setSilenceTimeout] = useState(2); // seconds

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<MockMateSpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load preferences
  useEffect(() => {
    const savedAutoSpeak = localStorage.getItem("mm_autoSpeak");
    const savedAutoSubmit = localStorage.getItem("mm_autoSubmit");
    const savedVoice = localStorage.getItem("mm_voiceURI");
    const savedTimeout = localStorage.getItem("mm_silenceTimeout");

    if (savedAutoSpeak !== null) setAutoSpeak(savedAutoSpeak === "true");
    if (savedAutoSubmit !== null) setAutoSubmit(savedAutoSubmit === "true");
    if (savedVoice !== null) setPreferredVoiceURI(savedVoice);
    if (savedTimeout !== null) setSilenceTimeout(parseInt(savedTimeout, 10));

    // Load available voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (!savedVoice && voices.length > 0) {
        // Find default english female if possible
        const defaultVoice = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha'))) || voices.find(v => v.lang.startsWith('en')) || voices[0];
        setPreferredVoiceURI(defaultVoice.voiceURI);
      }
    };
    
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem("mm_autoSpeak", autoSpeak.toString());
    localStorage.setItem("mm_autoSubmit", autoSubmit.toString());
    localStorage.setItem("mm_voiceURI", preferredVoiceURI);
    localStorage.setItem("mm_silenceTimeout", silenceTimeout.toString());
  }, [autoSpeak, autoSubmit, preferredVoiceURI, silenceTimeout]);


  // Initialize Speech Recognition
  useEffect(() => {
    if (!evaluation && !submitting) {
        recognitionRef.current = new MockMateSpeechRecognition(
        (interim, final) => {
            setInterimTranscript(interim);
            if (final) {
                setAnswerText((prev) => (prev ? prev + " " + final : final));
                setInterimTranscript("");
            }

            if (autoSubmit && isListening) {
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                
                silenceTimerRef.current = setTimeout(() => {
                    handleStopListeningAndSubmit();
                }, silenceTimeout * 1000);
            }
        },
        (err) => {
            console.error("Speech Rec Error:", err);
            setIsListening(false);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        },
        () => {
            setIsListening(false);
        }
        );
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [autoSubmit, silenceTimeout, isListening, evaluation, submitting]);

  useEffect(() => {
    return () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  }, []);

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
          
          const pastAnswers = data.answers || [];
          if (pastAnswers.length > 0) {
              const nextIndex = pastAnswers.length;
              if (nextIndex >= data.questions.length) {
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


  const handleStopListeningAndSubmit = () => {
      if (recognitionRef.current) {
          recognitionRef.current.stop();
          setIsListening(false);
      }
      
      setTimeout(() => {
          submitAnswerForm();
      }, 500);
  }

  const submitAnswerForm = async () => {
    setAnswerText((currentAns) => {
        if (!currentAns.trim()) return currentAns;
        
        const doSubmit = async (answerPayload: string) => {
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
                  answer: answerPayload
                })
              });
              
              if (!response.ok) throw new Error("Failed to submit answer");
              
              const evalData = await response.json();
              setEvaluation(evalData);
              
              if (isVoiceMode && autoSpeak && window.speechSynthesis) {
                  setTimeout(() => {
                      const msg = new SpeechSynthesisUtterance(`You scored ${evalData.score} out of 10. Your main strength was ${evalData.strengths?.[0] || 'good'}. Consider improving ${evalData.improvements?.[0] || 'this area'}.`);
                      const voice = window.speechSynthesis.getVoices().find(v => v.voiceURI === preferredVoiceURI);
                      if (voice) msg.voice = voice;
                      window.speechSynthesis.speak(msg);
                  }, 1000);
              }
              
            } catch (err: any) {
              setError(err.message);
            } finally {
              setSubmitting(false);
            }
        };

        doSubmit(currentAns);
        return currentAns;
    });
  };

  const handleSubmitAnswerClick = () => {
      if (isListening && recognitionRef.current) {
          recognitionRef.current.stop();
          setIsListening(false);
      }
      submitAnswerForm();
  };

  const handleNext = async () => {
    window.speechSynthesis.cancel(); 

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnswerText("");
      setInterimTranscript("");
      setEvaluation(null);
    } else {
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

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    } else {
      window.speechSynthesis.cancel(); 
      setInterimTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
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
        
        <div className="flex justify-between items-center mb-6">
            <div className="flex bg-gray-800 rounded-lg p-1">
                <button 
                  onClick={() => { setIsVoiceMode(false); window.speechSynthesis.cancel(); }}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${!isVoiceMode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                >
                    <Type size={16} className="mr-2" /> Text Mode
                </button>
                <button 
                  onClick={() => setIsVoiceMode(true)}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${isVoiceMode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                >
                    <Volume2 size={16} className="mr-2" /> Voice Mode
                </button>
            </div>

            {isVoiceMode && (
              <div className="relative">
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition"
                  >
                      <Settings size={20} className="text-gray-300" />
                  </button>

                  {showSettings && (
                      <div className="absolute right-0 top-12 w-80 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl z-50">
                          <h4 className="font-bold border-b border-gray-700 pb-2 mb-3">Audio Settings</h4>
                          
                          <div className="space-y-4 text-sm">
                              <div className="flex flex-col gap-1">
                                  <label>Interviewer Voice</label>
                                  <select 
                                      value={preferredVoiceURI}
                                      onChange={(e) => setPreferredVoiceURI(e.target.value)}
                                      className="bg-gray-900 border border-gray-700 rounded p-1 text-white"
                                  >
                                      {availableVoices.map(v => (
                                          <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                                      ))}
                                  </select>
                              </div>

                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                      type="checkbox" 
                                      checked={autoSpeak}
                                      onChange={(e) => setAutoSpeak(e.target.checked)}
                                      className="rounded bg-gray-900 border-gray-700 text-blue-500 focus:ring-blue-600"
                                  />
                                  Auto-speak questions
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                      type="checkbox" 
                                      checked={autoSubmit}
                                      onChange={(e) => setAutoSubmit(e.target.checked)}
                                      className="rounded bg-gray-900 border-gray-700 text-blue-500 focus:ring-blue-600"
                                  />
                                  Auto-submit after silence
                              </label>

                              {autoSubmit && (
                                  <div className="flex flex-col gap-1">
                                      <label className="text-gray-400">Silence timeout: {silenceTimeout} seconds</label>
                                      <input 
                                          type="range" 
                                          min="1" 
                                          max="5" 
                                          value={silenceTimeout}
                                          onChange={(e) => setSilenceTimeout(parseInt(e.target.value))}
                                          className="w-full accent-blue-600"
                                      />
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
            )}
        </div>

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
          <h2 className="text-2xl font-bold mb-4 leading-relaxed">
            {currentQuestion}
          </h2>

          {isVoiceMode && !evaluation && (
            <div className="mb-6">
                <InterviewerSpeaker 
                    text={currentQuestion} 
                    autoSpeak={autoSpeak} 
                    preferredVoiceURI={preferredVoiceURI}
                />
            </div>
          )}

          {isVoiceMode && !evaluation && (
             <div className="my-8 flex flex-col items-center justify-center">
                <div className="h-16 flex items-center justify-center mb-8">
                    <AudioVisualizer isActive={isListening} />
                </div>
                <VoiceButton 
                    isListening={isListening} 
                    onClick={toggleListening} 
                    isDisabled={submitting} 
                    interimTranscript={interimTranscript}
                />
             </div>
          )}
          
          <textarea
            className={`w-full h-48 bg-gray-900 border border-gray-600 rounded-lg p-4 text-white focus:outline-none focus:border-blue-500 resize-none ${isVoiceMode ? 'hidden' : 'block'}`}
            placeholder="Type your answer here..."
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            disabled={submitting || !!evaluation}
          />
          
          {!evaluation && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmitAnswerClick}
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
