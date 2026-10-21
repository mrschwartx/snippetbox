export const LATEST_SNIPPETS_LIMIT = 10;

export interface SnippetProps {
  id: number;
  title: string;
  content: string;
  created: Date;
  expires: Date;
}

export interface NewSnippet {
  title: string;
  content: string;
  created: Date;
  expires: Date;
}

export interface SnippetDto {
  id: number;
  title: string;
  content: string;
  created: string;
  expires: string;
}

export class Snippet {
  private constructor(
    readonly id: number,
    readonly title: string,
    readonly content: string,
    readonly created: Date,
    readonly expires: Date,
  ) {}

  static restore(props: SnippetProps): Snippet {
    return new Snippet(
      props.id,
      props.title,
      props.content,
      props.created,
      props.expires,
    );
  }

  isExpiredAt(now: Date): boolean {
    return this.expires.getTime() <= now.getTime();
  }
}

export const toSnippetDto = (snippet: Snippet): SnippetDto => ({
  id: snippet.id,
  title: snippet.title,
  content: snippet.content,
  created: snippet.created.toISOString(),
  expires: snippet.expires.toISOString(),
});
