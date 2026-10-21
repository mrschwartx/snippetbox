import type { SnippetDto } from "../domain/snippet";
import { humanDate } from "./format";

export function SnippetCard({ snippet }: { snippet: SnippetDto }) {
  return (
    <div className="snippet">
      <div className="metadata">
        <strong>{snippet.title}</strong>
        <span>#{snippet.id}</span>
      </div>
      <pre>
        <code>{snippet.content}</code>
      </pre>
      <div className="metadata">
        <time dateTime={snippet.created}>
          Created: {humanDate(snippet.created)}
        </time>
        <time dateTime={snippet.expires}>
          Expires: {humanDate(snippet.expires)}
        </time>
      </div>
    </div>
  );
}
