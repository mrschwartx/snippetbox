import {
  Validator,
  maxChars,
  notBlank,
  permittedValue,
} from "@/shared/kernel/validation";
import { PERMITTED_EXPIRES, addDays } from "./expiry";
import type { NewSnippet } from "./snippet";

export const TITLE_MAX_LENGTH = 100;

export interface SnippetDraft {
  title: string;
  content: string;
  expires: number;
}

export const validateSnippetDraft = (draft: SnippetDraft): Validator => {
  const validator = new Validator();
  validator.check(notBlank(draft.title), "title", "This field cannot be blank");
  validator.check(
    maxChars(draft.title, TITLE_MAX_LENGTH),
    "title",
    "This field cannot be more than 100 characters long",
  );
  validator.check(
    notBlank(draft.content),
    "content",
    "This field cannot be blank",
  );
  validator.check(
    permittedValue(draft.expires, PERMITTED_EXPIRES),
    "expires",
    "This field must equal 1, 7 or 365",
  );
  return validator;
};

export const publishSnippet = (draft: SnippetDraft, now: Date): NewSnippet => {
  validateSnippetDraft(draft).assertValid();
  return {
    title: draft.title,
    content: draft.content,
    created: now,
    expires: addDays(now, draft.expires),
  };
};
