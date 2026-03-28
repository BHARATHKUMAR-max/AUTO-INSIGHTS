import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Bot, User, Loader2, Sparkles, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DataChatProps {
  datasetId: string;
  profile: any;
  sample: any[];
  onSuggestChart?: (config: any) => void;
}

export default function DataChat({ datasetId, profile, sample, onSuggestChart }: DataChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, [datasetId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadChatHistory = async () => {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('dataset_id', datasetId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading chat history:', error);
    } else if (data) {
      setMessages(data.map(m => ({ role: m.role, content: m.content })));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Save user message to Supabase
      await supabase.from('chat_history').insert({
        dataset_id: datasetId,
        role: 'user',
        content: userMessage.content
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          sample,
          query: userMessage.content,
          history: messages.slice(-5) // Send last 5 messages for context
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }
      const data = await response.json();

      const assistantMessage: Message = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to Supabase
      await supabase.from('chat_history').insert({
        dataset_id: datasetId,
        role: 'assistant',
        content: assistantMessage.content
      });

    } catch (error: any) {
      console.error('Chat Error:', error);
      let errorMsg = error.message;
      if (errorMsg === 'Failed to get AI response') {
        errorMsg = 'AI Assistant is currently unavailable. Please ensure your GROQ_API_KEY is set in the Settings menu.';
      }
      toast.error('Failed to send message: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-app-card border border-app-border rounded-3xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-app-border bg-app-bg/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <Bot className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-bold text-app-text">Data Assistant</h3>
            <p className="text-xs text-app-secondary">Ask anything about your dataset</p>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-app-border"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <Sparkles className="w-12 h-12 text-emerald-500" />
            <p className="text-app-text max-w-[200px]">
              "What are the top trends?" or "Summarize this data for me."
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                msg.role === 'user' ? "bg-emerald-500" : "bg-app-border"
              )}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-emerald-500" />}
              </div>
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl text-sm",
                msg.role === 'user' 
                  ? "bg-emerald-500 text-white rounded-tr-none" 
                  : "bg-app-bg border border-app-border text-app-text rounded-tl-none"
              )}>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-app-border flex items-center justify-center">
              <Bot className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="bg-app-bg border border-app-border p-4 rounded-2xl rounded-tl-none">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-app-bg/50 border-t border-app-border">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="w-full pl-4 pr-12 py-3 bg-app-card border border-app-border rounded-2xl text-app-text focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
