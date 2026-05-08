import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { 
  Search, History, Menu, BarChart3, TrendingUp, Bot, MapPin, Clock, Lock, Copy, Check, Settings, Info, FileText
} from "lucide-react";

// URL base: em produção usa URL relativa (sem localhost), em dev usa localhost:3001
const API_BASE = import.meta.env.VITE_API_URL || "";

// --- I18n Dictionary ---
const translations: Record<string, Record<string, string>> = {
  pt: {
    title: "Antigravity Explorer (OSS)",
    search: "Pesquisar...",
    local_hist: "Histórico Local",
    rust_api: "API Rust",
    select_conv: "Selecione uma conversa",
    privacy: "Privacidade",
    contact: "Contato",
    translate: "Traduzir",
    lang: "Idioma",
    help: "Ajuda & Manual",
    os_path_title: "Dar Acesso à Pasta",
    os_path_desc: "Para visualizar o seu histórico completo, precisamos que você libere o acesso à pasta selecionada no seu computador. Para facilitar, copie o caminho sugerido abaixo e cole na barra de endereços ao prosseguir.",
    open_folder: "Liberar Acesso",
    path_copied: "Copiado!",
    copy_path: "Copiar Caminho",
    close: "Cancelar",
  },
  en: {
    title: "Antigravity Explorer (OSS)",
    search: "Search...",
    local_hist: "Local History",
    rust_api: "Rust API",
    select_conv: "Select a conversation",
    privacy: "Privacy",
    contact: "Contact",
    translate: "Translate",
    lang: "Language",
    help: "Help & Manual",
    os_path_title: "Grant Folder Access",
    os_path_desc: "To view your complete history, we need you to grant access to the selected folder on your computer. To make it easier, copy the suggested path below and paste it into the address bar when proceeding.",
    open_folder: "Grant Access",
    path_copied: "Copied!",
    copy_path: "Copy Path",
    close: "Close",
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
  const [view, setView] = useState<"user" | "manual">("user");
  const [messages, setMessages] = useState<any[]>([]);
  const [translatingId, setTranslatingId] = useState<number | null>(null);
  
  const [showPathModal, setShowPathModal] = useState(false);
  const [osPath, setOsPath] = useState("");
  const [copied, setCopied] = useState(false);
  const [localMessagesMap, setLocalMessagesMap] = useState<Record<string, any[]>>({});
  const [selectedFolderName, setSelectedFolderName] = useState("");

  useEffect(() => {
    document.documentElement.dir = ["ar", "he"].includes(lang) ? "rtl" : "ltr";
    localStorage.setItem("soul_lang", lang);
  }, [lang]);

  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash;
      if (h === "#/manual") setView("manual");
      else setView("user");
    };
    window.addEventListener("hashchange", handleHash);
    handleHash();
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const fetchConversations = useCallback(async () => {
    if (mode === "api") {
      try {
        const res = await axios.get(`${API_BASE}/api/conversations?per_page=1000`);
        setConversations(res.data);
      } catch (_err) {}
    }
  }, [mode]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedId) {
      if (mode === "browser") setMessages(localMessagesMap[selectedId] || []);
      else axios.get(`${API_BASE}/api/conversations/${selectedId}`).then(res => setMessages(res.data)).catch(() => setMessages([]));
    } else setMessages([]);
  }, [selectedId, mode, localMessagesMap]);

  const handleToggleMode = () => {
    if (mode === "api") { setOsPath(getOsPath()); setShowPathModal(true); }
    else { setMode("api"); fetchConversations(); }
  };

  const readLocalHistory = async () => {
    setShowPathModal(false);
    try {
      // @ts-ignore
      const rootHandle = await window.showDirectoryPicker();
      setMode("browser");
      setSelectedFolderName(rootHandle.name);
      let brainHandle: any = null, convsHandle: any = null;
      try { brainHandle = await rootHandle.getDirectoryHandle("brain"); } catch (e) {}
      try { convsHandle = await rootHandle.getDirectoryHandle("conversations"); } catch (e) {}

      const localConvs: any[] = [], newLocalMap: any = {};
      const source = convsHandle || brainHandle || rootHandle;
      const logsSource = brainHandle || rootHandle;

      for await (const entry of source.values()) {
        if (entry.kind === "directory" || (entry.kind === "file" && entry.name.endsWith(".pb"))) {
          const id = entry.name.replace(".pb", "");
          try {
            const itemDir = await logsSource.getDirectoryHandle(id);
            const logs = await (await (await itemDir.getDirectoryHandle(".system_generated")).getDirectoryHandle("logs")).getFileHandle("overview.txt");
            const file = await logs.getFile();
            const content = await file.text();
            let title = id;
            try { title = (await (await itemDir.getFileHandle("task.md")).getFile()).text().then(t => t.split("\n").find(l => l.startsWith("# "))?.replace("# ", "") || id); } catch(e) {}
            
            localConvs.push({ id, title, last_modified: new Date(file.lastModified).toISOString() });
            const msgs = content.split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);
            newLocalMap[id] = msgs;
          } catch(e) {}
        }
      }
      setLocalMessagesMap(newLocalMap);
      setConversations(localConvs.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()));
    } catch (e) { setMode("api"); }
  };

  const translateMessage = async (text: string, index: number) => {
    setTranslatingId(index);
    try {
      const res = await axios.post(`${API_BASE}/api/translate`, { text, target_lang: lang === "pt" ? "pt-br" : "en" });
      const nm = [...messages]; nm[index].content = res.data.translated_text; setMessages(nm);
    } catch (err) { alert("Erro na tradução"); } finally { setTranslatingId(null); }
  };

  return (
    <div className="flex h-screen bg-premium-dark text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      <aside className={`${sidebarOpen ? "w-80 border-r" : "w-0 border-r-0"} bg-premium-sidebar border-slate-800/50 flex flex-col transition-all duration-300 relative z-20 shrink-0 overflow-hidden`}>
        <div className="p-6 flex flex-col h-full min-w-[20rem]">
          <div className="flex items-center gap-3 mb-8 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl"><History size={24} className="text-white" /></div>
              <h1 className="text-lg font-bold text-white tracking-tighter">{t.title}</h1>
            </div>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-transparent text-[10px] font-bold uppercase border-none text-slate-400 cursor-pointer">
              <option value="pt">PT</option>
              <option value="en">EN</option>
            </select>
          </div>
          <div className="space-y-3 mb-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="text" placeholder={t.search} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <button onClick={handleToggleMode} className="w-full py-2.5 px-4 rounded-xl border border-slate-700 text-[10px] font-bold uppercase tracking-widest hover:border-indigo-500/50 transition-colors flex flex-col items-center justify-center gap-1">
              {mode === "api" ? <span>{t.local_hist}</span> : <><span className="text-indigo-400">{t.rust_api}</span><span className="text-[8px] opacity-60 truncate max-w-full">{selectedFolderName}</span></>}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-premium">
            {conversations.map((conv) => (
              <button key={conv.id} onClick={() => setSelectedId(conv.id)} className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedId === conv.id ? "bg-indigo-600/10 border-indigo-500/50" : "border-transparent hover:bg-slate-800/40"}`}>
                <h3 className="text-sm font-semibold text-slate-300 truncate">{conv.title}</h3>
                {conv.last_modified && <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-tighter">{new Date(conv.last_modified).toLocaleString(lang === "pt" ? "pt-BR" : "en-US")}</p>}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center">
            <button onClick={() => window.location.hash = "#/manual"} className="p-2 text-slate-500 hover:text-indigo-400 transition-colors" title={t.help}><Info size={18} /></button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col bg-premium-dark relative overflow-hidden">
        <header className="h-20 border-b border-slate-800/50 flex items-center px-8 bg-premium-dark/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors"><Menu size={20} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-premium">
          {view === "manual" ? (
            <div className="max-w-3xl mx-auto py-12 prose prose-invert">
              <h2 className="text-3xl font-black text-white mb-12 flex items-center gap-4"><FileText className="text-indigo-500" /> {t.manual_title}</h2>
              <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] text-slate-300 leading-relaxed space-y-6">
                <p>O Antigravity Explorer (OSS) permite visualizar histórico local offline.</p>
                <h4 className="text-white font-bold">Privacidade</h4>
                <p>Tudo é processado localmente no seu navegador.</p>
              </div>
            </div>
          ) : !selectedId ? (
            <div className="h-full flex items-center justify-center text-slate-700 italic">{t.select_conv}</div>
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
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] w-full max-w-lg shadow-2xl relative">
            <h3 className="text-2xl font-black text-white mb-6">{t.os_path_title}</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">{t.os_path_desc}</p>
            <div className="flex items-center bg-slate-800/30 rounded-2xl border border-slate-700/50 p-3 mb-10">
              <code className="text-xs text-indigo-300 font-mono flex-1 overflow-hidden truncate px-2">{osPath}</code>
              <button onClick={() => { navigator.clipboard.writeText(osPath); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 ml-2 text-indigo-400 hover:text-white transition-colors">{copied ? <Check size={18} /> : <Copy size={18} />}</button>
            </div>
            <div className="flex items-center justify-end gap-4">
              <button onClick={() => setShowPathModal(false)} className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:text-white transition-colors">{t.close}</button>
              <button onClick={readLocalHistory} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">{t.open_folder}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
