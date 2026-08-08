interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

// 인메모리 저장소이므로 단일 서버 인스턴스 기준으로만 동작한다.
// 재배포/재시작 시 초기화되며, 서버가 여러 대로 확장되면 별도 저장소(Redis 등)가 필요하다.
function hit(key: string, windowMs: number, max: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterMs: windowMs - (now - bucket.windowStart) };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/** 글/답글 작성 시 도배 방지: 짧은 쿨다운 + 분당 최대 횟수를 함께 검사한다. */
export function checkPostRateLimit(ip: string, scope: "entry" | "reply"): { allowed: boolean; retryAfterMs: number } {
  const cooldown = hit(`${scope}:cooldown:${ip}`, 10_000, 1);
  if (!cooldown.allowed) return cooldown;

  const burst = hit(`${scope}:burst:${ip}`, 60_000, 5);
  return burst;
}

const PASSWORD_FAIL_WINDOW_MS = 5 * 60 * 1000;
const PASSWORD_FAIL_MAX = 5;
const passwordFailBuckets = new Map<string, Bucket>();

export function isPasswordLocked(target: string): { locked: boolean; retryAfterMs: number } {
  const bucket = passwordFailBuckets.get(target);
  if (!bucket) return { locked: false, retryAfterMs: 0 };
  const now = Date.now();
  if (now - bucket.windowStart > PASSWORD_FAIL_WINDOW_MS) {
    passwordFailBuckets.delete(target);
    return { locked: false, retryAfterMs: 0 };
  }
  if (bucket.count >= PASSWORD_FAIL_MAX) {
    return { locked: true, retryAfterMs: PASSWORD_FAIL_WINDOW_MS - (now - bucket.windowStart) };
  }
  return { locked: false, retryAfterMs: 0 };
}

export function recordPasswordFailure(target: string): void {
  const now = Date.now();
  const bucket = passwordFailBuckets.get(target);
  if (!bucket || now - bucket.windowStart > PASSWORD_FAIL_WINDOW_MS) {
    passwordFailBuckets.set(target, { count: 1, windowStart: now });
    return;
  }
  bucket.count += 1;
}

export function resetPasswordFailures(target: string): void {
  passwordFailBuckets.delete(target);
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
