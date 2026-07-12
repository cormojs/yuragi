import { type FormEvent, useState } from "react";
import { createStatus } from "../api/statusApi";

export function PostComposer({ onPosted }: { onPosted: () => Promise<void> }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remainingCharacters = 500 - content.length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (content.trim().length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createStatus(content);
      setContent("");
      await onPosted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to publish post.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="post-composer" onSubmit={handleSubmit}>
      <label htmlFor="post-content">Write a post</label>
      <textarea
        id="post-content"
        maxLength={500}
        onChange={(event) => setContent(event.target.value)}
        placeholder="What's happening?"
        required
        rows={4}
        value={content}
      />
      <div className="composer-actions">
        <span aria-live="polite">{remainingCharacters} characters remaining</span>
        <button disabled={isSubmitting || content.trim().length === 0} type="submit">
          {isSubmitting ? "Posting…" : "Post"}
        </button>
      </div>
      {error != null ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
