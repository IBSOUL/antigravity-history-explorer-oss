import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  Search, History, Menu, Bot, Lock, Copy, Check, Settings, Info, FileText, Download, User, Calendar
} from "lucide-react";

// URL base para o backend Rust local
const API_BASE = import.meta.env.VITE_API_URL || "";

// --- I18n Dictionary ---
const translations: Record<string, Record<string, string>> = {
  pt: {
    title: "Antigravity Explorer (OSS)",
    search: "Pesquisar...",
    local_hist: "Histórico Local",
    rust_api: "API Rust",
    select_conv: "Selecione uma conversa",
    sponsored: "Patrocinado",
    privacy: "Privacidade",
    contact: "Contato",
    translate: "Traduzir",
    settings_title: "Configurações",
    save: "Salvar",
    lang: "Idioma",
    loading: "Carregando...",
    repair_hist: "Reparar Histórico",
    onboarding_title: "Explore seu Histórico com Inteligência",
    onboarding_step1: "Como Funciona?",
    onboarding_step1_desc: "O Antigravity Explorer organiza e permite que você navegue pelos logs de conversas das suas IAs locais de forma visual e intuitiva.",
    onboarding_step2: "Privacidade Total",
    onboarding_step2_desc: "Seus dados nunca saem do seu computador. A leitura é feita diretamente dos seus arquivos locais.",
    onboarding_step3: "Começando agora",
    onboarding_step3_desc: "Clique no botão 'Histórico Local' e selecione a pasta raiz do Antigravity (onde ficam as pastas 'brain' e 'conversations').",
    onboarding_cta: "Entendi, vamos lá!",
    os_path_title: "Dar Acesso à Pasta",
    os_path_desc: "Dar acesso aos arquivos em *** para o antigravityhex?",
    open_folder: "Liberar Acesso",
    path_copied: "Copiado!",
    copy_path: "Copiar Caminho",
    close: "Cancelar",
    ai_config: "Configuração de IA",
    gemini_key: "Chave de API Gemini (para traduções)",
    help: "Ajuda & Manual",
  },
  en: {
    title: "Antigravity Explorer (OSS)",
    search: "Search...",
    local_hist: "Local History",
    rust_api: "Rust API",
    select_conv: "Select a conversation",
    sponsored: "Sponsored",
    privacy: "Privacy",
    contact: "Contact",
    translate: "Translate",
    settings_title: "Settings",
    save: "Save",
    lang: "Language",
    loading: "Loading...",
    repair_hist: "Repair History",
    onboarding_title: "Explore Your History with Intelligence",
    onboarding_step1: "How It Works?",
    onboarding_step1_desc: "Antigravity Explorer organizes and lets you browse your local AI conversation logs in a visual and intuitive way.",
    onboarding_step2: "Total Privacy",
    onboarding_step2_desc: "Your data never leaves your computer. Reading is done directly from your local files.",
    onboarding_step3: "Getting Started",
    onboarding_step3_desc: "Click the 'Local History' button and select the Antigravity root folder (where 'brain' and 'conversations' are).",
    onboarding_cta: "Got it, let's go!",
    os_path_title: "Grant Folder Access",
    os_path_desc: "Give access to files in *** to antigravityhex?",
    open_folder: "Grant Access",
    path_copied: "Copied!",
    copy_path: "Copy Path",
    close: "Close",
    ai_config: "AI Configuration",
    gemini_key: "Gemini API Key (for translations)",
    help: "Help & Manual",
  },
};

const getOsPath = () => {
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "C:\\Users\\SeuUsuario\\.gemini\\antigravity";
  if (ua.includes("mac")) return "/Users/SeuUsuario/.gemini/antigravity";
  return "/home/SeuUsuario/.gemini/antigravity";
};

