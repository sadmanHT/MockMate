"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function NewInterviewPage() {
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }

      const formData = new FormData();
      formData.append("job_title", jobTitle);
      formData.append("job_description", jobDescription);
      
      if (pdfFile) {
        formData.append("pdf_file", pdfFile);
      } else if (resumeText) {
        formData.append("resume_text", resumeText);
      } else {
        setError("Please provide either a resume PDF or text.");
        setLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/interviews/start`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Failed to start interview");
      }

      const data = await response.json();
      router.push(`/interview/${data.interview_id}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Start New Interview</h1>
        
        {error && (
          <div className="bg-red-900 border border-red-700 text-white p-4 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-8 rounded-xl border border-gray-700">
          <div>
            <label className="block text-sm font-medium mb-2">Job Title</label>
            <input 
              type="text" 
              required
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-blue-500"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Job Description</label>
            <textarea 
              required
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white h-32 focus:outline-none focus:border-blue-500"
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
            />
          </div>

          <div className="border-t border-gray-700 pt-6">
            <label className="block text-sm font-medium mb-4">Resume</label>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-blue-500 transition cursor-pointer">
                <input 
                  type="file" 
                  accept="application/pdf"
                  className="hidden" 
                  id="pdf-upload"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setPdfFile(e.target.files[0]);
                      setResumeText("");
                    }
                  }}
                />
                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                  <span className="text-4xl mb-2">📄</span>
                  <span className="text-sm font-semibold">{pdfFile ? pdfFile.name : 'Upload PDF Resume'}</span>
                </label>
              </div>
              
              <div className="flex flex-col">
                <span className="text-center text-gray-500 text-sm mb-2">OR</span>
                <textarea 
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white flex-grow focus:outline-none focus:border-blue-500"
                  value={resumeText}
                  onChange={e => {
                    setResumeText(e.target.value);
                    setPdfFile(null);
                  }}
                  placeholder="Paste your resume text here..."
                  disabled={!!pdfFile}
                />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:text-gray-400 text-white font-bold py-4 rounded-lg text-lg transition"
            >
              {loading ? 'Analyzing Resume & Generating Questions...' : 'Start Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}