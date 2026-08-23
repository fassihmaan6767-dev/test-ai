'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X, ExternalLink, Shield } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Lenis from 'lenis';
import { subscribeToQueries, saveChatLog, QueryItem } from '@/lib/firebase';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  buttonName?: string | null;
  buttonLink?: string | null;
}

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Lenis smooth scrolling setup
  useEffect(() => {
    const lenis = new Lenis();
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  // Listen to Firestore queries in real time
  useEffect(() => {
    const unsub = subscribeToQueries((items) => {
      setQueries(items);
    });
    return () => unsub();
  }, []);

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    
    const userText = prompt.trim();
    setPrompt('');
    
    if (!isChatOpen) setIsChatOpen(true);
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
    setIsLoading(true);

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
    
    // Check if query directly matches any Firestore database item
    const matched = queries.find(q => {
      if (!q.userQuery) return false;
      const qLower = q.userQuery.toLowerCase();
      const uLower = userText.toLowerCase();
      return uLower.includes(qLower) || qLower.includes(uLower);
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: userText,
          matchedQuery: matched || null,
          dbContext: queries
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const replyText = data.text || "I am here to craft intelligent digital experiences for your project. What would you like to create next?";
      const replyButtonName = data.buttonName || (matched ? matched.buttonName : null);
      const replyButtonLink = data.buttonLink || (matched ? matched.buttonLink : null);

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: replyText,
        buttonName: replyButtonName,
        buttonLink: replyButtonLink
      }]);

      // Log conversation to Firestore in real-time
      saveChatLog({
        userMessage: userText,
        aiResponse: replyText,
        buttonName: replyButtonName || undefined,
        buttonLink: replyButtonLink || undefined,
        source: data.source || 'ai'
      });

    } catch (error) {
      console.error("Chat error:", error);
      
      // Fallback graceful message so user always gets a seamless experience
      const fallbackText = "I am ready to bring your visionary digital project to life with bespoke architecture and refined aesthetics. Let's connect and build something remarkable together.";
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: fallbackText 
      }]);

      saveChatLog({
        userMessage: userText,
        aiResponse: fallbackText,
        source: 'fallback'
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 200);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#ded4c6] text-[#1A1A1A] selection:bg-[#1A1A1A] selection:text-[#ded4c6] font-sans">
      
      {/* Discreet Admin Link */}
      <div className="fixed top-6 left-6 z-30">
        <Link 
          href="/admin" 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 hover:bg-black/40 text-white/80 hover:text-white rounded-full text-[11px] font-sans tracking-wide backdrop-blur-md transition-all opacity-40 hover:opacity-100 cursor-pointer"
          title="Admin Knowledge Hub"
        >
          <Shield className="w-3 h-3" />
          <span>Admin</span>
        </Link>
      </div>

      <HeroSection isBlurred={isChatOpen} />

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            className="absolute top-0 left-0 w-full min-h-screen z-40 bg-[#ded4c6]"
            initial={{ opacity: 0, filter: 'blur(20px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(20px)', transition: { duration: 0.6 } }}
            transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          >
             <div className="min-h-screen pt-32 pb-48 px-6 md:px-12 max-w-screen-md mx-auto flex flex-col gap-12">
                {messages.map((msg) => (
                  msg.role === 'user' ? (
                     <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 50, filter: 'blur(16px)' }}
                        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
                        transition={{ duration: 1, ease: [0.25, 1, 0.5, 1] }}
                        className="self-end max-w-[90%]"
                     >
                        <div className="text-[#1A1A1A] font-sans text-2xl md:text-3xl tracking-wide text-right font-light">
                          {msg.text}
                        </div>
                     </motion.div>
                  ) : (
                     <motion.div
                        key={msg.id}
                        className="self-start max-w-[90%] flex flex-col gap-3"
                     >
                        {msg.text.split('\n').map((line, i) => (
                           <motion.div
                              key={i}
                              initial={{ opacity: 0, filter: 'blur(10px)', y: 15 }}
                              whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                              viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
                              transition={{ duration: 1.8, ease: [0.25, 1, 0.5, 1], delay: i * 0.25 }}
                              className="font-serif text-2xl md:text-3xl leading-snug text-[#1A1A1A] min-h-[1.5em]"
                           >
                             {line}
                           </motion.div>
                        ))}

                        {/* Interactive Database CTA Button if provided */}
                        {msg.buttonName && msg.buttonLink && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                            className="mt-4"
                          >
                            <a
                              href={msg.buttonLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] hover:bg-[#333] text-[#ded4c6] rounded-full text-sm font-sans tracking-wide transition-all shadow-md hover:shadow-lg hover:scale-105 cursor-pointer"
                            >
                              <span>{msg.buttonName}</span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </motion.div>
                        )}
                     </motion.div>
                  )
                ))}

                <AnimatePresence>
                  {isLoading && (
                    <LoadingAnimation />
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} className="h-10 w-full shrink-0" />
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            className="fixed inset-0 z-[45] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
          >
             {/* Top Fade Effect */}
             <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#ded4c6] via-[#ded4c6]/80 to-transparent pointer-events-none" />
             
             {/* Bottom Fade Effect */}
             <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-[#ded4c6] via-[#ded4c6]/80 to-transparent pointer-events-none" />

             <button 
                onClick={() => { setIsChatOpen(false); setMessages([]); setIsLoading(false); window.scrollTo(0,0); }} 
                className="absolute top-8 right-8 z-[60] p-3 rounded-full hover:bg-black/5 transition-colors text-[#1A1A1A] pointer-events-auto cursor-pointer"
             >
                <X className="w-6 h-6" strokeWidth={1.5} />
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AICommandBar 
        prompt={prompt}
        setPrompt={setPrompt}
        onSubmit={handleAISubmit}
        isHidden={isLoading}
        theme={isChatOpen ? 'light' : 'dark'}
      />
    </main>
  );
}

