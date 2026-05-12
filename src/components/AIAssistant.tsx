import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Mic,
  Square,
  Volume2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useProjectData } from '@/context/ProjectDataContext';
import ProjectToolbar from './ProjectToolbar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'data' | 'suggestion';
  sources?: { type: string; id: string; relevance: number }[];
  confidence?: number;
}

const suggestedQueries = [
  { icon: Clock, text: 'Project Status', query: 'What is the current status of the project based on the uploaded documents?' },
  { icon: AlertTriangle, text: 'Top Risks', query: 'Identify the top risks in the current project state and suggest mitigations.' },
  { icon: CheckCircle, text: 'Progress Report', query: 'Show me the progress of all ongoing tasks and key milestones.' },
  { icon: Zap, text: 'Optimization', query: 'How can we optimize resource allocation?' },
];

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: `Hello! I'm your InfraMind Assistant. I've analyzed your project documents and I'm ready to help.

• **Status Updates** - Real-time task and milestone tracking
• **Risk Discovery** - Identifying bottlenecks and critical path risks
• **Resource Sync** - Optimizing team and asset deployment
• **Schedule Analysis** - Understanding dates and dependencies

How can I assist your project today?`,
    timestamp: new Date(),
    type: 'text',
  },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { askAi, transcribeAudio, synthesizeSpeech, workspace } = useProjectData();
  const activeProjectName = workspace?.projectList?.find((p: any) => p.id === workspace.activeProjectId)?.name;
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await askAi(userMessage.content);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        confidence: response.confidence,
        sources: response.sources,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error while processing your request.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const result = await transcribeAudio(blob);
      setInputValue((prev) => `${prev} ${result}`.trim());
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  const speak = async (text: string) => {
    try {
      const audioBlob = await synthesizeSpeech(text);
      const url = URL.createObjectURL(audioBlob);
      new Audio(url).play();
    } catch {
      speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  };

  return (
    <div className="h-full flex flex-col p-1">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[#0f3433] tracking-tight">AI Assistant{activeProjectName && <> | <span className="text-[#12b3a8]">{activeProjectName}</span></>}</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Conversational project intelligence powered by OpenAI</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#f0f9f8] border border-[#e0f2f1] rounded-xl">
            <div className="w-2 h-2 bg-[#12b3a8] rounded-full animate-pulse shadow-[0_0_8px_#12b3a8]"></div>
            <span className="text-[10px] font-extrabold text-[#12b3a8] uppercase tracking-widest">Active</span>
          </div>
          <button
            onClick={() => setMessages(initialMessages)}
            className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-400 transition-all active:scale-95"
            title="Reset Chat"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <ProjectToolbar  />

      {/* Main Chat Area */}
      <div className="flex-1 mt-4 bg-white rounded-[32px] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col overflow-hidden">
        {/* Assistant Status Bar */}
        <div className="px-6 py-4 border-b border-gray-50 bg-[#0f3433] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
              <Bot className="w-5 h-5 text-[#12b3a8]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white tracking-tight">InfraMind Logic Engine</h3>
              <p className="text-[9px] text-[#a0c4c2] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> context-aware analysis
              </p>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          {messages.length === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {suggestedQueries.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => setInputValue(s.query)}
                    className="p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-[#f0f9f8] hover:border-[#12b3a8] transition-all text-left group"
                  >
                    <Icon className="w-5 h-5 text-gray-400 group-hover:text-[#12b3a8] mb-3" />
                    <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">{s.text}</p>
                    <p className="text-xs font-bold text-[#0f3433] line-clamp-1">Quick analysis...</p>
                  </button>
                );
              })}
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-5 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-[#0f3433] text-white shadow-lg'
                    : 'bg-[#f0f9f8] text-[#0f3433] border border-[#e0f2f1]'
                }`}>
                  <div className="text-[14px] leading-relaxed whitespace-pre-wrap font-medium">
                    {message.content}
                  </div>
                </div>
                
                {/* Message Meta */}
                <div className="flex items-center gap-3 mt-2 px-1">
                   <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => speak(message.content)} className="p-1 hover:text-[#12b3a8] text-gray-300 transition-colors"><Volume2 className="w-3 h-3" /></button>
                      <button onClick={() => navigator.clipboard.writeText(message.content)} className="p-1 hover:text-[#12b3a8] text-gray-300 transition-colors"><Copy className="w-3 h-3" /></button>
                      <div className="h-2 w-[1px] bg-gray-100 mx-1"></div>
                      <button className="p-1 hover:text-green-500 text-gray-300 transition-colors"><ThumbsUp className="w-3 h-3" /></button>
                      <button className="p-1 hover:text-red-500 text-gray-300 transition-colors"><ThumbsDown className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-4">
              <div className="p-4 bg-[#f0f9f8] rounded-2xl border border-[#e0f2f1] flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-[#12b3a8] animate-spin" />
                <span className="text-xs font-bold text-[#12b3a8] uppercase tracking-widest">Processing Data...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-50">
          <div className="flex items-center gap-3 bg-white p-2 rounded-[20px] shadow-sm border border-gray-100">
            <button
              onClick={() => (isRecording ? stopRecording() : void startRecording())}
              className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-50 text-gray-400 hover:text-[#0f3433]'}`}
            >
              {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Query project state, risks, or artifacts..."
              className="flex-1 bg-transparent border-none text-sm font-medium text-[#0f3433] placeholder:text-gray-400 focus:ring-0 px-2"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="p-3 bg-[#12b3a8] text-white rounded-xl hover:bg-[#0e9188] transition-all disabled:opacity-30 active:scale-95 flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-4 text-center font-bold uppercase tracking-[2px]">
            AI Analysis is based on extracted document context
          </p>
        </div>
      </div>
    </div>
  );
}