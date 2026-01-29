
import React from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  children: React.ReactNode;
  title: string;
  onNewSearch?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, side, children, title, onNewSearch }) => {
  const sideClass = side === 'left' 
    ? (isOpen ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0 pointer-events-none') 
    : (isOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0 pointer-events-none');

  const alignmentClass = side === 'left' ? 'left-2.5' : 'right-2.5';

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/5 backdrop-blur-[1px] z-[60] transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div 
        className={`fixed top-2.5 bottom-2.5 w-[280px] max-w-[85vw] ${alignmentClass} z-[70] glass shadow-2xl sidebar-transition ${sideClass} flex flex-col border border-black/[0.04] rounded-[24px] overflow-hidden`}
      >
        <div className="p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
             <button onClick={onClose} className="p-2 -ml-2 text-slate-300 hover:text-slate-900 transition-colors bouncy-tap">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {onNewSearch && (
            <button 
              onClick={() => { onNewSearch(); onClose(); }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-bold text-[12px] bouncy-tap shadow-lg"
            >
              New search
            </button>
          )}

          <h2 className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.25em] pl-1">{title}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto scroll-container px-4 pb-6">
          {children}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
