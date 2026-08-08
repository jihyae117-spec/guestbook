export interface ReplyData {
  id: number;
  entryId: number;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface EntryData {
  id: number;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  replies: ReplyData[];
}
