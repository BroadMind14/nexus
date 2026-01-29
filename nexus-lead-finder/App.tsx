import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppMode, HistoryItem, Lead, SavedLead, SearchResult, ChatMessage } from './types';
import { processChat } from './geminiService';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import LeadCard from './components/LeadCard';

enum View {
  HOME = 'HOME',
  SAVED_LIST = 'SAVED_LIST'
}

interface ThreadEntry {
  query: string;
  result?: SearchResult;
  isLoading: boolean;
}

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.HOME);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [expandedContexts, setExpandedContexts] = useState<Set<number>>(new Set());
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [savedLeads, setSavedLeads] = useState<SavedLead[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (thread.length > 0) {
      lastItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [thread, isLoading]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || isLoading) return;

    const isFirstMessage = thread.length === 0;

    // 1. Immediate UI Feedback
    setThread(prev => [...prev, { query, isLoading: true }]);
    setView(View.HOME);
    setIsLoading(true);

    try {
      const result = await processChat(query, chatHistory);
      
      // 2. Update the last thread entry with results
      setThread(prev => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        if (lastIndex >= 0) {
          next[lastIndex] = { ...next[lastIndex], result, isLoading: false };
        }
        return next;
      });

      setIsLoading(false);

      // 3. History Logic: Only log the VERY FIRST prompt
      if (isFirstMessage) {
        const historyItem: HistoryItem = {
          id: Math.random().toString(36).substring(7),
          query,
          timestamp: Date.now(),
          result,
        };
        setHistory(prev => [historyItem, ...prev]);
      }

      const modelSummary = result.mode === 'LEAD' 
        ? `I found ${result.leads?.length || 0} matches.`
        : result.summary?.substring(0, 50) || "Search complete.";

      setChatHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text: query }] },
        { role: 'model', parts: [{ text: modelSummary }] }
      ].slice(-12)); 
    } catch (err) {
      setIsLoading(false);
      setThread(prev => {
        const next = [...prev];
        const lastIndex = next.length - 1;
        if (lastIndex >= 0) {
          next[lastIndex] = { 
            ...next[lastIndex], 
            isLoading: false,
            result: {
              mode: AppMode.OUT_OF_CONTEXT,
              outOfContextMessage: "I couldn't find matches for this request. Please try a different query.",
              query
            }
          };
        }
        return next;
      });
    }
  }, [chatHistory, isLoading, thread.length]);

  const startNewChat = () => {
    setChatHistory([]);
    setThread([]);
    setIsHistoryOpen(false);
    setView(View.HOME);
  };

  const saveLead = useCallback((lead: Lead) => {
    const saved: SavedLead = { ...lead, savedAt: Date.now() };
    setSavedLeads(prev => {
      if (prev.find(l => l.name === lead.name)) return prev;
      return [saved, ...prev];
    });
  }, []);

  const restoreHistory = (item: HistoryItem) => {
    setThread([{ query: item.query, result: item.result, isLoading: false }]);
    setIsHistoryOpen(false);
    setView(View.HOME);
  };

  const toggleContext = (index: number) => {
    setExpandedContexts(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const openContact = (type: string, value: string) => {
    if (!value) return;
    let url = '';
    switch(type) {
      case 'Email': url = `mailto:${value}`; break;
      case 'Phone': url = `tel:${value}`; break;
      default:
        url = value.startsWith('http') ? value : `https://${value}`; 
    }
    window.open(url, '_blank');
  };

  // Simple Markdown Formatter
  const formatText = (text: string) => {
    if (!text) return null;
    
    // 1. Detect Tables
    if (text.includes('|') && text.includes('-|')) {
      const rows = text.split('\n').filter(r => r.trim().startsWith('|'));
      if (rows.length > 2) {
        const header = rows[0].split('|').filter(c => c.trim()).map(c => c.trim());
        const bodyRows = rows.slice(2).map(r => r.split('|').filter(c => c.trim()).map(c => c.trim()));
        
        return (
          <div className="overflow-x-auto my-4 glass-card rounded-2xl border border-black/[0.02]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50">
                <tr>
                  {header.map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-black/[0.01]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri} className="border-b border-black/[0.005] last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-3 text-[14px] font-bold text-slate-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    // 2. Basic Bold/Italic cleaning
    const processed = text
      .replace(/\*\*(.*?)\*\*/g, '<b class="font-black text-slate-900">$1</b>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-slate-500">$1</em>');

    return <div dangerouslySetInnerHTML={{ __html: processed }} />;
  };

  const suggestions = ["High-growth startups", "Luxury retail owners", "Seed stage founders", "Boutique design teams"];
  const isSaved = selectedLead ? savedLeads.some(l => l.name === selectedLead.name) : false;

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center safe-area-inset sidebar-transition overflow-hidden">
      
      {/* Top Nav */}
      <div className="fixed top-4 left-0 right-0 px-5 flex justify-between items-center z-50 pointer-events-none">
        <button 
          onClick={() => setIsHistoryOpen(true)}
          className="w-10 h-10 flex items-center justify-center glass rounded-2xl text-slate-400 hover:text-slate-900 transition-all bouncy-tap pointer-events-auto border border-black/[0.01] shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <button 
          onClick={() => setIsAccountOpen(true)}
          className="w-10 h-10 flex items-center justify-center glass rounded-2xl text-slate-400 hover:text-slate-900 transition-all bouncy-tap pointer-events-auto border border-black/[0.01] shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 w-full max-w-md px-5 pt-20 pb-28 overflow-y-auto scroll-container elastic-scroll"
      >
        {view === View.HOME && (
          <>
            {thread.length === 0 && !isLoading && (
              <div className="h-[55vh] flex flex-col items-center justify-center text-center px-4 pop-in">
                <h1 className="text-[28px] font-black mb-10 tracking-tight text-slate-900 leading-tight">What are you<br/>searching today?</h1>
                <div className="flex flex-wrap justify-center gap-2 max-w-[300px]">
                  {suggestions.map((s, i) => (
                    <button key={i} onClick={() => handleSearch(s)} className="px-4 py-2 glass rounded-full text-[13px] font-bold text-slate-500 hover:text-slate-900 transition-all bouncy-tap border border-black/[0.01] shadow-sm">{s}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-12">
              {thread.map((entry, rIdx) => {
                const result = entry.result;
                const isLeadMode = result?.mode === 'LEAD' || (result?.leads && result.leads.length > 0);
                const isTextMode = result?.mode === 'TEXT';
                
                return (
                  <div key={rIdx} className="space-y-4" ref={rIdx === thread.length - 1 ? lastItemRef : null}>
                    {/* User Query Bubble */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-slate-50 border border-black/[0.01] px-4 py-2 rounded-[20px] shadow-sm animate-card-entry">
                        <p className="text-[15px] font-bold text-slate-900 tracking-tight leading-tight">{entry.query}</p>
                      </div>
                    </div>

                    {/* Result Content */}
                    <div className="space-y-4">
                      {entry.isLoading ? (
                        <div className="flex items-center gap-3 px-1 py-4">
                          <div className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-pulse"></div>
                          <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-300">Searching...</span>
                        </div>
                      ) : result ? (
                        <>
                          {isLeadMode ? (
                            <div className="space-y-3">
                              {result.explanation && (
                                <div className="mb-4 pop-in">
                                  <button 
                                    onClick={() => toggleContext(rIdx)}
                                    className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-slate-900 uppercase tracking-[0.25em] px-1 mb-2 bouncy-tap"
                                  >
                                    {expandedContexts.has(rIdx) ? 'Hide Research' : 'Show Research Context'}
                                  </button>
                                  {expandedContexts.has(rIdx) && (
                                    <div className="p-4 glass rounded-[24px] text-[14px] text-slate-600 leading-relaxed font-medium pop-in border border-black/[0.01]">
                                      {formatText(result.explanation)}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="space-y-2.5">
                                {result.leads?.map((lead, idx) => (
                                  <LeadCard key={idx} lead={lead} onSave={saveLead} onExpand={setSelectedLead} onFetchNews={() => setSelectedLead(lead)} index={idx} />
                                ))}
                              </div>

                              {result.followUps && result.followUps.length > 0 && rIdx === thread.length - 1 && (
                                <div className="pt-6">
                                  <span className="text-[10px] font-bold uppercase text-slate-300 tracking-[0.25em] block mb-4 px-1">Deepen Search</span>
                                  <div className="flex flex-col gap-2">
                                    {result.followUps.map((fu, i) => (
                                      <button key={i} onClick={() => handleSearch(fu)} className="px-5 py-3.5 text-left glass rounded-2xl text-[14px] font-bold text-slate-600 hover:text-slate-900 border border-black/[0.01] transition-all bouncy-tap shadow-sm flex items-center justify-between">
                                        <span className="truncate pr-4">{fu}</span>
                                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : isTextMode ? (
                            <div className="space-y-5 px-1 pop-in">
                              <h2 className="text-[20px] font-bold text-slate-900 tracking-tight leading-snug">{formatText(result.summary || '')}</h2>
                              <div className="space-y-4">
                                {result.paragraphs?.map((para, idx) => (
                                  <div key={idx} className="text-[15px] text-slate-600 font-medium leading-relaxed">{formatText(para)}</div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="py-12 text-center glass rounded-[32px] border border-black/[0.01]">
                              <p className="text-[14px] font-bold text-slate-500 mb-6 px-8">{result.outOfContextMessage || "I couldn't find matches for this request."}</p>
                              <button onClick={startNewChat} className="px-8 py-2.5 rounded-full bg-slate-900 text-white text-[12px] font-bold bouncy-tap shadow-xl">Start New Search</button>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === View.SAVED_LIST && (
          <div className="pop-in pb-12">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView(View.HOME)} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors bouncy-tap">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">Research Vault</h1>
            </div>
            
            {savedLeads.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-[15px] font-bold text-slate-400">Vault empty.</p>
                <button onClick={() => setView(View.HOME)} className="mt-4 text-[13px] font-bold text-slate-900 underline underline-offset-4">Start finding leads</button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedLeads.map((lead, idx) => (
                  <LeadCard key={idx} lead={lead} onSave={() => {}} onExpand={setSelectedLead} onFetchNews={() => {}} index={idx} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <SearchBar onSearch={handleSearch} isLoading={isLoading} isExpanded={!!selectedLead} />

      {selectedLead && (
        <div 
          className="fixed inset-0 z-[110] flex items-end justify-center p-4 bg-black/[0.04] backdrop-blur-[6px] animate-in fade-in duration-500"
          onClick={() => setSelectedLead(null)}
        >
          <div 
            className="w-full max-w-md glass bg-white/98 border border-black/[0.04] shadow-2xl dossier-panel overflow-hidden flex flex-col spring-transition max-h-[88vh] mb-4 pop-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 pb-4 flex justify-between items-start sticky top-0 z-20 bg-white/90 backdrop-blur-xl">
              <div className="flex-1 min-w-0 pr-8">
                <h2 className="text-[24px] font-black text-slate-900 leading-tight tracking-tight">{selectedLead.name}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-black/[0.01]">
                    {selectedLead.industry}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    {selectedLead.location}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-300 hover:text-slate-900 transition-all bouncy-tap bg-slate-50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-12 scroll-container space-y-8 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 glass-card rounded-[24px] shadow-sm">
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-300 mb-2 block">Match Score</span>
                  <span className="text-[28px] font-black text-emerald-500 leading-none">{Math.round(selectedLead.matchScore)}%</span>
                </div>
                <div className="p-4 glass-card rounded-[24px] shadow-sm">
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-300 mb-2 block">Market Heat</span>
                  <span className="text-[28px] font-black text-orange-500/80 leading-none">{Math.round(selectedLead.marketHeat)}%</span>
                </div>
              </div>

              <section>
                <h4 className="text-[10px] font-bold uppercase text-slate-300 mb-4 tracking-[0.3em] pl-1">Overview</h4>
                <div className="glass-card rounded-[24px] p-5">
                  <div className="text-[14px] text-slate-700 font-medium leading-relaxed">
                    {formatText(selectedLead.detailedBriefing?.overview || selectedLead.description)}
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-bold uppercase text-slate-300 mb-4 tracking-[0.3em] pl-1">Contact Methods</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Website', value: selectedLead.website, icon: 'Website' },
                    { label: 'Email', value: selectedLead.email, icon: 'Email' },
                    { label: 'Phone', value: selectedLead.phone, icon: 'Phone' },
                    { label: 'LinkedIn', value: selectedLead.socials?.linkedin, icon: 'LinkedIn' },
                    { label: 'Instagram', value: selectedLead.socials?.instagram, icon: 'Instagram' },
                    { label: 'Twitter', value: selectedLead.socials?.twitter, icon: 'Twitter' }
                  ].map((item, i) => (
                    <button 
                      key={i} 
                      onClick={() => item.value && openContact(item.label, item.value)}
                      className={`text-left p-4 glass-card rounded-[24px] bouncy-tap flex flex-col justify-between h-24 transition-all shadow-sm ${!item.value ? 'opacity-25 grayscale cursor-default' : 'hover:border-slate-200'}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{item.label}</span>
                        {item.value && <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>}
                      </div>
                      <p className={`text-[12px] font-bold truncate mt-2 ${item.value ? 'text-slate-800' : 'text-slate-300'}`}>{item.value || 'N/A'}</p>
                    </button>
                  ))}
                </div>
              </section>

              {selectedLead.keyPeople && selectedLead.keyPeople.length > 0 && (
                <section>
                  <h4 className="text-[10px] font-bold uppercase text-slate-300 mb-4 tracking-[0.3em] pl-1">Key People</h4>
                  <div className="space-y-2.5">
                    {selectedLead.keyPeople.map((person, i) => (
                      <div key={i} className="glass-card rounded-[24px] p-5 flex justify-between items-center transition-all shadow-sm">
                        <div className="min-w-0 pr-4">
                          <p className="text-[15px] font-bold text-slate-900 leading-none mb-2">{person.name}</p>
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{person.role}</p>
                        </div>
                        <div className="flex gap-2">
                          {person.linkedin && (
                            <button onClick={() => openContact('LinkedIn', person.linkedin!)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-500 transition-all bouncy-tap shadow-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" /></svg>
                            </button>
                          )}
                          {person.email && (
                            <button onClick={() => openContact('Email', person.email!)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-emerald-500 transition-all bouncy-tap shadow-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h4 className="text-[10px] font-bold uppercase text-emerald-500 mb-5 tracking-[0.3em] pl-1">Momentum Signals</h4>
                <div className="space-y-4">
                  {selectedLead.growthSignals?.map((signal, i) => (
                    <div key={i} className="relative pl-5 border-l-2 border-emerald-100 py-1">
                      <p className="text-[14px] font-bold text-slate-800 leading-snug mb-1">{formatText(signal.activity)}</p>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{signal.date}</p>
                    </div>
                  ))}
                  {!selectedLead.growthSignals?.length && <p className="text-[12px] font-bold text-slate-300 italic">No recent signals.</p>}
                </div>
              </section>
            </div>
            
            {!isSaved && view !== View.SAVED_LIST && (
              <div className="p-6 pt-3 bg-white/95 backdrop-blur-2xl border-t border-black/[0.02]">
                <button 
                  onClick={() => { saveLead(selectedLead); setSelectedLead(null); }}
                  className="w-full py-4 rounded-[24px] bg-slate-900 text-white font-bold text-[14px] bouncy-tap shadow-2xl flex items-center justify-center gap-3"
                >
                  Archive to Research Vault
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Sidebar isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} side="right" title="Account Settings">
        <div className="space-y-3">
          <button 
            onClick={() => { setView(View.SAVED_LIST); setIsAccountOpen(false); }}
            className="w-full text-left p-5 rounded-[24px] glass-card hover:bg-white border border-black/[0.02] transition-all bouncy-tap shadow-sm"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[14px] font-bold text-slate-800">Archived Leads</p>
                <p className="text-[10px] font-bold text-slate-300 uppercase mt-1 tracking-widest">{savedLeads.length} items preserved</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          </button>
        </div>
      </Sidebar>

      <Sidebar isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} side="left" title="Intelligence Logs" onNewSearch={startNewChat}>
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="py-12 text-center opacity-30">
              <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Logs Empty</p>
            </div>
          ) : (
            history.map((item) => (
              <button key={item.id} onClick={() => restoreHistory(item)} className="w-full text-left p-4 rounded-[24px] glass-card hover:bg-white border border-black/[0.02] transition-all bouncy-tap shadow-sm">
                <p className="text-[14px] font-bold text-slate-800 truncate mb-1">{item.query}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </Sidebar>
    </div>
  );
};

export default App;