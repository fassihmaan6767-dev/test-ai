'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  LogOut, 
  Database, 
  MessageSquare, 
  CheckCircle2, 
  Bold, 
  Italic, 
  List, 
  Code, 
  Heading1, 
  Link as LinkIcon, 
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Zap,
  Key
} from 'lucide-react';
import Link from 'next/link';
import { 
  auth, 
  googleProvider, 
  subscribeToQueries, 
  addQueryDoc, 
  updateQueryDoc, 
  deleteQueryDoc, 
  subscribeToChatLogs,
  QueryItem, 
  ChatLogItem 
} from '@/lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queries' | 'chats' | 'settings'>('queries');
  
  // Auth form states
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Queries Data
  const [queries, setQueries] = useState<QueryItem[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTopic, setFormTopic] = useState('');
  const [formUserQuery, setFormUserQuery] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formButtonName, setFormButtonName] = useState('');
  const [formButtonLink, setFormButtonLink] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const answerTextareaRef = useRef<HTMLTextAreaElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubQueries = subscribeToQueries((items) => {
      setQueries(items);
    });
    const unsubLogs = subscribeToChatLogs((logs) => {
      setChatLogs(logs);
    });
    return () => {
      unsubQueries();
      unsubLogs();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthSubmitting(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email !== 'talkwithfasih@gmail.com') {
        await signOut(auth);
        setAuthError('Access Denied: Only Admin (talkwithfasih@gmail.com) can log in.');
      } else {
        showToast('Logged in with Google successfully');
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Google Sign-in failed. Ensure Google is enabled in Firebase Console.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    if (email.toLowerCase() !== 'talkwithfasih@gmail.com') {
      setAuthError('Access Denied: Only Admin (talkwithfasih@gmail.com) can register or log in.');
      return;
    }
    
    setAuthSubmitting(true);

    try {
      if (authMode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast('Account created successfully');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Welcome back to Admin Portal');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setAuthError('User not found. Switch to "Create Account" if first time.');
      } else {
        setAuthError(err.message || 'Authentication failed');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setAuthError('Please enter your email address first to reset password.');
      return;
    }
    if (email.toLowerCase() !== 'talkwithfasih@gmail.com') {
      setAuthError('Password reset is only available for the Admin email.');
      return;
    }
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      showToast('Password reset email sent to ' + email);
      setAuthError('');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Failed to send password reset email.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    showToast('Signed out');
  };

  const applyFormatting = (tag: 'bold' | 'italic' | 'bullet' | 'code' | 'heading') => {
    const textarea = answerTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formAnswer.substring(start, end);
    let replacement = '';

    switch (tag) {
      case 'bold':
        replacement = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selectedText || 'italic text'}*`;
        break;
      case 'bullet':
        replacement = `\n• ${selectedText || 'List item'}`;
        break;
      case 'code':
        replacement = `\`${selectedText || 'code'}\``;
        break;
      case 'heading':
        replacement = `\n### ${selectedText || 'Heading'}\n`;
        break;
    }

    const newText = formAnswer.substring(0, start) + replacement + formAnswer.substring(end);
    setFormAnswer(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  const openNewQueryModal = () => {
    setEditingId(null);
    setFormTopic('');
    setFormUserQuery('');
    setFormAnswer('');
    setFormButtonName('');
    setFormButtonLink('');
    setIsModalOpen(true);
  };

  const openEditQueryModal = (item: QueryItem) => {
    setEditingId(item.id || null);
    setFormTopic(item.topic);
    setFormUserQuery(item.userQuery);
    setFormAnswer(item.answer);
    setFormButtonName(item.buttonName || '');
    setFormButtonLink(item.buttonLink || '');
    setIsModalOpen(true);
  };

  const handleSaveQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTopic.trim() || !formUserQuery.trim() || !formAnswer.trim()) {
      alert('Topic, User Query, and Answer are required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        topic: formTopic.trim(),
        userQuery: formUserQuery.trim(),
        answer: formAnswer.trim(),
        buttonName: formButtonName.trim() || undefined,
        buttonLink: formButtonLink.trim() || undefined,
      };

      if (editingId) {
        await updateQueryDoc(editingId, payload);
        showToast('Query updated in Firestore');
      } else {
        await addQueryDoc(payload);
        showToast('New Query added in Firestore');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('Error saving query: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteQuery = async (id?: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this query?')) return;

    try {
      await deleteQueryDoc(id);
      showToast('Query deleted');
    } catch (err: any) {
      console.error(err);
      alert('Error deleting query: ' + err.message);
    }
  };

  const filteredQueries = queries.filter((q) => {
    const s = searchQuery.toLowerCase();
    return (
      q.topic?.toLowerCase().includes(s) ||
      q.userQuery?.toLowerCase().includes(s) ||
      q.answer?.toLowerCase().includes(s)
    );
  });

  const renderFormattedPreview = (text: string) => {
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-[#e2d7c9] px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/• (.*)/g, '<li class="ml-4 list-disc">$1</li>');

    return (
      <div 
        className="font-serif text-sm leading-relaxed text-[#2C2621]"
        dangerouslySetInnerHTML={{ __html: formatted }}
      />
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f3eee7] flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 text-[#1A1A1A]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#8C7B6C]" />
          <span className="text-sm font-medium">Connecting to Firebase & Security Layer...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f3eee7] flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#e4d8c9] rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#ded1c0] rounded-full blur-3xl opacity-50" />

        <Link 
          href="/"
          className="absolute top-8 left-8 flex items-center gap-2 text-xs uppercase tracking-widest text-[#6B5E52] hover:text-[#1A1A1A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Website
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#faf7f2] border border-[#e2d5c3] shadow-xl rounded-2xl p-8 z-10"
        >
          <div className="flex items-center justify-center w-12 h-12 bg-[#ebe1d3] rounded-full mx-auto mb-4 text-[#4A3E33]">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <div className="text-center mb-6">
            <h1 className="font-serif text-2xl font-normal text-[#1A1A1A]">Admin Control Center</h1>
            <p className="text-xs text-[#6B5E52] mt-1">Manage AI knowledge base, queries & button links</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg leading-relaxed">
              {authError}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={authSubmitting}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-neutral-50 text-[#1A1A1A] border border-[#d6c7b4] rounded-xl text-sm font-medium transition-all shadow-sm mb-4 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continue with Google Account
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-[#dfd2c0] w-full" />
            <span className="bg-[#faf7f2] px-3 text-[11px] uppercase tracking-wider text-[#8A7C6E] shrink-0">or with email</span>
            <div className="border-t border-[#dfd2c0] w-full" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#4A3E33] mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="talkwithfasih@gmail.com"
                className="w-full px-3.5 py-2.5 bg-white border border-[#d6c7b4] rounded-xl text-sm outline-none focus:border-[#4A3E33] text-[#1A1A1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4A3E33] mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-white border border-[#d6c7b4] rounded-xl text-sm outline-none focus:border-[#4A3E33] text-[#1A1A1A]"
              />
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3 bg-[#241E1A] hover:bg-[#3D332D] text-white rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 mt-2 shadow-sm"
            >
              {authSubmitting ? 'Authenticating...' : authMode === 'signup' ? 'Create Admin Account' : 'Sign In to Dashboard'}
            </button>

            {authMode === 'login' && (
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-[#6B5E52] hover:text-[#1A1A1A] underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </form>

          <div className="mt-4 text-center border-t border-[#dfd2c0] pt-4">
            {authMode === 'login' ? (
              <button 
                onClick={() => setAuthMode('signup')}
                className="text-xs text-[#6B5E52] hover:text-[#1A1A1A] underline cursor-pointer"
              >
                First time? Create Admin Account
              </button>
            ) : (
              <button 
                onClick={() => setAuthMode('login')}
                className="text-xs text-[#6B5E52] hover:text-[#1A1A1A] underline cursor-pointer"
              >
                Already have an account? Sign In
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4eee6] text-[#1A1A1A] font-sans pb-24">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-[#241E1A] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 bg-[#faf7f2]/90 backdrop-blur-md border-b border-[#e2d5c3] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-1.5 text-xs text-[#6B5E52] hover:text-[#1A1A1A] transition-colors pr-3 border-r border-[#dfd2c0]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> View Site
            </Link>
            <div>
              <h1 className="font-serif text-lg font-medium text-[#1A1A1A] flex items-center gap-2">
                AI Knowledge Hub <span className="text-[10px] uppercase font-sans tracking-widest bg-[#ebe0d1] text-[#5A4D40] px-2 py-0.5 rounded-full">Admin</span>
              </h1>
              <p className="text-[11px] text-[#7A6C5E] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Firebase: <code className="font-mono">mypotfolio-c060d</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-[#1A1A1A]">{user.displayName || user.email}</p>
              <p className="text-[10px] text-[#7A6C5E]">Verified Admin</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-[#ede3d5] rounded-lg text-[#6B5E52] hover:text-[#1A1A1A] transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex items-center justify-between mb-8 border-b border-[#ded1c0] pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('queries')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'queries'
                  ? 'bg-[#241E1A] text-white shadow-sm'
                  : 'text-[#6B5E52] hover:bg-[#eae0d2]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Queries & Triggers ({queries.length})
            </button>
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'chats'
                  ? 'bg-[#241E1A] text-white shadow-sm'
                  : 'text-[#6B5E52] hover:bg-[#eae0d2]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Live Chat Stream ({chatLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#241E1A] text-white shadow-sm'
                  : 'text-[#6B5E52] hover:bg-[#eae0d2]'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              Groq & Vercel Keys
            </button>
          </div>

          {activeTab === 'queries' && (
            <button
              onClick={openNewQueryModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#241E1A] hover:bg-[#3D332D] text-white rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Query
            </button>
          )}
        </div>

        {activeTab === 'queries' && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A7B6E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queries by topic, user query, or answer content..."
                className="w-full pl-10 pr-4 py-3 bg-[#faf7f2] border border-[#d6c7b4] rounded-xl text-sm outline-none focus:border-[#4A3E33] placeholder-[#9A8B7E]"
              />
            </div>

            {filteredQueries.length === 0 ? (
              <div className="bg-[#faf7f2] border border-dashed border-[#d6c7b4] rounded-2xl p-12 text-center">
                <Database className="w-8 h-8 text-[#9A8B7E] mx-auto mb-3" />
                <h3 className="font-serif text-lg text-[#1A1A1A]">No Queries Found</h3>
                <p className="text-xs text-[#7A6C5E] mt-1 max-w-sm mx-auto">
                  Add your first query so the AI can automatically return tailored answers and custom clickable buttons.
                </p>
                <button
                  onClick={openNewQueryModal}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#241E1A] text-white rounded-xl text-xs font-medium cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Create First Query
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredQueries.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#faf7f2] border border-[#e2d5c3] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] uppercase tracking-wider font-semibold bg-[#ebe0d1] text-[#4A3E33] px-2.5 py-1 rounded-md">
                          {item.topic}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditQueryModal(item)}
                            className="p-1.5 text-[#6B5E52] hover:text-[#1A1A1A] hover:bg-[#ebe0d1] rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuery(item.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-medium text-[#1A1A1A] mb-2 flex items-start gap-1.5">
                        <span className="text-[#8A7B6E] font-normal">Trigger:</span> &ldquo;{item.userQuery}&rdquo;
                      </h4>

                      <div className="bg-[#f2ece2] p-3 rounded-xl mb-3">
                        {renderFormattedPreview(item.answer)}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#ede3d5] flex items-center justify-between text-[11px] text-[#7A6C5E]">
                      {item.buttonName && item.buttonLink ? (
                        <span className="flex items-center gap-1 text-[#241E1A] font-medium bg-[#e4d8c7] px-2 py-0.5 rounded-full truncate max-w-[200px]">
                          <LinkIcon className="w-3 h-3 text-[#5A4D40]" /> {item.buttonName}
                        </span>
                      ) : (
                        <span className="text-[#9A8B7E]">No action button</span>
                      )}
                      <span>
                        {item.updatedAt?.toDate ? item.updatedAt.toDate().toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#7A6C5E]">
                Real-time visitor questions and answers logged directly from your website.
              </p>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" /> Realtime Sync Active
              </span>
            </div>

            {chatLogs.length === 0 ? (
              <div className="bg-[#faf7f2] border border-[#d6c7b4] rounded-2xl p-12 text-center">
                <MessageSquare className="w-8 h-8 text-[#9A8B7E] mx-auto mb-2" />
                <p className="text-sm text-[#1A1A1A]">No visitor messages logged yet</p>
                <p className="text-xs text-[#7A6C5E] mt-1">Try chatting on the main website to see live entries appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatLogs.map((log) => (
                  <div key={log.id} className="bg-[#faf7f2] border border-[#e2d5c3] rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#1A1A1A]">User Inquiry</span>
                      <span className="text-[10px] text-[#8A7B6E] uppercase tracking-wider bg-[#ebe0d1] px-2 py-0.5 rounded">
                        Source: {log.source || 'ai'}
                      </span>
                    </div>
                    <p className="text-sm text-[#2C2621] font-medium mb-3">&ldquo;{log.userMessage}&rdquo;</p>
                    
                    <div className="bg-[#f0e9df] p-3 rounded-lg text-xs leading-relaxed text-[#38302A] font-serif">
                      <span className="font-sans font-bold text-[10px] uppercase tracking-wider block text-[#7A6C5E] mb-1">AI Response</span>
                      {log.aiResponse}
                    </div>

                    {log.buttonName && (
                      <div className="mt-2 text-right">
                        <span className="text-[11px] text-[#4A3E33] bg-[#e2d5c3] px-2 py-0.5 rounded">
                          Button rendered: {log.buttonName} ({log.buttonLink})
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-[#faf7f2] border border-[#e2d5c3] rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="font-serif text-lg font-medium text-[#1A1A1A] flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" /> Groq API & Deployment Configuration
              </h3>
              <p className="text-xs text-[#7A6C5E] mt-1">
                Your application is configured with dual intelligence: Groq Llama-3.3 70B & Gemini Flash Fallback.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-[#f3ede4] p-4 rounded-xl space-y-2 border border-[#ded1c0]">
                <h4 className="font-semibold text-sm text-[#1A1A1A]">1. How to add your Groq API Key</h4>
                <p className="text-[#6B5E52] leading-relaxed">
                  Go to <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline font-semibold text-[#1A1A1A]">console.groq.com/keys</a>, generate an API Key (starts with <code className="font-mono bg-white px-1 py-0.5 rounded">gsk_...</code>), and place it in your Vercel / Environment settings as:
                </p>
                <div className="bg-[#241E1A] text-emerald-300 p-3 rounded-lg font-mono text-[11px]">
                  GROQ_API_KEY=gsk_your_actual_key_here
                </div>
              </div>

              <div className="bg-[#f3ede4] p-4 rounded-xl space-y-2 border border-[#ded1c0]">
                <h4 className="font-semibold text-sm text-[#1A1A1A]">2. Firebase Firestore Real-Time Rules</h4>
                <p className="text-[#6B5E52] leading-relaxed">
                  In your Firebase Console, ensure your Firestore Rules allow reads from visitors and writes from your admin account:
                </p>
                <pre className="bg-[#241E1A] text-neutral-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /queries/{queryId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /chat_logs/{logId} {
      allow read, write: if true;
    }
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-[#faf7f2] border border-[#d6c7b4] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-[#e2d5c3] flex items-center justify-between bg-[#f4eee6]">
                <h3 className="font-serif text-lg text-[#1A1A1A]">
                  {editingId ? 'Edit Knowledge Query' : 'Add New Knowledge Query'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs text-[#7A6C5E] hover:text-[#1A1A1A] px-2 py-1 rounded-md"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveQuery} className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#4A3E33] mb-1">Topic / Category</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Services, Pricing, Tech Stack, About"
                      value={formTopic}
                      onChange={(e) => setFormTopic(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#d6c7b4] rounded-xl text-sm outline-none focus:border-[#4A3E33]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#4A3E33] mb-1">User Query / Trigger Prompt</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. What are your pricing plans?"
                      value={formUserQuery}
                      onChange={(e) => setFormUserQuery(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#d6c7b4] rounded-xl text-sm outline-none focus:border-[#4A3E33]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#4A3E33]">
                      Answer (AI Output)
                    </label>
                    
                    <div className="flex items-center gap-1 bg-[#ede3d5] p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => applyFormatting('bold')}
                        className="p-1 hover:bg-white rounded text-[#4A3E33] cursor-pointer"
                        title="Bold (**text**)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('italic')}
                        className="p-1 hover:bg-white rounded text-[#4A3E33] cursor-pointer"
                        title="Italic (*text*)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('bullet')}
                        className="p-1 hover:bg-white rounded text-[#4A3E33] cursor-pointer"
                        title="Bullet List"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('code')}
                        className="p-1 hover:bg-white rounded text-[#4A3E33] cursor-pointer"
                        title="Code snippet"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormatting('heading')}
                        className="p-1 hover:bg-white rounded text-[#4A3E33] cursor-pointer"
                        title="Heading"
                      >
                        <Heading1 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={answerTextareaRef}
                    required
                    rows={4}
                    placeholder="Write the exact response for this inquiry. You can use markdown like **bold**, *italic*, or bullet points."
                    value={formAnswer}
                    onChange={(e) => setFormAnswer(e.target.value)}
                    className="w-full p-3.5 bg-white border border-[#d6c7b4] rounded-xl text-sm outline-none focus:border-[#4A3E33] font-serif leading-relaxed"
                  />

                  {formAnswer && (
                    <div className="mt-2 p-3 bg-[#f2ece2] rounded-xl border border-[#e4d8c7]">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8A7B6E] block mb-1">
                        Live Visual Preview:
                      </span>
                      {renderFormattedPreview(formAnswer)}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-[#f2ece2] rounded-xl border border-[#ded1c0] space-y-3">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-[#5A4D40]" />
                    <span className="text-xs font-semibold text-[#1A1A1A]">Optional Interactive Button</span>
                    <span className="text-[10px] text-[#8A7B6E]">(Renders clickable CTA in Chat UI)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#4A3E33] mb-1">Button Text</label>
                      <input
                        type="text"
                        placeholder="e.g. Schedule Call / View GitHub"
                        value={formButtonName}
                        onChange={(e) => setFormButtonName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#d6c7b4] rounded-lg text-xs outline-none focus:border-[#4A3E33]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#4A3E33] mb-1">Button Link (URL)</label>
                      <input
                        type="url"
                        placeholder="https://cal.com/your-username"
                        value={formButtonLink}
                        onChange={(e) => setFormButtonLink(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#d6c7b4] rounded-lg text-xs outline-none focus:border-[#4A3E33]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#e2d5c3] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs text-[#6B5E52] hover:bg-[#ede3d5] rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-5 py-2.5 bg-[#241E1A] hover:bg-[#3D332D] text-white text-xs font-medium rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {formSubmitting ? 'Saving to Database...' : editingId ? 'Update Query' : 'Save Query to Firestore'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
