import { useEffect, useState } from "react";
import { getCurrentAccount } from "../api/authApi";
import { PageHeader } from "../components/PageHeader";
import { PostComposer } from "../components/PostComposer";
import { useTimeline } from "../hooks/useTimeline";

export function HomePage() {
  const { posts, isLoading, error, reload } = useTimeline();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    getCurrentAccount()
      .then((account) => setIsAuthenticated(account != null))
      .catch(() => setIsAuthenticated(false));
  }, []);

  return (
    <section className="page">
      <PageHeader
        title="Home"
        description="Local updates from the yuragi instance."
      />
      {isAuthenticated ? <PostComposer onPosted={reload} /> : null}
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
