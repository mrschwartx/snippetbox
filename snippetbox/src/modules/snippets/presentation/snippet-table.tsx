import Link from "next/link";
import type { SnippetDto } from "../domain/snippet";
import { humanDate } from "./format";

export function SnippetTable({ snippets }: { snippets: SnippetDto[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Created</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>
        {snippets.map((snippet) => (
          <tr key={snippet.id}>
            <td>
              <Link href={`/snippet/view/${snippet.id}`}>{snippet.title}</Link>
            </td>
            <td>{humanDate(snippet.created)}</td>
            <td>#{snippet.id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
