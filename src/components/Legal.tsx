import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Shield, FileText, Lock } from 'lucide-react';

interface LegalProps {
  onBack: () => void;
}

export const Legal: React.FC<LegalProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 pb-24">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 bg-zinc-900 rounded-full border border-zinc-800">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">Legal & Privacy</h1>
      </header>

      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-brand-500">
            <Shield size={24} />
            <h2 className="text-xl font-bold">Privacy Policy</h2>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-6 space-y-4 text-sm text-zinc-400 leading-relaxed">
            <p>
              Your privacy is our priority. EvolveFit AI uses Gemini AI to process your body scan photos locally and securely. 
              We do not store your raw images on our servers; they are processed to generate your fitness metrics and then discarded.
            </p>
            <p>
              We collect minimal data required for your account, including your email and basic fitness profile, to provide a personalized experience.
            </p>
            <p className="font-bold text-zinc-200">Data Handling:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Photos are processed via encrypted channels.</li>
              <li>Your workout history is stored securely in Supabase.</li>
              <li>We do not sell your data to third parties.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 text-brand-500">
            <FileText size={24} />
            <h2 className="text-xl font-bold">Terms of Service</h2>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-6 space-y-4 text-sm text-zinc-400 leading-relaxed">
            <p>
              By using EvolveFit AI, you agree to our terms. This application is an AI-powered fitness tool and should not replace professional medical advice.
            </p>
            <p>
              Always consult with a physician before starting any new exercise program. EvolveFit AI is not responsible for any injuries sustained while following AI-generated plans.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3 text-brand-500">
            <Lock size={24} />
            <h2 className="text-xl font-bold">GDPR Compliance</h2>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-900 rounded-3xl p-6 space-y-4 text-sm text-zinc-400 leading-relaxed">
            <p>
              We respect your right to data portability and erasure. You can request a full export of your data or account deletion at any time through the settings menu.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
