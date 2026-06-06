import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Shield, Layers, HelpCircle, ArrowRight, CheckCircle, 
  Mail, Phone, Send, Info, FileText, Globe, Building, Clock, Key,
  Check, ChevronRight
} from 'lucide-react';

interface MarketingViewsProps {
  activeSection: 'home' | 'services' | 'about' | 'contact';
  isLoggedIn: boolean;
  onNavigateToEditor: () => void;
  onTriggerAuth: () => void;
  onContactSubmitted?: (data: any) => void;
}

export default function MarketingViews({
  activeSection,
  isLoggedIn,
  onNavigateToEditor,
  onTriggerAuth,
  onContactSubmitted
}: MarketingViewsProps) {
  
  // Local state for interactive features
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [sendingForm, setSendingForm] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    
    setSendingForm(true);
    // Simulate real API dispatch latency
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSendingForm(false);
    setContactSubmitted(true);
    
    if (onContactSubmitted) {
      onContactSubmitted(contactForm);
    }
  };

  const handleResetContact = () => {
    setContactForm({ name: '', email: '', subject: '', message: '' });
    setContactSubmitted(false);
  };

  // 1. HOME VIEW 
  if (activeSection === 'home') {
    return (
      <div id="section-home" className="space-y-20 pb-20">
        {/* Modern Immersive Hero Section */}
        <section className="relative px-6 pt-16 pb-20 text-center lg:pt-24 lg:pb-28">
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
            <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-500 to-indigo-700 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72rem]" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-150/80 dark:bg-indigo-950/45 dark:text-indigo-300 dark:border-indigo-900/50 mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span>Full-Fidelity Pixel Preservation Technologies</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white leading-tight font-sans"
            >
              AI-Powered PDF Editing <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-505 to-indigo-750 bg-clip-text text-transparent dark:from-indigo-400 dark:to-indigo-300">
                That Feels Like Magic
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg leading-relaxed text-slate-500 max-w-2xl mx-auto dark:text-slate-400"
            >
              No visible text boxes. No design headaches. Modify text sequences directly over exact character base coordinates inside your browser with perfect document canvas fidelity.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {isLoggedIn ? (
                <button
                  id="hero-go-editor"
                  onClick={onNavigateToEditor}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-750 text-white font-bold text-xs uppercase tracking-widest py-4 px-8 shadow-lg shadow-indigo-600/20 hover:scale-102 hover:shadow-indigo-600/30 transition-all cursor-pointer gap-2"
                >
                  <span>Go to Document Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  id="hero-start-auth"
                  onClick={onTriggerAuth}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-505 active:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest py-4 px-8 shadow-lg shadow-indigo-600/20 hover:scale-102 hover:shadow-indigo-605/30 transition-all cursor-pointer gap-2"
                >
                  <span>Start Editing Documents Free</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              
              <a
                href="#how-it-works-bento"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-widest py-4 px-8 transition-colors cursor-pointer"
              >
                Learn Technology
              </a>
            </motion.div>
          </div>

          {/* Interactive Core Mockup */}
          <div className="mt-16 sm:mt-20 max-w-5xl mx-auto px-4 select-none">
            <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-2xl overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-5 sm:p-8 flex flex-col md:flex-row gap-6">
                
                {/* Left Panel of Mockup: Text coordinate list */}
                <div className="w-full md:w-1/3 border border-slate-150 bg-white dark:bg-slate-950 dark:border-slate-805/85 rounded-xl p-4 flex flex-col text-left">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">CHARACTER BOUNDS</div>
                  <div className="space-y-2">
                    <div className="p-2 border border-slate-100 bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
                      <span className="text-indigo-600 font-bold dark:text-indigo-400">text_coord_1</span>
                      <span className="text-slate-400">[x: 104, y: 712]</span>
                    </div>
                    <div className="p-2 border border-indigo-200 bg-indigo-50/25 dark:bg-indigo-950/20 dark:border-indigo-900 rounded-lg flex items-center justify-between text-xs font-mono">
                      <span className="text-indigo-600 font-bold dark:text-indigo-400">active_cursor</span>
                      <span className="text-slate-400">[x: 345, y: 552]</span>
                    </div>
                    <div className="p-2 border border-slate-100 bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
                      <span className="text-indigo-600 font-bold dark:text-indigo-400">text_coord_5</span>
                      <span className="text-slate-400">[x: 232, y: 480]</span>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Page Editor canvas simulation */}
                <div className="flex-1 text-left flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md dark:bg-indigo-950/50 dark:text-indigo-400">LIVE PREVIEW CANVAS</span>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-2">Document Layout Specification</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Simulated local coordinate editing workspace</p>
                  </div>
                  
                  <div className="my-6 p-4 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/10 dark:border-indigo-800 dark:bg-indigo-950/10 relative">
                    <span className="absolute -top-2.5 left-3 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 rounded-md dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">Dynamic edit segment</span>
                    <p className="text-sm font-medium text-slate-700 leading-normal dark:text-slate-300">
                      We offer next generation vector baseline <span className="bg-indigo-100/70 dark:bg-indigo-900/50 px-1 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-250 border-dashed animate-pulse">In-Place Character Editing</span> techniques ensuring full alignment.
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-slate-200 dark:border-slate-800/80 pt-4">
                    <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-emerald-500" />
                      Client Sandbox Active
                    </span>
                    <span className="text-indigo-600 font-bold hover:underline cursor-pointer dark:text-indigo-400">View Page Metrics &rarr;</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Feature Bento Grid Section */}
        <section id="how-it-works-bento" className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Engineered with High-Precision Features
            </h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Every detail is tailored to protect original layouts while allowing seamless updates.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-6 sm:mt-16 lg:max-w-none lg:grid-cols-3">
            {/* Box 1 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mb-6">
                  <Layers className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Coordinate Preservation</h3>
                <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  We locate baseline vectors down to fractions of a pixel. Changes automatically re-align bounding coordinates keeping alignments true.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Maintains format integrity
              </div>
            </div>

            {/* Box 2 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mb-6">
                  <Shield className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Absolute Privacy Sandbox</h3>
                <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Your files are compiled locally inside your sandboxed browser memory. Data elements do not leak to external scraping engines.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                100% Secure & Compliant
              </div>
            </div>

            {/* Box 3 */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 mb-6">
                  <Sparkles className="h-5.5 w-5.5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Universal Format Pipeline</h3>
                <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Upload Word Files (.docx), Text Files (.txt, .md), and structured assets—our engine handles baseline matrix assembly instantly.
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Automatic Wasm Conversion
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic FAQ / Interactive Section */}
        <section className="mx-auto max-w-4xl px-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-sans text-center mb-8">Frequently Answered Tech Questions</h2>
            
            <div className="space-y-4">
              {[
                {
                  q: "Does this OCR scan the layout or edit text natively?",
                  a: "Our engine targets text structures at standard page layout levels. If your font formats contain vector text layers, you can click directly on the baseline to replace character tokens natively, allowing beautiful high-fidelity rendering."
                },
                {
                  q: "What backend systems compile the downloadable PDF?",
                  a: "The final PDF compilation is completed inside your browser. We instantiate official PDF-Lib libraries natively with high security. Any change updates standard character indexes flawlessly."
                },
                {
                  q: "Can I use standard Google Login credentials?",
                  a: "Yes! Simply trigger 'Continue with Google' inside the sign-in section. If your browser environment is previewing, sandbox bypass handles instant testing effortlessly."
                }
              ].map((faq, idx) => (
                <div 
                  key={idx} 
                  className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 overflow-hidden"
                >
                  <button
                    onClick={() => setActiveFAQ(activeFAQ === idx ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between text-sm font-bold text-slate-800 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono text-base font-extrabold pr-1">
                      {activeFAQ === idx ? '−' : '+'}
                    </span>
                  </button>
                  {activeFAQ === idx && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // 2. SERVICES VIEW
  if (activeSection === 'services') {
    return (
      <div id="section-services" className="space-y-16 pb-20 px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto py-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 mb-4 border border-indigo-120 dark:bg-indigo-950/45 dark:text-indigo-300 dark:border-indigo-900/50">
            <Layers className="h-4 w-4" />
            Workspace Capabilities
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Comprehensive Document Services
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            High-fidelity vector character positioning engines combined with local security controls.
          </p>
        </div>

        {/* List of services with beautiful icons */}
        <div className="grid gap-8 md:grid-cols-2">
          
          <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/45 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">In-Place Character Editing</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Target individual lines, sentences, or word groupings on specific page coordinate points. Modify text in real-time while matching existing typography and fonts exactly.
            </p>
            <ul className="mt-5 space-y-2 text-xs text-slate-650 dark:text-slate-350">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Baseline alignment locked down to 1/72nd of an inch</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Automated kerning configuration and font index reading</li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/45 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Multi-Format Support Pipeline</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              No PDF on hand? Our background WASM processor converts docx, plain txt, Markdown files, or layouts into editable workspaces instantly.
            </p>
            <ul className="mt-5 space-y-2 text-xs text-slate-650 dark:text-slate-350">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Seamless conversion of standard Word Docx tables</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Fast text extraction and automatic padding preservation</li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/45 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sovereign Data Storage</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              We employ structured client-side storage structures. Users can segment workspaces and isolate files with private keys stored securely to guarantee local isolation.
            </p>
            <ul className="mt-5 space-y-2 text-xs text-slate-650 dark:text-slate-350">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Private profile segments matching standard encryption</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> No server uploads required—absolute data sovereignty</li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow">
            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/45 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Adaptive Design Refinement</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Reconstruct standard template variables effortlessly. Modify page ranges, margins, and character positions without changing original layout settings.
            </p>
            <ul className="mt-5 space-y-2 text-xs text-slate-650 dark:text-slate-350">
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Drag-and-drop file re-arrangement canvas modules</li>
              <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Rapid PDF layout downloads directly to key directories</li>
            </ul>
          </div>

        </div>

        {/* Pricing tier cards */}
        <div className="pt-8">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-8">Access Tiers</h2>
          <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
            
            {/* Free tier */}
            <div className="p-8 rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">INDIVIDUAL SANDBOX</span>
                <h4 className="text-xl font-bold text-slate-850 dark:text-white mt-1">Free Sandbox</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">Ideal for standard localized tasks and quick coordinate updates.</p>
                
                <div className="my-6">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">$0</span>
                  <span className="text-slate-400 text-xs"> / forever</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0" /> Up to 5 document uploads per day</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0" /> Core coordinate-locked character updates</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0" /> Web-native local parsing sandbox</li>
                </ul>
              </div>

              <div className="mt-8">
                {isLoggedIn ? (
                  <button 
                    onClick={onNavigateToEditor}
                    className="w-full text-center py-3 rounded-xl border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold transition-all cursor-pointer text-slate-800 dark:text-slate-200"
                  >
                    Go to Workspace Dashboard
                  </button>
                ) : (
                  <button 
                    onClick={onTriggerAuth}
                    className="w-full text-center py-3 rounded-xl border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold transition-all cursor-pointer text-slate-800 dark:text-slate-200"
                  >
                    Access Workspace Free
                  </button>
                )}
              </div>
            </div>

            {/* Premium tier */}
            <div className="p-8 rounded-3xl border-2 border-indigo-505 bg-white dark:border-indigo-600 dark:bg-slate-950 flex flex-col justify-between shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-605 text-white text-[9px] uppercase font-bold px-3.5 py-1 rounded-bl-xl tracking-widest">
                POPULAR
              </div>
              
              <div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">ENTERPRISE SYSTEM</span>
                <h4 className="text-xl font-bold text-slate-850 dark:text-white mt-1">Creator Suite</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">For professional publishers needing maximum baseline preservation.</p>
                
                <div className="my-6">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">$12</span>
                  <span className="text-slate-400 text-xs"> / user / month</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-650 dark:text-slate-300">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0 font-bold" /> Unlimited daily document revisions</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0 font-bold" /> Batch format conversion pipeline</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0 font-bold" /> Advanced OCR & Layout alignment tools</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-indigo-600 shrink-0 font-bold" /> Encrypted backup cloud persistence</li>
                </ul>
              </div>

              <div className="mt-8">
                <button 
                  onClick={onTriggerAuth}
                  className="w-full text-center py-3.5 rounded-xl bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold transition-all cursor-pointer shadow-indigo-100 shadow-md uppercase tracking-wider"
                >
                  Unblock Creator Suite
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // 3. ABOUT VIEW
  if (activeSection === 'about') {
    return (
      <div id="section-about" className="space-y-16 pb-20 px-6 max-w-4xl mx-auto">
        <div className="text-center py-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 mb-4 border border-indigo-120 dark:bg-indigo-950/45 dark:text-indigo-300 dark:border-indigo-900/50">
            <Info className="h-4 w-4" />
            Our Technology Journey
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Pioneering Page Baseline Preservation
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            AI-Powered Universal PDF Editor was founded with a singular, hyper-focused technical mission: to let users modify standard document vectors dynamically in-place without ruining layouts.
          </p>
        </div>

        {/* Content Section: Technology and Story */}
        <div className="grid gap-12 md:grid-cols-2 items-center">
          <div className="space-y-5 text-left text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-sans">The Core Structural Challenge</h3>
            <p>
              Standard document builders output compressed, flat character strings with fixed vertical coordinates. When you try to modify text, original spacing calculations split apart. This results in standard layout shifts that completely break presentation look.
            </p>
            <p>
              By leveraging dynamic <strong className="text-slate-800 dark:text-white">Web Assembly parsing layers</strong> and reading exact metrics in real-time, our system isolates individual letters and modifies font metrics natively. This protects columns, paragraphs, and formats cleanly.
            </p>
            <div className="p-4 bg-indigo-50/50 border border-indigo-150/80 rounded-2xl dark:bg-indigo-950/20 dark:border-indigo-900/40 text-xs">
              <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-1">Our Core Mandates:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li>Local sovereign processing for absolute data security.</li>
                <li>Preserve original vector positions under all layout shifts.</li>
                <li>Transparent metrics reading without cloud telemetry storage.</li>
              </ul>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col justify-between h-80 text-left">
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">ENGINEERING TIMELINE</span>
              
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="font-mono text-xs font-extrabold text-indigo-650 dark:text-indigo-400 shrink-0">v1.2.0</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Initial client PDF-Lib character rewriting release.</p>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-xs font-extrabold text-indigo-650 dark:text-indigo-400 shrink-0">v2.0.0</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Conversion integration for docx and plain assets.</p>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-xs font-extrabold text-indigo-650 dark:text-indigo-400 shrink-0">v2.4.0</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold text-slate-700 dark:text-slate-300">Live coordinates adjustment sandbox view.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-4 flex items-center justify-between font-mono text-[9px] text-slate-400">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-emerald-500" /> 100% Up-time Standard</span>
              <span>San Jose, CA HQ</span>
            </div>
          </div>
        </div>

        {/* Highlight Stats Block */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-center">
          <div className="p-5 border border-slate-150/80 bg-white dark:border-slate-850 dark:bg-slate-900 rounded-2xl">
            <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">1.2ms</h4>
            <p className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500 mt-1">Average Parsing Delay</p>
          </div>
          <div className="p-5 border border-slate-150/80 bg-white dark:border-slate-850 dark:bg-slate-900 rounded-2xl">
            <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">100%</h4>
            <p className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500 mt-1">Local Sandbox Privacy</p>
          </div>
          <div className="p-5 border border-slate-150/80 bg-white dark:border-slate-850 dark:bg-slate-900 rounded-2xl">
            <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">92,000+</h4>
            <p className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500 mt-1">Baselines Rendered</p>
          </div>
          <div className="p-5 border border-slate-150/80 bg-white dark:border-slate-850 dark:bg-slate-900 rounded-2xl">
            <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">15+</h4>
            <p className="text-[10px] uppercase font-bold text-slate-450 dark:text-slate-500 mt-1">File Formats Supported</p>
          </div>
        </div>
      </div>
    );
  }

  // 4. CONTACT VIEW (Interactive Contact Form)
  return (
    <div id="section-contact" className="space-y-12 pb-20 px-6 max-w-5xl mx-auto">
      <div className="text-center py-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 mb-4 border border-indigo-120 dark:bg-indigo-950/45 dark:text-indigo-300 dark:border-indigo-900/50">
          <Mail className="h-4 w-4" />
          Connect with Developers
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Contact Our Systems Office
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Have an intricate enterprise document layout requirement? Leave a message below, and our coordination team will reach out.
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-12 items-start">
        {/* Contact Info Panel column */}
        <div className="md:col-span-4 space-y-6 text-left">
          
          <div className="p-6 rounded-2xl border border-slate-150 dark:border-slate-805 bg-white dark:bg-slate-900">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Direct Touchpoints</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 block leading-tight">Systems Email</span>
                  <a href="mailto:ankushpatil.2408@gmail.com" className="text-xs font-semibold text-slate-750 dark:text-slate-200 hover:underline hover:text-indigo-605">ankushpatil.2408@gmail.com</a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 block leading-tight">Technical Office</span>
                  <a href="tel:8010502385" className="text-xs font-semibold text-slate-750 dark:text-slate-200 hover:underline">8010502385</a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                  <Building className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 block leading-tight">Office Headquarters</span>
                  <span className="text-xs font-semibold text-slate-750 dark:text-slate-200 block">Raver, maharashtra 425508</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <h4 className="font-bold text-slate-750 dark:text-slate-300">Enterprise SLAs</h4>
            <p className="leading-relaxed">
              Paying Creator Suite users are backed by guaranteed 4-hour response SLAs. Our team is available from 09:00 to 18:00 PST.
            </p>
          </div>

        </div>

        {/* Action Form column */}
        <div className="md:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {!contactSubmitted ? (
              <motion.form 
                key="contact-form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleContactSubmit} 
                className="space-y-4 text-left"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Full Name</label>
                    <input 
                      type="text" 
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Email Address</label>
                    <input 
                      type="email" 
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="jane@company.com"
                      className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-505 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Subject Inquiry</label>
                  <input 
                    type="text" 
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    placeholder="e.g. Creator Suite coordinate alignment limit questions"
                    className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-505 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Detailed Message</label>
                  <textarea 
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    rows={4}
                    placeholder="State your unique requirements, coordinate bounds size, or browser configuration here..."
                    className="w-full text-xs px-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-505 focus:outline-none transition-colors"
                    required
                  ></textarea>
                </div>

                <button
                  id="submit-contact"
                  type="submit"
                  disabled={sendingForm}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-md transition-all cursor-pointer uppercase tracking-wider flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {sendingForm ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      <span>Transmitting Inquiry...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Dispatch Inquiry Form</span>
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.div 
                key="contact-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-4"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-2">
                  <CheckCircle className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="text-lg font-black text-slate-850 dark:text-white">Inquiry Successfully Positioned</h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Hello, <strong className="text-slate-705 dark:text-slate-205">{contactForm.name}</strong>. Your inquiry was securely transmitted. We will reply to <span className="font-mono bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-bold">{contactForm.email}</span> within a few hours.
                </p>
                <button
                  onClick={handleResetContact}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
                >
                  Configure new contact ticket
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
