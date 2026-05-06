import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-4">
      <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 text-transparent bg-clip-text">
        MockMate
      </h1>
      <p className="text-lg text-gray-400 max-w-md text-center mb-8">
        The AI Mock Interview Platform. Practice your interview skills with highly realistic conversational AI.
      </p>
      <Link 
        href="/auth" 
        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-full font-medium transition-transform transform hover:scale-105"
      >
        Get Started
      </Link>
    </main>
  );
}
