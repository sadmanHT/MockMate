"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [interviewId, setInterviewId] = useState("");
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          if (data.status !== 'completed') {
             // Not completed yet, could redirect to live interview page perhaps
          }
          setInterview(data);
        } else {
          setError("Failed to load interview report.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInterview();
  }, [interviewId, router, supabase]);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading Report...</div>;
  }

  if (error || !interview) {
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
            <h2 className="text-red-500 mb-4">{error || "Could not find interview data"}</h2>
            <Link href="/dashboard" className="text-blue-400">Back to Dashboard</Link>
        </div>
    );
  }

  const report = interview.report || {};

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Interview Report</h1>
            <p className="text-gray-400">{interview.job_title}</p>
          </div>
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition">
            &larr; Back to Dashboard
          </Link>
        </header>
        
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center">
            <h3 className="text-gray-400 mb-4">Overall Score</h3>
            <div className={`text-6xl font-bold ${report.overall_score >= 7 ? 'text-green-400' : report.overall_score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
              {report.overall_score || 'N/A'}
              <span className="text-2xl text-gray-500">/10</span>
            </div>
          </div>
          
          <div className="md:col-span-2 bg-gray-800 p-8 rounded-xl border border-gray-700">
            <h3 className="text-xl font-bold mb-4">Summary</h3>
            <p className="text-gray-300 leading-relaxed">{report.summary}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <h3 className="text-green-400 font-bold mb-6 flex items-center text-xl">
              <span className="mr-3">✓</span> Top Strengths
            </h3>
            <ul className="space-y-4">
              {report.top_strengths?.map((s: string, i: number) => (
                <li key={i} className="flex items-start">
                  <span className="text-green-500 mr-2 mt-1">•</span>
                  <span className="text-gray-300">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <h3 className="text-yellow-400 font-bold mb-6 flex items-center text-xl">
              <span className="mr-3">⚠</span> Critical Improvements
            </h3>
            <ul className="space-y-4">
              {report.critical_improvements?.map((s: string, i: number) => (
                <li key={i} className="flex items-start">
                  <span className="text-yellow-500 mr-2 mt-1">•</span>
                  <span className="text-gray-300">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 mb-12">
          <h3 className="text-xl font-bold mb-6">Recommended Resources</h3>
          <ul className="space-y-3">
            {report.recommended_resources?.map((r: string, i: number) => (
              <li key={i} className="text-blue-400">
                <a href={r.startsWith('http') ? r : `https://google.com/search?q=${encodeURIComponent(r)}`} target="_blank" rel="noreferrer" className="hover:underline">
                  {r}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <h2 className="text-2xl font-bold mb-6">Detailed Breakdown</h2>
        <div className="space-y-6">
          {interview.questions?.map((q: string, i: number) => {
            const evalData = interview.evaluations?.[i];
            const answer = interview.answers?.[i];
            return (
              <details key={i} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden group">
                <summary className="p-6 cursor-pointer font-semibold flex justify-between items-center hover:bg-gray-750 transition-colors">
                  <div className="flex-1 pr-4">
                    <span className="text-gray-400 mr-4">Q{i + 1}.</span>
                    {q}
                  </div>
                  <div className="flex items-center space-x-4">
                    {evalData && (
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${evalData.score >= 7 ? 'bg-green-900/50 text-green-400' : evalData.score >= 4 ? 'bg-yellow-900/50 text-yellow-400' : 'bg-red-900/50 text-red-400'}`}>
                        {evalData.score}/10
                      </span>
                    )}
                    <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
                  </div>
                </summary>
                <div className="p-6 pt-0 border-t border-gray-700 bg-gray-800/50">
                  <div className="mb-6 mt-4">
                    <h4 className="text-sm text-gray-500 font-bold mb-2 uppercase tracking-wider">Your Answer</h4>
                    <p className="text-gray-300 bg-gray-900 p-4 rounded-lg">{answer || 'No answer provided'}</p>
                  </div>
                  
                  {evalData && (
                    <>
                      <div className="mb-6">
                        <h4 className="text-sm text-gray-500 font-bold mb-2 uppercase tracking-wider">Feedback</h4>
                        <p className="text-gray-300">{evalData.feedback}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm text-gray-500 font-bold mb-2 uppercase tracking-wider">Model Answer</h4>
                        <p className="text-gray-300 bg-blue-900/20 text-blue-100 p-4 rounded-lg border border-blue-900/50">{evalData.model_answer}</p>
                      </div>
                    </>
                  )}
                </div>
              </details>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <Link 
            href="/interview/new"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-lg text-lg transition shadow-lg shadow-blue-500/30"
          >
            Start Another Interview
          </Link>
        </div>
      </div>
    </div>
  );
}