"use client";

import { useState, type FormEvent } from "react";
import type { EntryData } from "@/lib/types";
import { formatDate } from "@/lib/format";
import ReplyItem from "./ReplyItem";
import ReplyForm from "./ReplyForm";

interface EntryCardProps {
  entry: EntryData;
  index: number;
  isAdmin: boolean;
  onChanged: () => void;
}

type Mode = "view" | "edit" | "delete";

const TONE_STYLES = [
  "border-pink-100 bg-white",
  "border-pink-200 bg-pink-50/70",
  "border-rose-200 bg-rose-50/70",
];

export default function EntryCard({ entry, index, isAdmin, onChanged }: EntryCardProps) {
  const [mode, setMode] = useState<Mode>("view");
  const [name, setName] = useState(entry.name);
  const [content, setContent] = useState(entry.content);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [adminDeleting, setAdminDeleting] = useState(false);

  const toneClass = TONE_STYLES[index % TONE_STYLES.length];

  function cancel() {
    setMode("view");
    setName(entry.name);
    setContent(entry.content);
    setPassword("");
    setError(null);
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "수정에 실패했습니다.");
        return;
      }
      setPassword("");
      setMode("view");
      onChanged();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDelete(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      onChanged();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function adminDelete() {
    if (!confirm("이 글과 답글을 관리자 권한으로 삭제할까요?")) return;
    setAdminDeleting(true);
    try {
      const res = await fetch(`/api/admin/entries/${entry.id}`, { method: "DELETE" });
      if (res.ok) onChanged();
    } finally {
      setAdminDeleting(false);
    }
  }

  return (
    <div className={`rounded-lg border p-4 shadow-sm shadow-pink-100/50 ${toneClass}`}>
      {mode === "view" && (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-pink-700">{entry.name}</span>
            <span className="text-xs text-pink-400/80">
              {formatDate(entry.createdAt)}
              {entry.updatedAt && " (수정됨)"}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{entry.content}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <button onClick={() => setMode("edit")} className="text-pink-600 hover:text-pink-700 hover:underline">
              수정
            </button>
            <button onClick={() => setMode("delete")} className="text-rose-600 hover:text-rose-700 hover:underline">
              삭제
            </button>
            <button
              onClick={() => setShowReplyForm((v) => !v)}
              className="text-fuchsia-600 hover:text-fuchsia-700 hover:underline"
            >
              {showReplyForm ? "답글 취소" : "답글 달기"}
            </button>
            {isAdmin && (
              <button onClick={adminDelete} disabled={adminDeleting} className="text-rose-800 hover:underline">
                {adminDeleting ? "삭제 중..." : "관리자 삭제"}
              </button>
            )}
          </div>
        </>
      )}

      {mode === "edit" && (
        <form onSubmit={submitEdit} className="space-y-2">
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            required
            className="w-full rounded border border-pink-200 px-2 py-1 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            required
            rows={3}
            className="w-full rounded border border-pink-200 px-2 py-1 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="w-full rounded border border-pink-200 px-2 py-1 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-gradient-to-r from-pink-500 to-rose-500 px-3 py-1 text-sm text-white hover:from-pink-600 hover:to-rose-600 disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded border border-pink-200 px-3 py-1 text-sm text-pink-700 hover:bg-pink-50"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {mode === "delete" && (
        <form onSubmit={submitDelete} className="space-y-2">
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <p className="text-sm text-gray-700">삭제하려면 비밀번호를 입력하세요.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="w-full rounded border border-pink-200 px-2 py-1 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded border border-pink-200 px-3 py-1 text-sm text-pink-700 hover:bg-pink-50"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {entry.replies.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-pink-100 pl-4 pt-3">
          {entry.replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} isAdmin={isAdmin} onChanged={onChanged} />
          ))}
        </div>
      )}

      {showReplyForm && (
        <div className="mt-3 pl-4">
          <ReplyForm
            entryId={entry.id}
            onCreated={() => {
              setShowReplyForm(false);
              onChanged();
            }}
          />
        </div>
      )}
    </div>
  );
}
