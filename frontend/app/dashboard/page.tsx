"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Link from 'next/link';

export default function DashboardPage() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }
      setUser(session.user);
      
      try {
        const response = await fetch(${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/interviews, {
          headers: {
            'Authorization': \Bearer ${session.access_token}\
          }
        });
        if (response.ok) {
          const data = await response.json();
          setInterviews(data);
        }
      } catch (err) {
        console.error("Failed to fetch interviews", err);
      }
      setLoading(false);
    };
    fetchDashboardData();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold">MockMate Dashboard</h1>
            <p className="text-gray-400 mt-2">Welcome back, {user?.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-600 rounded hover:bg-gray-800 transition"
          >
            Logout
          </button>
        </header>

        <section className="mb-12 text-center p-12 bg-gray-800 rounded-xl border border-gray-700">
          <h2 className="text-2xl font-semibold mb-6">Ready for your next mock interview?</h2>
          <Link 
            href="/interview/new"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition shadow-lg shadow-blue-500/30"
          >
            Start New Interview
          </Link>
        </section>

        <section>
          <h3 className="text-xl font-semibold mb-6">Past Interviews</h3>
          {interviews.length === 0 ? (
            <p className="text-gray-400">No interviews yet. Start one above!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {interviews.map(interview => (
                <div key={interview.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                  <h4 className="font-bold text-lg">{interview.job_title}</h4>
                  <p className="text-gray-400 text-sm mb-4">
                    {new Date(interview.created_at).toLocaleDateString()}
                  </p>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <span className={\	ext-xs px-2 py-1 rounded ${interview.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}\}>
                        {interview.status}
                      </span>
                    </div>
                    {interview.status === 'completed' && interview.report?.overall_score && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-400">{interview.report.overall_score}/10</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <Link href={\/interview/${interview.id}${interview.status === 'completed' ? '/report' : ''}\} className="text-blue-400 hover:underline">
                      View Details &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
