import { useEffect, useState } from "react";
import { Alert, Card, List, Spin, Typography } from "antd";
import { getCurrentAccount } from "../api/client";
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
            </Card>
          </List.Item>
        )}
      />
    </section>
  );
}
