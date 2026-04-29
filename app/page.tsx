import { Benefits } from "./_components/Benefits";
import { FAQ } from "./_components/FAQ";
import { FinalCTA } from "./_components/FinalCTA";
import { Footer } from "./_components/Footer";
import { Hero } from "./_components/Hero";
import { ImplementationFlow } from "./_components/ImplementationFlow";
import { Problems } from "./_components/Problems";
import { ProcessFlow } from "./_components/ProcessFlow";
import { Solution } from "./_components/Solution";
import { UseCases } from "./_components/UseCases";
import { getAppSession } from "@/server/auth/session";

export default async function LandingPage() {
  const session = await getAppSession();

  return (
    <div className="dark min-h-screen bg-[#0f1729] text-white">
      <Hero isSignedIn={Boolean(session?.user)} />
      <Problems />
      <Solution />
      <Benefits />
      <ProcessFlow />
      <ImplementationFlow />
      <UseCases />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
