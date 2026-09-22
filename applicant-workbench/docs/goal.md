# 目標と受け入れ条件

## 目標

公的機関の事務処理を想定した申請者CRUDを題材に、Codexへ日本語で修正を依頼すると、セルフホストしたPenpotのデザインをMCP経由で編集し、必要に応じて動作するWebアプリへ反映・検証できるローカル開発環境を提供する。

初心者が、環境の起動、サンプル操作、Penpot接続、AIへの修正依頼、変更結果の確認までを、READMEと日本語キャプション付き動画だけで再現できる状態を完成条件とする。

## 対象利用者

- AIを利用したUI修正フローを試したい開発者
- PenpotやMCPを初めて扱う利用者
- 公的機関向け業務画面のCRUD実装例を確認したい設計者・開発者

## 必要な成果

1. Docker ComposeでPenpot、PostgreSQL、Valkey、MinIO、Penpot MCPを起動できる。
2. 個人・法人の申請者について、一覧・登録・確認・詳細・編集・削除を操作できる。
3. 検索、絞り込み、並び替え、ページング、入力検証、更新競合、利用者ごとのデータ分離を確認できる。
4. Codexのプロジェクト設定からPenpot MCPへ接続できる。
5. Codexへの自然文指示により、Penpotのテキスト、色、寸法、配置を読み取り・変更できる。
6. Penpotの変更とWebアプリのコード変更が別工程であることを明示する。
7. 初心者向けの日本語キャプション付き操作動画を提供する。
8. 実際のMCP修正例を、修正前後のスクリーンショット付きでREADMEに掲載する。
9. 初期依頼から完成までの判断、問題、検証結果、ユーザーとのやり取りを記録する。

## 受け入れ条件

- `docker compose up -d` と `docker compose -f compose.dev.yaml up -d` 後、申請者管理サンプルを`http://localhost:3201/`、Penpotを`http://localhost:9001/`で開ける。
- `npm test`が成功する。
- `npm run test:e2e`で個人CRUD、法人CRUD、検索・空状態・利用者切り替え・スマートフォン表示が成功する。
- Penpot MCP Pluginが`Connected`になり、対象ページのレイヤー構造を取得できる。
- MCP経由で対象テキストとボタン寸法を変更できる。
- READMEから起動方法、操作動画、MCP修正実例、構築経緯へ移動できる。
- READMEの修正前後画像が異なり、変更内容を視覚的に確認できる。
- パスワード、署名鍵、ブラウザープロファイル、ローカルDBなどの秘密・実行データがGitへ追加されない。
- Dockerの公開ポートがループバックに限定され、データストアが外部公開されない。

## 対象外

- 実在利用者を対象とした本人認証・本人確認
- 法人番号の実在確認や代表権確認
- 本番環境への公開、TLS、可用性設計
- PenpotとReactアプリの自動双方向同期
- Codexへ渡した情報が外部AI処理へ送信されないことの保証

## 検証コマンド

```powershell
docker compose up -d --build
docker volume create applicant-workbench_app-data
docker compose -f compose.dev.yaml up -d --build
npm test
npm run test:e2e
npm run capture
```

詳細な経緯は[プロジェクト構築経緯](project-history.md)、個別の検証結果は[検証記録](verification.md)を参照する。