const App = () => {
  const [lang, setLang] = useState(localStorage.getItem("soul_lang") || "pt");
  const t = translations[lang] || translations["pt"];
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState<"api" | "browser">("api");
  const [view, setView] = useState<"user" | "settings" | "manual">("user");
  const [messages, setMessages] = useState<any[]>([]);
  const [translatingId, setTranslatingId] = useState<number | null>(null);
  
  const [showPathModal, setShowPathModal] = useState(false);
  const [osPath, setOsPath] = useState("");
  const [copied, setCopied] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem("antigravity_onboarded"));
  
  const [localMessagesMap, setLocalMessagesMap] = useState<Record<string, any[]>>({});
  const [selectedFolderName, setSelectedFolderName] = useState("");
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem("antigravity_gemini_key") || "");

  useEffect(() => {
    localStorage.setItem("soul_lang", lang);
  }, [lang]);

  const fetchConversations = useCallback(async () => {
    if (mode === "api") {
      try {
        const res = await axios.get(`${API_BASE}/api/conversations`);
        setConversations(res.data);
      } catch (_err) {}
    }
  }, [mode]);

  const fetchConversationData = useCallback(async (id: string) => {
    if (mode === "browser") {
      setMessages(localMessagesMap[id] || []);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/api/conversations/${id}`);
      setMessages(res.data);
    } catch (_err) {
      setMessages([]);
    }
  }, [mode, localMessagesMap]);

  const handleToggleMode = () => {
    if (mode === "api") {
      setOsPath(getOsPath());
      setShowPathModal(true);
    } else {
      setMode("api");
      fetchConversations();
    }
  };

  const readLocalHistory = async () => {
    setShowPathModal(false);
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();
      setSelectedFolderName(dirHandle.name);
      setMode("browser");
      const localConvs: any[] = [];
      const newLocalMap: Record<string, any[]> = {};

      const scanDir = async (handle: any) => {
        for await (const entry of handle.values()) {
          if (entry.kind === "directory") {
            try {
              const sysGenHandle = await entry.getDirectoryHandle(".system_generated");
              const logsHandle = await sysGenHandle.getDirectoryHandle("logs");
              const overviewHandle = await logsHandle.getFileHandle("overview.txt");
              const file = await overviewHandle.getFile();
              const content = await file.text();

              let title = entry.name;
              try {
                const taskHandle = await entry.getFileHandle("task.md");
                const taskContent = await (await taskHandle.getFile()).text();
                const h = taskContent.split("\n").find(l => l.startsWith("# "));
                if (h) title = h.replace("# ", "").trim();
              } catch(e) {}

              localConvs.push({ id: entry.name, title, last_modified: new Date(file.lastModified).toISOString() });
              newLocalMap[entry.name] = content.split("\n").filter(Boolean).map(l => {
                try { return JSON.parse(l); } catch(e) { return null; }
              }).filter(Boolean);
            } catch(e) {
              await scanDir(entry);
            }
          }
        }
      };

      await scanDir(dirHandle);
      setLocalMessagesMap(newLocalMap);
      setConversations(localConvs.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()));
    } catch (e) {
      setMode("api");
    }
  };

  const translateMessage = async (text: string, index: number) => {
    if (!geminiKey) {
      setView("settings");
      return;
    }
    setTranslatingId(index);
    try {
      const res = await axios.post(`${API_BASE}/api/translate`, { 
        text, 
        target_lang: lang === "pt" ? "pt-br" : "en",
        api_key: geminiKey 
      });
      const newMessages = [...messages];
      newMessages[index].content = res.data.translated_text;
      setMessages(newMessages);
    } catch (err) {
      alert("Erro na tradução. Verifique sua chave no menu de configurações.");
    } finally {
      setTranslatingId(null);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedId) fetchConversationData(selectedId);
    else setMessages([]);
  }, [selectedId, fetchConversationData]);

  return (
    <div className="flex h-screen bg-premium-dark text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      <aside className={`${sidebarOpen ? "w-80" : "w-0"} bg-premium-sidebar border-r border-slate-800/50 flex flex-col transition-all duration-300 relative z-20 shrink-0`}>
        <div className="p-6 flex flex-col h-full overflow-hidden">
          <div className="flex items-center gap-3 mb-8 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl"><History size={24} className="text-white" /></div>
              <h1 className="text-lg font-bold text-white tracking-tighter">{t.title}</h1>
            </div>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-transparent text-[10px] font-bold uppercase border-none text-slate-400 cursor-pointer focus:ring-0">
              <option value="pt">PT</option>
              <option value="en">EN</option>
            </select>
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="text" placeholder={t.search} className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <button onClick={handleToggleMode} className="w-full py-2.5 px-4 rounded-xl border border-slate-700 text-[10px] font-bold uppercase tracking-widest hover:border-indigo-500/50 transition-colors flex flex-col items-center justify-center gap-1">
              {mode === "api" ? <span>{t.local_hist}</span> : <><span className="text-indigo-400">MODO LOCAL</span><span className="text-[8px] opacity-60 truncate max-w-full">{selectedFolderName}</span></>}
            </button>
            {mode === "browser" && (
              <button onClick={readLocalHistory} className="w-full py-2 px-4 rounded-xl bg-slate-800 text-[9px] font-bold uppercase text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2">
                <History size={14} /> {t.repair_hist}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-premium">
            {conversations.map((conv) => (
              <button key={conv.id} onClick={() => { setSelectedId(conv.id); setView("user"); }} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedId === conv.id ? "bg-indigo-600/10 border-indigo-500/50" : "border-transparent hover:bg-slate-800/40"}`}>
                <h3 className="text-sm font-semibold text-slate-300">{conv.title}</h3>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center">
            <button onClick={() => setView("manual")} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors" title={t.help}><Info size={18} /></button>
            <button onClick={() => setView("settings")} className="p-2 text-slate-500 hover:text-white transition-colors" title={t.settings_title}><Settings size={18} /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-premium-dark relative overflow-hidden">
        <header className="h-20 border-b border-slate-800/50 flex items-center px-8 bg-premium-dark/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors"><Menu size={20} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-premium">
          {view === "settings" ? (
            <div className="max-w-2xl mx-auto py-12">
              <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-3"><Settings className="text-indigo-500" /> {t.settings_title}</h2>
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] space-y-8">
                <section>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{t.ai_config}</h4>
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">{t.gemini_key}</label>
                    <input 
                      type="password" 
                      value={geminiKey} 
                      onChange={e => setGeminiKey(e.target.value)} 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:ring-1 focus:ring-indigo-500/50"
                      placeholder="AIza..."
                    />
                  </div>
                </section>
                <button onClick={() => { localStorage.setItem("antigravity_gemini_key", geminiKey); setView("user"); }} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all">{t.save}</button>
              </div>
            </div>
          ) : view === "manual" ? (
            <div className="max-w-3xl mx-auto py-12 prose prose-invert">
              <h2 className="text-3xl font-black text-white mb-12 flex items-center gap-4"><FileText className="text-indigo-500" /> {t.manual_title}</h2>
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] text-slate-300 leading-relaxed space-y-6">
                <p>O Antigravity History Explorer permite que você visualize seu histórico local do Antigravity de forma rápida e segura.</p>
                <h4 className="text-white font-bold">Como usar o Modo Local</h4>
                <p>Clique em "Histórico Local" na barra lateral. O navegador solicitará que você selecione uma pasta. Escolha a pasta raiz do Antigravity (que contém 'brain' e 'conversations').</p>
                <h4 className="text-white font-bold">Privacidade</h4>
                <p>Nenhum dado é enviado para servidores externos. O processamento é feito inteiramente no seu navegador.</p>
              </div>
            </div>
          ) : showOnboarding || !selectedId ? (
            <div className="max-w-4xl mx-auto py-12 text-center">
              <div className="mb-12 inline-block p-4 bg-indigo-600/20 rounded-3xl text-indigo-400"><Bot size={48} /></div>
              <h2 className="text-4xl font-black text-white mb-6 tracking-tight">{t.onboarding_title}</h2>
              <p className="text-slate-400 mb-16 text-lg max-w-2xl mx-auto leading-relaxed">{t.onboarding_step1_desc}</p>
              
              <div className="grid grid-cols-3 gap-8 mb-16 text-left">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem]">
                  <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400 mb-6 font-bold">1</div>
                  <h4 className="text-white font-bold mb-3">{t.onboarding_step1}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{t.onboarding_step1_desc}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem]">
                  <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-400 mb-6 font-bold">2</div>
                  <h4 className="text-white font-bold mb-3">{t.onboarding_step2}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{t.onboarding_step2_desc}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem]">
                  <div className="w-10 h-10 bg-orange-600/10 rounded-xl flex items-center justify-center text-orange-400 mb-6 font-bold">3</div>
                  <h4 className="text-white font-bold mb-3">{t.onboarding_step3}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{t.onboarding_step3_desc}</p>
                </div>
              </div>

              {showOnboarding && (
                <button 
                  onClick={() => { setShowOnboarding(false); localStorage.setItem("antigravity_onboarded", "true"); }} 
                  className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/40 hover:scale-105 active:scale-95"
                >
                  {t.onboarding_cta}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6 pb-20 max-w-4xl mx-auto">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[90%] rounded-3xl p-6 shadow-sm ${msg.role === "user" ? "bg-indigo-600/10 border border-indigo-500/20 text-indigo-100" : "bg-slate-900/80 border border-slate-800 text-slate-300"}`}>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.content || JSON.stringify(msg)}</pre>
                  </div>
                  <button onClick={() => translateMessage(msg.content || JSON.stringify(msg), idx)} className="mt-2 px-4 text-[9px] uppercase font-bold tracking-widest text-slate-600 hover:text-indigo-400 transition-colors flex items-center gap-1" disabled={translatingId === idx}>{translatingId === idx ? "..." : t.translate}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showPathModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-12 rounded-[3.5rem] w-full max-w-lg shadow-2xl relative text-center">
            <div className="mb-8 inline-block p-4 bg-indigo-600/10 rounded-3xl text-indigo-400"><Lock size={32} /></div>
            <h3 className="text-2xl font-black text-white mb-4">{t.os_path_title}</h3>
            <p className="text-sm text-slate-400 mb-10 leading-relaxed">{t.os_path_desc}</p>
            <div className="flex items-center bg-slate-950 rounded-2xl border border-slate-800 p-4 mb-10 group">
              <code className="text-xs text-indigo-400 font-mono flex-1 overflow-hidden truncate text-left">{osPath}</code>
              <button onClick={() => { navigator.clipboard.writeText(osPath); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 ml-2 text-slate-500 hover:text-white transition-colors">
                {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={readLocalHistory} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">{t.open_folder}</button>
              <button onClick={() => setShowPathModal(false)} className="w-full py-5 text-slate-500 font-bold hover:text-white transition-colors">{t.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
