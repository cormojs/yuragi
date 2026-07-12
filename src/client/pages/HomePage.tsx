import { useEffect, useState } from "react";
import { Alert, Button, Card, List, Spin, Typography } from "antd";
import {
  favouriteStatus,
  getCurrentAccount,
  unfavouriteStatus,
} from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { PostComposer } from "../components/PostComposer";
import { useTimeline } from "../hooks/useTimeline";

export function HomePage() {
  const { posts, isLoading, error, reload } = useTimeline();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [favouritingPostId, setFavouritingPostId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    getCurrentAccount()
      .then((account) => setIsAuthenticated(account != null))
      .catch(() => setIsAuthenticated(false));
  }, []);

  async function toggleFavourite(postId: string, favourited: boolean) {
    if (favouritingPostId != null) return;

    setFavouritingPostId(postId);
    try {
      if (favourited) {
        await unfavouriteStatus(postId);
      } else {
        await favouriteStatus(postId);
      }
      await reload();
    } finally {
      setFavouritingPostId(null);
    }
  }

  return (
    <section className="page">
      <PageHeader
        title="Home"
        description="Local updates from the yuragi instance."
      />
      {isAuthenticated ? <PostComposer onPosted={reload} /> : null}
      {isLoading ? <Spin tip="Loading timeline..." /> : null}
      {error != null ? <Alert message={error} showIcon type="error" /> : null}
      <List
        dataSource={posts}
        itemLayout="vertical"
        locale={{ emptyText: "No posts yet." }}
        renderItem={(post) => (
          <List.Item key={post.id}>
            <Card>
              <Typography.Text strong>{post.author}</Typography.Text>
              <Typography.Text type="secondary">
                {" · "}
                <time dateTime={post.publishedAt}>{post.publishedLabel}</time>
              </Typography.Text>
              <Typography.Paragraph style={{ marginBottom: 0, marginTop: 12 }}>
                {post.content}
              </Typography.Paragraph>
              <Button
                aria-pressed={post.favourited}
                disabled={!isAuthenticated}
                loading={favouritingPostId === post.id}
                onClick={() => void toggleFavourite(post.id, post.favourited)}
                style={{ marginTop: 12 }}
                type={post.favourited ? "primary" : "default"}
              >
                {post.favourited ? "Favourited" : "Favourite"} ({post.favouritesCount})
              </Button>
            </Card>
          </List.Item>
        )}
      />
    </section>
  );
}
