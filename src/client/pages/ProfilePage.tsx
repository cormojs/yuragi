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
      {isLoading ? <p className="state-text">Loading profile...</p> : null}
      {error != null ? <p className="state-text">{error}</p> : null}
      <div className="profile-panel">
        <div className="avatar" aria-hidden="true">
          {identifier.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="handle">{handle}</p>
          <p>{profile?.summary ?? ""}</p>
          {profile != null ? (
            <dl className="profile-stats">
              <div>
                <dt>Posts</dt>
                <dd>{profile.statusesCount}</dd>
              </div>
              <div>
                <dt>Followers</dt>
                <dd>{profile.followersCount}</dd>
              </div>
              <div>
                <dt>Following</dt>
                <dd>{profile.followingCount}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      </div>
      {profile != null && profile.posts.length > 0 ? (
        <div className="timeline" role="feed" aria-label="Profile posts">
          {profile.posts.map((post) => (
            <article className="post" key={post.id}>
              <div className="post-meta">
                <span>{post.author}</span>
                <time dateTime={post.publishedAt}>{post.publishedLabel}</time>
              </div>
              <p>{post.content}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