function HeroSection({ isBlurred }: { isBlurred: boolean }) {
  return (
    <motion.div 
      className="fixed inset-0 z-0 flex flex-col items-center justify-center bg-[#1a1a1a]"
      animate={{ 
        filter: isBlurred ? 'blur(20px)' : 'blur(0px)', 
        opacity: isBlurred ? 0.3 : 1, 
        scale: isBlurred ? 0.98 : 1 
      }}
      transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
    >
      <div className="absolute inset-0 opacity-80">
        <Image 
          src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=1920" 
          alt="Cinematic background" 
          fill 
          priority
          className="object-cover object-center"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>
      
      <div className="relative z-10 flex flex-col items-center text-center px-4 text-white mt-12 mix-blend-plus-lighter">
        <motion.h2 
          className="font-serif text-4xl md:text-5xl lg:text-[64px] font-extralight tracking-tight leading-tight mb-8 max-w-4xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
        >
          Endless Possibilities
        </motion.h2>
        <motion.p 
          className="font-sans text-[10px] tracking-[0.4em] uppercase opacity-70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
        >
          Welcome to the AI Experience<br/><br/>
          <span className="italic normal-case tracking-normal opacity-70">Crafted with intelligence</span>
        </motion.p>
      </div>
    </motion.div>
  );
}

function SmoothRevealText({ text }: { text: string }) {
  return (
    <div className="flex">
      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: index * 0.04, ease: "easeOut" }}
          style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : 'normal' }}
        >
          {char}
        </motion.span>
      ))}
    </div>
  );
}

