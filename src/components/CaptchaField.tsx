"use client";

import { useCallback, useEffect, useState } from "react";

interface CaptchaFieldProps {
  answer: string;
  onAnswerChange: (value: string) => void;
  onTokenChange: (token: string) => void;
}

export default function CaptchaField({ answer, onAnswerChange, onTokenChange }: CaptchaFieldProps) {
  const [question, setQuestion] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchCaptcha = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/captcha");
      const data = await res.json();
      setQuestion(data.question);
      onTokenChange(data.token);
      onAnswerChange("");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-sm text-pink-700/80">{question || "로딩중..."}</span>
      <input
        type="text"
        inputMode="numeric"
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder="정답"
        required
        className="w-16 rounded border border-pink-200 px-2 py-1 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200"
      />
      <button
        type="button"
        onClick={fetchCaptcha}
        disabled={loading}
        className="text-xs text-pink-600 underline hover:text-pink-700 disabled:opacity-50"
      >
        새 문제
      </button>
    </div>
  );
}
