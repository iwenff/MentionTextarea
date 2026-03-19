import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import styles from "./MentionTextarea.module.css";
import type { MentionState, MentionUser } from "./models/types";
import { MAX_DROPDOWN_ITEMS, DROPDOWN_WIDTH_PX } from "./models/constants";
import { filterUsers, getMentionContext } from "./models/mention";
import { getCaretCoordinates } from "./lib/caret";

export default function MentionTextarea({
  users,
  placeholder,
}: {
  users: MentionUser[];
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [mention, setMention] = useState<Omit<
    MentionState,
    "activeIndex"
  > | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectingRef = useRef(false);

  const close = useCallback(() => {
    setMention(null);
    setActiveIndex(0);
  }, []);

  const renderHighlighted = (text: string, query: string) => {
    const trimmedQueryText = query.trim();
    if (!trimmedQueryText) return text;

    const lowerText = text.toLowerCase();
    const lowerQueryText = trimmedQueryText.toLowerCase();

    const out: ReactNode[] = [];
    let scanPosition = 0;

    while (scanPosition < text.length) {
      const matchIndex = lowerText.indexOf(lowerQueryText, scanPosition);
      if (matchIndex === -1) {
        out.push(text.slice(scanPosition));
        break;
      }

      if (matchIndex > scanPosition)
        out.push(text.slice(scanPosition, matchIndex));
      out.push(
        <span
          key={`${matchIndex}-${out.length}`}
          className={styles.mentionHighlight}
        >
          {text.slice(matchIndex, matchIndex + trimmedQueryText.length)}
        </span>
      );
      scanPosition = matchIndex + trimmedQueryText.length;
    }

    return <>{out}</>;
  };

  const computeMentionState = useCallback(
    (
      textareaEl: HTMLTextAreaElement,
      wrapperEl: HTMLDivElement
    ): Omit<MentionState, "activeIndex"> | null => {
      const caretIndex = textareaEl.selectionStart ?? 0;
      const context = getMentionContext(textareaEl.value, caretIndex);
      if (!context) return null;

      const items = filterUsers(users, context.query).slice(
        0,
        MAX_DROPDOWN_ITEMS
      );
      const caret = getCaretCoordinates(textareaEl, caretIndex);
      const wrapperRect = wrapperEl.getBoundingClientRect();

      const caretLeft = Math.max(
        0,
        Math.min(caret.left, wrapperRect.width - DROPDOWN_WIDTH_PX)
      );
      const caretTop = Math.max(0, caret.top);

      return {
        context,
        items,
        caretLeft,
        caretTop,
      };
    },
    [users]
  );

  const mentionWithActiveIndex = useMemo(() => {
    if (!mention) return null;

    return {
      ...mention,
      activeIndex: Math.min(activeIndex, Math.max(0, mention.items.length - 1)),
    };
  }, [mention, activeIndex]);

  const syncMention = useCallback(() => {
    const textareaEl = textareaRef.current;
    const wrapperEl = wrapperRef.current;
    if (!textareaEl || !wrapperEl) return;

    const next = computeMentionState(textareaEl, wrapperEl);

    setMention((prev) => {
      if (!next) {
        setActiveIndex(0);
        return null;
      }

      if (!prev) {
        setActiveIndex(0);
        return next;
      }

      const sameStart = prev.context.start === next.context.start;
      const sameQuery = prev.context.query === next.context.query;

      if (!sameStart || !sameQuery) {
        setActiveIndex(0);
        return next;
      }

      return next;
    });
  }, [computeMentionState]);

  const moveActive = useCallback(
    (delta: number) => {
      setActiveIndex((prev) => {
        const itemsLength = mention?.items.length ?? 0;
        if (itemsLength === 0) return prev;

        return Math.max(0, Math.min(itemsLength - 1, prev + delta));
      });
    },
    [mention]
  );

  const insertMention = useCallback(
    (selected: MentionUser) => {
      const textareaEl = textareaRef.current;
      const currentMention = mentionWithActiveIndex;
      if (!textareaEl || !currentMention) return;

      const caretIndex = textareaEl.selectionStart ?? 0;
      const start = currentMention.context.start;

      const nextValue =
        textareaEl.value.slice(0, start) +
        "@" +
        selected.username +
        textareaEl.value.slice(caretIndex);
      const nextCaret = start + 1 + selected.username.length;

      setValue(nextValue);
      close();

      requestAnimationFrame(() => {
        textareaEl.focus();
        textareaEl.setSelectionRange(nextCaret, nextCaret);
      });
      selectingRef.current = false;
    },
    [mentionWithActiveIndex, close]
  );

  useEffect(() => {
    if (!mention) return;

    const textareaEl = textareaRef.current;
    const wrapperEl = wrapperRef.current;
    if (!textareaEl || !wrapperEl) return;

    const onDocumentMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (target && wrapperEl.contains(target)) return;
      close();
    };

    const onDocumentMouseUp = () => {
      selectingRef.current = false;
    };

    const onScrollOrResize = () => syncMention();

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("mouseup", onDocumentMouseUp);
    textareaEl.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("mouseup", onDocumentMouseUp);
      textareaEl.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [mention, close, syncMention]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionWithActiveIndex) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }

    if (mentionWithActiveIndex.items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
      return;
    }

    if (e.key === "Enter") {
      const user =
        mentionWithActiveIndex.items[mentionWithActiveIndex.activeIndex];
      if (user) {
        e.preventDefault();
        insertMention(user);
      }
    }
  };

  return (
    <div className={styles.mentionWrapper} ref={wrapperRef}>
      <textarea
        ref={textareaRef}
        className={styles.mentionTextarea}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          requestAnimationFrame(() => syncMention());
        }}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => {
          if (
            e.key === "ArrowDown" ||
            e.key === "ArrowUp" ||
            e.key === "Enter" ||
            e.key === "Escape"
          ) {
            return;
          }

          syncMention();
        }}
        onClick={() => syncMention()}
        onSelect={() => {
          const textareaEl = textareaRef.current;
          if (!textareaEl) return;

          if (textareaEl.selectionStart !== textareaEl.selectionEnd) {
            syncMention();
          }
        }}
        onBlur={() => {
          if (selectingRef.current) return;
          close();
        }}
      />

      {mentionWithActiveIndex && (
        <div
          className={styles.mentionDropdown}
          style={{
            left: mentionWithActiveIndex.caretLeft,
            top: mentionWithActiveIndex.caretTop,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            selectingRef.current = true;
          }}
          role="listbox"
          aria-label="User mentions"
        >
          <div className={styles.mentionDropdownHeader}>Упоминания</div>
          <div className={styles.mentionDropdownList}>
            {mentionWithActiveIndex.items.length === 0 ? (
              <div className={styles.mentionEmpty}>Ничего не найдено</div>
            ) : (
              mentionWithActiveIndex.items.map((u, idx) => (
                <div
                  key={u.id}
                  className={
                    idx === mentionWithActiveIndex.activeIndex
                      ? `${styles.mentionItem} ${styles.mentionItemActive}`
                      : styles.mentionItem
                  }
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectingRef.current = true;
                  }}
                  onClick={() => insertMention(u)}
                  role="option"
                  aria-selected={idx === mentionWithActiveIndex.activeIndex}
                >
                  <div className={styles.mentionItemTop}>
                    <span className={styles.mentionItemUsername}>
                      @
                      {renderHighlighted(
                        u.username,
                        mentionWithActiveIndex.context.query
                      )}
                    </span>
                  </div>
                  <div className={styles.mentionItemFio}>
                    {renderHighlighted(
                      u.fio,
                      mentionWithActiveIndex.context.query
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
