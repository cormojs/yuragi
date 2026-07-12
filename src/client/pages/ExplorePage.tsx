import { PageHeader } from "../components/PageHeader";

const topics = ["ActivityPub", "Fedify", "Hono", "Bun", "PostgreSQL"];

export function ExplorePage() {
  return (
    <section className="page">
      <PageHeader
        title="Explore"
        description="Topics and public conversations on this instance."
      />
      <div className="topic-grid">
        {topics.map((topic) => (
          <a className="topic" href={`/explore?tag=${topic}`} key={topic}>
            #{topic}
          </a>
        ))}
      </div>
    </section>
  );
}
