import type { Entry, Reply } from "@prisma/client";

export function serializeReply(reply: Reply) {
  return {
    id: reply.id,
    entryId: reply.entryId,
    name: reply.name,
    content: reply.content,
    createdAt: reply.createdAt,
    updatedAt: reply.updatedAt,
  };
}

export function serializeEntry(entry: Entry & { replies?: Reply[] }) {
  return {
    id: entry.id,
    name: entry.name,
    content: entry.content,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    replies: entry.replies ? entry.replies.map(serializeReply) : [],
  };
}
