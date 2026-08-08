"use client";

import { useState, type FormEvent } from "react";
import CaptchaField from "./CaptchaField";

interface EntryFormProps {
  onCreated: () => void;
}

export default function EntryForm({ onCreated }: EntryFormProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content, password, captchaToken, captchaAnswer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "등록에 실패했습니다.");
        setCaptchaKey((k) => k + 1);
        return;
      }
      setName("");
      setContent("");
      setPassword("");
      setCaptchaKey((k) => k + 1);
      onCreated();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-pink-200 bg-white/90 p-4 shadow-sm shadow-pink-100"
    >
      <h2 className="text-lg font-semibold text-pink-700">방명록 남기기</h2>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="이름 또는 별명"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          required
          className="rounded border border-pink-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
        <input
          type="password"
          placeholder="비밀번호 (4자 이상, 수정/삭제 시 필요)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={4}
          maxLength={72}
          required
          className="rounded border border-pink-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
      </div>
      <textarea
        placeholder="방명록 내용을 남겨주세요"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        required
        rows={3}
        className="w-full rounded border border-pink-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CaptchaField
          key={captchaKey}
          answer={captchaAnswer}
          onAnswerChange={setCaptchaAnswer}
          onTokenChange={setCaptchaToken}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-pink-200 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50"
        >
          {submitting ? "등록 중..." : "등록"}
        </button>
      </div>
    </form>
  );
}
