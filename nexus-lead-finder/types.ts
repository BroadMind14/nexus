export enum AppMode {
  LEAD = 'LEAD',
  TEXT = 'TEXT',
  OUT_OF_CONTEXT = 'OUT_OF_CONTEXT'
}

export interface Socials {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
}

export interface KeyPerson {
  name: string;
  role: string;
  email?: string;
  linkedin?: string;
  instagram?: string;
  phone?: string;
}

export interface GrowthSignal {
  activity: string;
  date: string;
}

export interface Lead {
  name: string;
  description: string;
  location: string;
  industry: string;
  website?: string;
  email?: string;
  phone?: string;
  socials?: Socials;
  keyPeople?: KeyPerson[];
  growthSignals?: GrowthSignal[];
  matchScore: number;
  marketHeat: number;
  type: 'person' | 'company';
  detailedBriefing?: {
    overview: string;
    background: string;
    context: string;
  };
}

export interface SearchResult {
  mode: AppMode;
  summary?: string;
  paragraphs?: string[];
  leads?: Lead[];
  explanation?: string;
  outOfContextMessage?: string;
  query: string;
  followUps?: string[];
}

export interface SavedLead extends Lead {
  savedAt: number;
}

export interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
  result: SearchResult;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}