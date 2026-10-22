import { getFlash } from "@/lib/flash";
import { ClearFlash } from "./clear-flash";

export async function Flash() {
  const message = await getFlash();
  if (!message) return null;

  return (
    <>
      <div className="flash" role="status">
        {message}
      </div>
      <ClearFlash />
    </>
  );
}
