import React from 'react';
import { Lead } from '../types';

interface LeadCardProps {
  lead: Lead;
  onSave: (lead: Lead) => void;
  onExpand: (lead: Lead) => void;
  onFetchNews: (lead: Lead) => void;
  index?: number;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onSave, onExpand, onFetchNews, index = 0 }) => {
  return (
    <div 
      onClick={() => onExpand(lead)}
      style={{ animationDelay: `${index * 60}ms` }}
      className="glass-card rounded-2xl p-4 mb-3 spring-transition bouncy-tap cursor-pointer w-full border border-black/[0.015] animate-card-entry shadow-sm hover:shadow-md"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${lead.type === 'company' ? 'bg-indigo-50/60 text-indigo-500' : 'bg-emerald-50/60 text-emerald-500'}`}>
            {lead.type === 'company' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-8h1m-1 4h1m-1 4h1" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="truncate">
            <h3 className="text-[15px] font-bold text-slate-800 truncate tracking-tight leading-none">{lead.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-1.5">{lead.industry}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={(e) => { e.stopPropagation(); onSave(lead); }}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-200 hover:text-emerald-500 hover:bg-emerald-50 transition-all bouncy-tap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
      
      <p className="text-[13px] text-slate-500 leading-normal mb-3.5 font-medium line-clamp-2">
        {lead.description}
      </p>
      
      <div className="flex items-center gap-5 pt-1 border-t border-black/[0.01]">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase text-slate-300 tracking-[0.12em] mb-0.5">Match</span>
          <span className="text-[14px] font-extrabold text-emerald-500 leading-none">{Math.round(lead.matchScore)}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase text-slate-300 tracking-[0.12em] mb-0.5">Growth</span>
          <span className="text-[14px] font-extrabold text-orange-500/80 leading-none">{Math.round(lead.marketHeat)}%</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-slate-300">
           <span className="text-[9px] font-bold uppercase tracking-widest">{lead.location}</span>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;