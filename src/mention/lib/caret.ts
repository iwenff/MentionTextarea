import { CARET_X_OFFSET_PX, CARET_Y_OFFSET_PX } from "../models/constants";

export function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  caretIndex: number
): { left: number; top: number } {
  const safeCaret = Math.max(0, Math.min(caretIndex, textarea.value.length));
  const valueBefore = textarea.value.slice(0, safeCaret);
  const valueAfter = textarea.value.slice(safeCaret);

  const textareaRect = textarea.getBoundingClientRect();
  const computed = window.getComputedStyle(textarea);

  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.top = `${textareaRect.top}px`;
  div.style.left = `${textareaRect.left}px`;
  div.style.width = `${textareaRect.width}px`;
  div.style.height = `${textareaRect.height}px`;
  div.style.overflow = "hidden";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.overflowWrap = "break-word";
  div.style.pointerEvents = "none";
  div.style.boxSizing = "border-box";

  div.style.fontFamily = computed.fontFamily;
  div.style.fontSize = computed.fontSize;
  div.style.fontWeight = computed.fontWeight;
  div.style.letterSpacing = computed.letterSpacing;
  div.style.lineHeight = computed.lineHeight;

  div.style.paddingTop = computed.paddingTop;
  div.style.paddingRight = computed.paddingRight;
  div.style.paddingBottom = computed.paddingBottom;
  div.style.paddingLeft = computed.paddingLeft;

  div.scrollTop = textarea.scrollTop;
  div.scrollLeft = textarea.scrollLeft;

  const marker = document.createElement("span");
  marker.textContent = "\u200b";

  div.appendChild(document.createTextNode(valueBefore));
  div.appendChild(marker);
  div.appendChild(document.createTextNode(valueAfter));

  document.body.appendChild(div);
  const markerRect = marker.getBoundingClientRect();
  document.body.removeChild(div);

  const left = markerRect.left - textareaRect.left + CARET_X_OFFSET_PX;
  const top = markerRect.bottom - textareaRect.top + CARET_Y_OFFSET_PX;
  return { left, top };
}
