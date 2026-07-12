import { PageHeader } from "../components/PageHeader";
import { useTimeline } from "../hooks/useTimeline";

export function HomePage() {
  const { posts, isLoading, error } = useTimeline();

  return (
    <section className="page">
      <PageHeader
        title="Home"
        description="Local updates from the yuragi instance."
      />
      {isLoading ? <p className="state-text">Loading timeline...</p> : null}
      {error != null ? <p className="state-text">{error}</p> : null}
      <div className="timeline" role="feed" aria-label="Timeline">
        {posts.map((post) => (
          <article className="post" key={post.id}>
            <div className="post-meta">
              <span>{post.author}</span>
              <time dateTime={post.publishedAt}>{post.publishedLabel}</time>
            </div>
            <p>{post.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