function LoadingAnimation() {
  const [phase, setPhase] = useState(0);
  
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1500);
    const t2 = setTimeout(() => setPhase(2), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const phrases = [
    "Analyzing requirements",
    "Crafting the interface",
    "Finalizing experience"
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)', transition: { duration: 1.5, ease: "easeInOut" } }}
      className="self-center flex flex-col items-center justify-center my-12"
    >
      <div className="relative w-full max-w-[600px] lg:max-w-[700px] aspect-video mb-4 rounded-xl overflow-hidden mix-blend-multiply flex justify-center items-center">
        <video
          src="https://cdn.jsdelivr.net/gh/fassihmaan6767-dev/Lottie@main/Untitled%20design.webm"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-contain"
        />
      </div>
      <div className="h-8 relative flex items-center justify-center overflow-hidden w-full max-w-[300px]">
        <AnimatePresence mode="wait">
           <motion.div
             key={phase}
             exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
             transition={{ duration: 0.5 }}
             className="font-serif text-xl font-light text-[#1A1A1A] absolute whitespace-nowrap"
           >
             <SmoothRevealText text={phrases[Math.min(phase, phrases.length - 1)] + "..."} />
           </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function AICommandBar({ prompt, setPrompt, onSubmit, theme, isHidden }: { prompt: string, setPrompt: (v: string) => void, onSubmit: (e: React.FormEvent) => void, theme: 'light' | 'dark', isHidden: boolean }) {
  const isDark = theme === 'dark';
  
  const placeholders = [
    "I need a portfolio component...",
    "What should I build next?",
    "Suggest a layout for my website",
    "Show me the latest web trends"
  ];
  
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 2800); // Faster marquee
    return () => clearInterval(interval);
  }, [placeholders.length]);

  return (
    <motion.div 
      className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[50] flex justify-center pointer-events-none transition-all duration-700 w-[90vw]`}
      initial={{ y: 50, opacity: 0 }}
      animate={{ 
        y: isHidden ? 30 : 0, 
        opacity: isHidden ? 0 : 1, 
        scale: isHidden ? 0.95 : 1,
        maxWidth: (isFocused || prompt.trim().length > 0) ? '600px' : '320px'
      }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <form 
        onSubmit={onSubmit}
        className="pointer-events-auto relative w-full group"
      >
        <div 
          className={`flex items-center h-14 rounded-full overflow-hidden transition-all duration-500 ease-[0.25,1,0.5,1] px-4 w-full border shadow-2xl backdrop-blur-xl
            ${isDark 
              ? 'bg-black/20 border-white/20 text-white hover:bg-black/30 hover:border-white/30' 
              : 'bg-white/60 border-black/10 text-[#1A1A1A] shadow-[0_8px_32px_rgba(0,0,0,0.05)] hover:bg-white/80'}
          `}
        >
          <div className="relative flex-1 h-full mx-2 flex items-center overflow-hidden">
            <AnimatePresence mode="wait">
              {!prompt && (
                <DynamicMarquee key={placeholderIndex} text={placeholders[placeholderIndex]} isFocused={isFocused} isDark={isDark} />
              )}
            </AnimatePresence>
            <input 
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`w-full h-full bg-transparent outline-none font-sans text-sm tracking-wide z-10 ${isDark ? 'text-white' : 'text-[#1A1A1A]'}`}
            />
          </div>

          <button 
            type="submit" 
            className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full transition-all duration-500 group-hover:scale-105 cursor-pointer
              ${prompt.trim() 
                ? (isDark ? 'bg-white text-black' : 'bg-[#1A1A1A] text-white') 
                : (isDark ? 'bg-white/10 text-white/40' : 'bg-black/5 text-black/30')}`}
            disabled={!prompt.trim() || isHidden}
          >
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function DynamicMarquee({ text, isFocused, isDark }: { text: string, isFocused: boolean, isDark: boolean }) {
  const [overflow, setOverflow] = useState(0);
  const textRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current && containerRef.current) {
      const parentWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      if (textWidth > parentWidth) {
        setOverflow(textWidth - parentWidth + 24);
      } else {
        setOverflow(0);
      }
    }
  }, [text, isFocused]);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 flex items-center pointer-events-none overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)'
      }}
    >
      <motion.div
        ref={textRef}
        initial={{ opacity: 0, filter: 'blur(8px)', x: 0 }}
        animate={{ 
          opacity: [0, 0.6, 0.6, 0.6, 0],
          filter: ['blur(8px)', 'blur(0px)', 'blur(0px)', 'blur(0px)', 'blur(8px)'],
          x: (!isFocused && overflow > 0) ? [0, 0, -overflow, -overflow, 0] : 0
        }}
        exit={{ opacity: 0, filter: 'blur(8px)', x: 0 }}
        transition={{ duration: 2.8, ease: "easeInOut", times: [0, 0.15, 0.5, 0.85, 1] }}
        className={`font-sans text-sm tracking-wide whitespace-nowrap px-1 ${isDark ? 'text-white' : 'text-[#1A1A1A]'}`}
      >
        {text}
      </motion.div>
    </div>
  );
}
