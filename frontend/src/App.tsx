import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  Search, History, MessageSquare, RefreshCw, Copy, ExternalLink, 
  ChevronRight, Clock, ShieldCheck, AlertTriangle, Menu, X, Filter,
  FileCode, User, Bot, Layout, Globe, FolderOpen
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';
import partners from "./partners.json";

// --- Interfaces ---
interface Conversation {
  id: string;
  title: string;
  last_modified: string;
  size: number;
  isLocal?: boolean;
  handle?: FileSystemDirectoryHandle;
}

interface Message {
  role?: string;
  content?: string;
  timestamp?: string;
  type?: string;
  text?: string;
  sender?: string;
  source?: string;
}

const App = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState<'api' | 'browser'>('api');
  const [localDirHandle, setLocalDirHandle] = useState<FileSystemDirectoryHandle | null>(null);

  // --- API Functions ---
  const fetchConversations = useCallback(async () => {
    if (mode === 'api') {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:3001/api/conversations?q=${search}`);
        setConversations(res.data);
      } catch (err) {
        console.error("Erro ao buscar conversas via API:", err);
      } finally {
        setLoading(false);
      }
    } else if (localDirHandle) {
      scanLocalDirectory(localDirHandle);
    }
  }, [mode, search, localDirHandle]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // --- Browser File System Support ---
  const connectLocalFolder = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      setLocalDirHandle(handle);
      setMode('browser');
      scanLocalDirectory(handle);
    } catch (err) {
      console.error("Acesso à pasta negado ou não suportado:", err);
    }
  };

  const scanLocalDirectory = async (handle: FileSystemDirectoryHandle) => {
    setLoading(true);
    const found: Conversation[] = [];
    try {
      // Tenta encontrar a pasta 'conversations' ou 'brain'
      const brainHandle = await handle.getDirectoryHandle('brain');
      // @ts-ignore
      for await (const entry of brainHandle.values()) {
        if (entry.kind === 'directory') {
          const id = entry.name;
          let title = "Conversa Local";
          
          // Tenta ler o título de um arquivo MD
          try {
            const planFile = await entry.getFileHandle('implementation_plan.md');
            const file = await planFile.getFile();
            const text = await file.text();
            const match = text.match(/^# (.*)/m);
            if (match) title = match[1];
          } catch (e) {}

          found.push({
            id,
            title,
            last_modified: new Date().toISOString(),
            size: 0,
            isLocal: true,
            handle: entry
          });
        }
      }
      setConversations(found.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search)));
    } catch (err) {
      console.error("Erro ao escanear pasta local:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conv: Conversation) => {
    setSelectedId(conv.id);
    setLoading(true);
    setMessages([]);

    if (mode === 'api') {
      try {
        const res = await axios.get(`http://localhost:3001/api/conversations/${conv.id}`);
        setMessages(res.data);
      } catch (err) {
        console.error("Erro ao buscar logs:", err);
      } finally {
        setLoading(false);
      }
    } else if (conv.handle) {
      try {
        const systemGen = await conv.handle.getDirectoryHandle('.system_generated');
        const logs = await systemGen.getDirectoryHandle('logs');
        const overview = await logs.getFileHandle('overview.txt');
        const file = await overview.getFile();
        const text = await file.text();
        const parsed = text.split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
        setMessages(parsed);
      } catch (err) {
        console.error("Erro ao ler logs locais:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const healChat = async (id: string) => {
    if (mode === 'api') {
      try {
        await axios.post(`http://localhost:3001/api/conversations/${id}/heal`);
        alert("Comando de 'Cura' enviado! Verifique o Antigravity.");
      } catch (err) {
        alert("Falha ao enviar comando de cura.");
      }
    } else {
      alert("A função de Cura direta via navegador requer o Backend Rust local.");
    }
  };

  // --- Render Helpers ---
  const getMessageContent = (msg: any) => {
    return msg.content || msg.text || msg.payload?.text || JSON.stringify(msg);
  };

  const isUser = (msg: any) => {
    const sender = (msg.role || msg.sender || msg.source || "").toLowerCase();
    return sender === 'user' || sender === 'usuario';
  };

  const PartnerSection = () => {
    const [partner] = useState(partners[Math.floor(Math.random() * partners.length)]);
    
    return (
      <div className="mt-auto pt-6 border-t border-slate-800/50">
        <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 rounded-2xl p-4 relative overflow-hidden group cursor-pointer" onClick={() => window.open(partner.url, '_blank')}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full">{partner.tag}</span>
            <ExternalLink size={12} className="text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <img src={partner.image} alt="" className="w-full h-20 object-cover rounded-lg mb-3 opacity-80 group-hover:opacity-100 transition-all border border-slate-700/50" />
          <h4 className="text-xs font-bold text-white mb-1">{partner.title}</h4>
          <p className="text-[10px] text-slate-400 leading-snug">{partner.description}</p>
          <div className="mt-3 text-[10px] font-bold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            {partner.cta} <ChevronRight size={10} />
          </div>
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 blur-2xl rounded-full" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-premium-dark text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-80' : 'w-0'} bg-premium-sidebar border-r border-slate-800/50 flex flex-col transition-all duration-300 ease-in-out relative z-20`}>
        <div className="p-6 flex flex-col h-full overflow-hidden">
          
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <History size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">History Explorer</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Antigravity Recovery</p>
            </div>
          </div>

          {/* Search & Mode Switch */}
          <div className="space-y-3 mb-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar conversa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
              />
            </div>

            <button 
              onClick={mode === 'api' ? connectLocalFolder : () => setMode('api')}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-xs font-semibold uppercase tracking-wide group"
            >
              {mode === 'api' ? (
                <>
                  <Globe size={14} className="text-indigo-400" />
                  <span>Ativar Modo Cloud (Navegador)</span>
                </>
              ) : (
                <>
                  <Layout size={14} className="text-emerald-400" />
                  <span>Voltar para Modo Local (API)</span>
                </>
              )}
            </button>
            
            {mode === 'browser' && !localDirHandle && (
              <button 
                onClick={connectLocalFolder}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-sm font-bold shadow-lg shadow-indigo-600/20"
              >
                <FolderOpen size={18} />
                <span>Conectar Pasta .gemini</span>
              </button>
            )}
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-premium">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => fetchMessages(conv)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border relative group overflow-hidden ${
                  selectedId === conv.id 
                    ? "bg-indigo-600/10 border-indigo-500/50 shadow-lg shadow-indigo-500/5" 
                    : "bg-transparent border-transparent hover:bg-slate-800/40 hover:border-slate-700/50"
                }`}
              >
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <span className="text-[10px] font-mono text-slate-500 opacity-80 group-hover:text-indigo-400 transition-colors uppercase">{conv.id.substring(0, 8)}</span>
                  <span className="text-[10px] text-slate-500 font-medium">{conv.size > 0 ? (conv.size / 1024 / 1024).toFixed(1) + " MB" : ""}</span>
                </div>
                <h3 className={`text-sm font-semibold mb-2 line-clamp-2 leading-snug relative z-10 ${selectedId === conv.id ? 'text-white' : 'text-slate-300'}`}>
                  {conv.title}
                </h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 relative z-10 font-medium">
                  <Clock size={10} />
                  {format(new Date(conv.last_modified), "d 'de' MMM, HH:mm", { locale: ptBR })}
                </div>
                {selectedId === conv.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full" />
                )}
              </button>
            ))}
          </div>

          {/* Native Partner Ads (Unstoppable) */}
          <PartnerSection />

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-premium-dark to-premium-dark">
        
        {/* Top Header */}
        <header className="h-20 border-b border-slate-800/50 flex items-center justify-between px-8 bg-premium-dark/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
            >
              {sidebarOpen ? <Menu size={20} /> : <ChevronRight size={20} />}
            </button>
            {selectedId && (
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-white line-clamp-1 max-w-md">
                  {conversations.find(c => c.id === selectedId)?.title}
                </h2>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                  <span className="text-indigo-400 opacity-50">#</span> {selectedId}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {selectedId && (
              <button 
                onClick={() => healChat(selectedId)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                Curar Chat
              </button>
            )}
            <div className="h-6 w-[1px] bg-slate-800 mx-2" />
            <button className="p-2 text-slate-500 hover:text-white transition-colors">
              <ExternalLink size={20} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-premium">
          {!selectedId ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6 animate-bounce-slow">
                <MessageSquare size={40} className="text-indigo-500 opacity-50" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Selecione uma conversa</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Explore o histórico completo do seu Antigravity. {mode === 'browser' ? 'Selecione a pasta .gemini/antigravity no seu computador para varredura local.' : 'As conversas são sincronizadas em tempo real via API local.'}
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUserMsg = isUser(msg);
              return (
                <div key={idx} className={`flex flex-col ${isUserMsg ? 'items-end' : 'items-start'} group`}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    {!isUserMsg && <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center"><Bot size={12} className="text-white" /></div>}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-indigo-400 transition-colors">
                      {isUserMsg ? 'Usuário' : 'Agente AI'}
                    </span>
                    {isUserMsg && <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center"><User size={12} className="text-white" /></div>}
                  </div>
                  <div className={`max-w-[85%] p-5 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap border transition-all ${
                    isUserMsg 
                      ? "bg-slate-800/30 border-slate-700 text-slate-200 rounded-tr-none" 
                      : "bg-indigo-600/5 border-indigo-500/20 text-indigo-50 rounded-tl-none shadow-xl shadow-indigo-500/5"
                  }`}>
                    {getMessageContent(msg)}
                  </div>
                </div>
              );
            })
          )}
          {loading && (
            <div className="flex items-center justify-center p-12">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              </div>
            </div>
          )}
        </div>

        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-indigo-900/10 blur-[100px] rounded-full pointer-events-none" />
      </main>
    </div>
  );
};

export default App;
