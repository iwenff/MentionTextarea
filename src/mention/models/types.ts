export type MentionUser = {
  id: string;
  username: string;
  fio: string;
};

export type MentionContext = {
  start: number;
  query: string;
} | null;

export type MentionState = {
  context: Exclude<MentionContext, null>;
  items: MentionUser[];
  activeIndex: number;
  caretLeft: number;
  caretTop: number;
};
