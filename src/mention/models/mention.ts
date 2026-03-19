import type { MentionContext, MentionUser } from "./types";

function normalizeQuery(s: string) {
  return s.trim().toLowerCase();
}

export function getMentionContext(
  value: string,
  caretIndex: number
): MentionContext {
  const safeCaret = Math.max(0, Math.min(caretIndex, value.length));
  const left = value.slice(0, safeCaret);
  const at = left.lastIndexOf("@");
  if (at === -1) return null;

  const query = left.slice(at + 1);
  if (/\s/.test(query)) return null;

  if (at > 0) {
    const prev = left[at - 1];
    if (/[a-zA-Z0-9_]/.test(prev)) return null;
  }

  return { start: at, query };
}

export function filterUsers(users: MentionUser[], query: string) {
  const normalizedQueryText = normalizeQuery(query);
  if (!normalizedQueryText) return users;

  return users.filter((u) => {
    const fio = u.fio.toLowerCase();
    const username = u.username.toLowerCase();
    return (
      fio.includes(normalizedQueryText) ||
      username.includes(normalizedQueryText)
    );
  });
}
