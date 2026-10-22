import { humanDate } from "@/lib/format";
import type { Snippet } from "@/lib/snippets";

export function SnippetCard({ snippet }: { snippet: Snippet }) {
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
        <time dateTime={snippet.created}>Created: {humanDate(snippet.created)}</time>
        <time dateTime={snippet.expires}>Expires: {humanDate(snippet.expires)}</time>
      </div>
    </div>
  );
}
