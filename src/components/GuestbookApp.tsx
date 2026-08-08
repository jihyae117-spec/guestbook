"use client";

import { useCallback, useEffect, useState } from "react";
import type { EntryData } from "@/lib/types";
import EntryForm from "./EntryForm";
import EntryCard from "./EntryCard";
import Pagination from "./Pagination";

export default function GuestbookApp() {
  const [entries, setEntries] = useState<EntryData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);

  const loadEntries = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/entries?page=${targetPage}`);
      const data = await res.json();
      setEntries(data.entries);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAdmin = useCallback(async () => {
    const res = await fetch("/api/admin/me");
    const data = await res.json();
    setIsAdmin(!!data.admin);
    setAdminUsername(data.admin?.username ?? null);
  }, []);

  useEffect(() => {
    loadEntries(1);
    loadAdmin();
  }, [loadEntries, loadAdmin]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
    setAdminUsername(null);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="bg-gradient-to-r from-pink-600 via-rose-500 to-fuchsia-600 bg-clip-text text-3xl font-extrabold text-transparent">
          방명록
        </h1>
        {isAdmin ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-pink-700/80">관리자: {adminUsername}</span>
            <a href="/api/admin/export" className="font-medium text-fuchsia-600 hover:text-fuchsia-700 hover:underline">
              엑셀로 내보내기
            </a>
            <button onClick={handleLogout} className="text-pink-600 hover:text-pink-700 hover:underline">
              로그아웃
            </button>
          </div>
        ) : (
          <a href="/admin" className="text-sm text-pink-600 hover:text-pink-700 hover:underline">
            관리자 로그인
          </a>
        )}
      </header>

      <EntryForm onCreated={() => loadEntries(1)} />

      {loading ? (
        <p className="text-center text-sm text-pink-400/80">불러오는 중...</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-sm text-pink-400/80">아직 남겨진 글이 없어요. 첫 글을 남겨보세요!</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              index={index}
              isAdmin={isAdmin}
              onChanged={() => loadEntries(page)}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={(p) => loadEntries(p)} />
    </div>
  );
}
