import { Alert, Avatar, Card, Descriptions, List, Spin, Typography } from "antd";
import { useParams } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { useAccountProfile } from "../hooks/useAccountProfile";
import { formatHandle } from "../utils/formatHandle";

export function ProfilePage() {
  const identifier = useParams().identifier ?? "";
  const { profile, isLoading, error } = useAccountProfile(identifier);
  const handle =
    profile?.handle != null
      ? formatHandle(profile.handle, window.location.host)
      : formatHandle(identifier, window.location.host);

  return (
    <section className="page">
      <PageHeader
        title={profile?.displayName ?? identifier}
        description="Fediverse actor profile served by yuragi."
      />
      {isLoading ? <Spin tip="Loading profile..." /> : null}
      {error != null ? <Alert message={error} showIcon type="error" /> : null}
      <Card style={{ marginBottom: 16 }}>
        <Card.Meta
          avatar={<Avatar size={64}>{identifier.slice(0, 1).toUpperCase()}</Avatar>}
          description={
            <>
              <Typography.Paragraph type="secondary">{handle}</Typography.Paragraph>
              <Typography.Paragraph>{profile?.summary ?? ""}</Typography.Paragraph>
            </>
          }
          title={profile?.displayName ?? identifier}
        />
        {profile != null ? (
          <Descriptions
            items={[
              { key: "posts", label: "Posts", children: profile.statusesCount },
              { key: "followers", label: "Followers", children: profile.followersCount },
              { key: "following", label: "Following", children: profile.followingCount },
            ]}
            size="small"
            style={{ marginTop: 24 }}
          />
        ) : null}
      </Card>
      {profile != null ? (
        <Card title={`Followers (${profile.followers.length})`}>
          <List
            dataSource={profile.followers}
            locale={{ emptyText: "No followers yet." }}
            renderItem={(follower) => (
              <List.Item key={follower.id}>
                <List.Item.Meta
                  avatar={<Avatar>{follower.handle.slice(1, 2).toUpperCase()}</Avatar>}
                  description={follower.uri}
                  title={
                    <Typography.Link href={follower.uri} rel="noreferrer" target="_blank">
                      {follower.handle}
                    </Typography.Link>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      ) : null}
      {profile != null ? (
        <List
          dataSource={profile.posts}
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
      ) : null}
    </section>
  );
}
