# AGENTS.md

このリポジトリは、Fediverse 対応の SNS「yuragi」を作るためのプロジェクトです。

## プロジェクト概要

- ActivityPub/Fediverse に対応する SNS サーバーを実装します。
- 実行環境とパッケージ管理には Bun を使います。
- 言語は TypeScript です。
- TypeScript ソースは `src/` ディレクトリに配置します。
- サーバー本体のコードは `src/server/` ディレクトリに配置します。
- クライアント SPA のコードは `src/client/` ディレクトリに配置します。
- Web フレームワークには Hono を使います。
- クライアントのビルドには Vite を使います。
- クライアントは React と React Router で SPA として実装します。
- ActivityPub/Fediverse 関連の実装には Fedify を使います。
- データベースには PostgreSQL を使います。
- ORM には Drizzle ORM を使います。
- formatter/linter には Biome を使います。

## 開発方針

- TypeScript の型を尊重し、`strict` 前提で実装してください。
- Bun の標準機能を優先し、Node.js 固有 API への依存は必要な場合に限定してください。
- ActivityPub のオブジェクト、Actor、Inbox、Outbox、署名、配送まわりは、可能な限り Fedify の抽象を使って実装してください。
- HTTP ルーティング、ミドルウェア、リクエスト/レスポンス処理は Hono の流儀に合わせてください。
- クライアント側ルーティングは React Router を使い、Hono は Vite のビルド済み HTML/asset を配信してください。
- `src/client/` 配下では `components/`、`pages/`、`hooks/`、`api/`、`stores/`、`utils/`、`types/`、`App.tsx`、`main.tsx` の構成を基本にしてください。
- Fediverse の相互運用性に関わる変更では、Mastodon など既存実装との互換性を意識してください。
- セキュリティに関わる処理では、署名検証、入力検証、公開範囲、なりすまし防止を明示的に扱ってください。
- 永続化は PostgreSQL を前提に設計してください。開発用 DB は `compose.yml` の `postgres` サービスを使います。
- アプリケーションから DB に接続する場合は、`DATABASE_URL` など環境変数経由で接続情報を渡してください。
- PostgreSQL への型安全なアクセスは Drizzle ORM を使ってください。schema は `src/db/schema.ts`、DB client は `src/db/client.ts` に置きます。

## よく使うコマンド

```bash
bun install
bun run src/index.ts
bun run build
bunx tsc --noEmit
bun run lint
bun run format
bun run db:generate
bun run db:migrate
```

## サーバー起動の扱い

- 開発サーバーの起動はユーザーが行います。
- エージェントは、ユーザーから明示的に依頼された場合を除き、`bun run src/index.ts` や `bun run start` などのサーバー起動コマンドを実行しないでください。
- Vite dev server の起動もユーザーが行います。エージェントは、ユーザーから明示的に依頼された場合を除き、`bun run dev:client` を実行しないでください。
- Docker Compose による PostgreSQL の起動もユーザーが行います。エージェントは、ユーザーから明示的に依頼された場合を除き、`docker compose up` を実行しないでください。
- Drizzle Studio や migration の DB 適用など、DB への接続を伴うコマンドもユーザーが行います。エージェントは、ユーザーから明示的に依頼された場合を除き、`bun run db:migrate`、`bun run db:push`、`bun run db:studio` を実行しないでください。
- 動作確認が必要な場合は、まず `bunx tsc --noEmit` など起動を伴わない検証を優先してください。

## 実装時の注意

- 依存関係を追加する前に、Bun/TypeScript/Fedify/Hono で自然に解けるか確認してください。
- TypeScript/JSON/Markdown などの整形と lint は Biome に従ってください。
- 変更後は可能な範囲で `bun run lint`、`bunx tsc --noEmit`、`bun run build` を実行してください。
- Fediverse 関連の仕様やライブラリ挙動が不明な場合は、推測で実装せず、公式ドキュメントや実際の型定義を確認してください。
- 外部に公開される URL、Actor ID、Activity ID、Object ID は安定した形式にしてください。
- 永続化、認証、配送キューなどの基盤部分を追加する場合は、責務を分け、テストしやすい形にしてください。
- PostgreSQL の schema や migration を追加する場合は、再現可能な migration と型安全な DB アクセスを優先してください。
- Drizzle の schema 変更後は `bun run db:generate` で migration を生成してください。ただし、DB への適用はユーザーが行います。
- 既存ファイルの小さな修正で済む場合は、大きな再設計を避けてください。
