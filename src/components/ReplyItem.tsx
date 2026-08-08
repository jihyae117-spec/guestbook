"use client";

import { useState, type FormEvent } from "react";
import type { ReplyData } from "@/lib/types";
import { formatDate } from "@/lib/format";

interface ReplyItemProps {
  reply: ReplyData;
  isAdmin: boolean;
  onChanged: () => void;
}

type Mode = "view" | "edit" | "delete";

export default function ReplyItem({ reply, isAdmin, onChanged }: ReplyItemProps) {
  const [mode, setMode] = useState<Mode>("view");
  const [name, setName] = useState(reply.name);
  const [content, setContent] = useState(reply.content);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminDeleting, setAdminDeleting] = useState(false);

  function cancel() {
    setMode("view");
    setName(reply.name);
    setContent(reply.content);
    setPassword("");
    setError(null);
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/replies/${reply.id}`, {
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
      const res = await fetch(`/api/replies/${reply.id}`, {
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
    if (!confirm("이 답글을 관리자 권한으로 삭제할까요?")) return;
    setAdminDeleting(true);
    try {
      const res = await fetch(`/api/admin/replies/${reply.id}`, { method: "DELETE" });
      if (res.ok) onChanged();
    } finally {
      setAdminDeleting(false);
    }
  }

  return (
    <div className="rounded border border-pink-100 bg-gradient-to-br from-pink-50/60 to-rose-50/40 p-3">
      {mode === "view" && (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-pink-700">{reply.name}</span>
            <span className="text-xs text-pink-400/80">
              {formatDate(reply.createdAt)}
              {reply.updatedAt && " (수정됨)"}
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{reply.content}</p>
          <div className="mt-2 flex gap-3 text-xs">
            <button onClick={() => setMode("edit")} className="text-pink-600 hover:text-pink-700 hover:underline">
              수정
            </button>
            <button onClick={() => setMode("delete")} className="text-rose-600 hover:text-rose-700 hover:underline">
              삭제
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
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            required
            className="w-full rounded border border-pink-200 bg-white px-2 py-1 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={300}
            required
            rows={2}
            className="w-full rounded border border-pink-200 bg-white px-2 py-1 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="w-full rounded border border-pink-200 bg-white px-2 py-1 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-gradient-to-r from-pink-500 to-rose-500 px-3 py-1 text-xs text-white hover:from-pink-600 hover:to-rose-600 disabled:opacity-50"
            >
              저장
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded border border-pink-200 bg-white px-3 py-1 text-xs text-pink-700 hover:bg-pink-50"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {mode === "delete" && (
        <form onSubmit={submitDelete} className="space-y-2">
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="w-full rounded border border-pink-200 bg-white px-2 py-1 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-700 disabled:opacity-50"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded border border-pink-200 bg-white px-3 py-1 text-xs text-pink-700 hover:bg-pink-50"
            >
              취소
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
