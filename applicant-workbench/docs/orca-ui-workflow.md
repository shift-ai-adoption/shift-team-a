# Orca + Codex + Penpotで画面を修正する

[READMEへ戻る](../README.md) · 対応: [Issue #7](https://github.com/shift-ai-adoption/shift-team-a/issues/7)

Orcaでこのリポジトリの作業フォルダーを開き、Codexへ変更を依頼し、Orca内蔵ブラウザで動く画面を確認する手順です。既存の[Penpot操作動画](../video/README.md)の次工程にも使えます。ここで修正する対象は申請者管理サンプルで、Orca本体のUIではありません。

| 担当 | 役割 |
|---|---|
| Orca | 作業フォルダー、ターミナル、ブラウザを同じ作業内で扱う |
| Codex | 指示した内容をコードに反映し、テストする |
| Penpot | デザインの文字・色・配置を編集・確認する |

Penpotとアプリは自動同期しません。Penpotで変更した場合も、対象ページと変更内容を伝えてコードへ反映します。アプリから書き出したSVGも、既存のPenpotファイルを自動更新するものではありません。

## 1. 作業フォルダーと環境を準備する

Orcaで `shift-team-a` の対象作業フォルダーを開きます。ターミナルがそのチェックアウトを指していることを `Get-Location` と `git status --short` で確認し、リポジトリ直下から次を実行します。以降のnpm・Dockerコマンドは `applicant-workbench` 内で実行します。

```powershell
cd applicant-workbench
```

Docker Desktop（Linux containers）、Node.js 22.17以上、PowerShell 7を用意します。初回は次を実行します。

```powershell
pwsh -File scripts/setup.ps1
npx.cmd playwright install chromium
```

構築済みなら申請者管理は `docker compose -f compose.dev.yaml up -d`、Penpotは `docker compose up -d` で起動できます。別の作業フォルダーの同じ環境が起動済みの場合は、ポートとComposeの対象を確認してから進めます。既存DBやボリュームを削除して競合を解消しないでください。

この作業フォルダーに `.env` がない場合、PenpotのCompose操作には `docker compose --env-file "C:/path/to/existing/applicant-workbench/.env" ...` のように既存設定の実際のパスを指定します。開発用の `compose.dev.yaml` には不要です。

Orcaのシェルターミナルで開発用コンテナを起動します。画面とAPIが同じコンテナで動き、3201番から利用できます。修正依頼は同じ作業フォルダーのCodexセッションへ入力します。

```powershell
docker volume create applicant-workbench_app-data
docker compose -f compose.dev.yaml up -d --build
```

コンテナはバックグラウンドで動きます。[マウント対象・テスト方法・停止方法](../README.md#コンテナで画面を修正し保存直後に反映する)も参照してください。

## 2. Orcaのブラウザで変更前を確認する

Orca内蔵ブラウザで `http://localhost:3201` を開き、「申請者を新規登録」から対象画面へ進みます。変更前の文言、色、操作を確認します。

| URL | 使い方 |
|---|---|
| `http://localhost:3201` | 開発画面とAPI。画面コードの保存が反映される |
| `http://localhost:9001` | Penpot。デザインを確認・編集 |

CLIを使う場合、Windowsの通常版Orcaでは次の手順で専用タブを開けます。実行前に `orca skills get orca-cli` でインストール済みバージョンの仕様を確認してください。開発版・WSLでは、その環境が指定するCLIを使います。

```powershell
orca status --json
orca tab create --url http://localhost:3201 --json
orca snapshot --json
orca screenshot --json
```

Orcaを起動して対象の作業フォルダーを選んだ状態で実行します。複数のタブを操作する場合は `orca tab list --json` の `browserPageId` を確認し、以後のブラウザコマンドに `--page <browserPageId>` を指定します。

## 3. Codexへ修正を依頼する

次の依頼例をOrca内のCodexへ入力します。対象、変更後の値、確認してほしい操作を含めます。

> applicant-workbenchの申請者登録画面を修正してください。見出しを「申請者情報の登録」に、確認へ進むボタンの背景色を #176B56 にしてください。まず現在の画面と実装を確認し、個人・法人の両方へ反映してください。変更後はOrcaのブラウザで表示と入力→確認の操作を確認し、PCと390px幅で文字の読みやすさ・横はみ出し・キーボード操作を確認してください。変更ファイルと検証結果を報告してください。

これは実行用の例で、この手順書を追加しただけでは画面は変わりません。共有CSSを変更すると別画面にも影響するため、登録画面だけの変更か、共通ボタン全体の変更かも伝えます。

Penpotのデザインを起点にする場合は、先に[READMEの接続手順](../README.md#penpotとの接続)に従い、対象ファイルとMCPプラグインを開いたまま `Connected` を確認します。次のようにファイル・ページ・対象レイヤーを指定します。

> Penpotの対象ファイル「（ファイル名）」の「（ページ名）」にある申請者登録画面を確認してください。見出しとボタン色の変更を、applicant-workbenchの実装にも反映してください。Penpot側にも修正が必要なら対象を確認して更新し、Orcaでアプリの表示・操作を検証してください。

MCPが未接続の場合は、接続を復旧するか、変更後の文言・色・寸法を明示してコードの修正を進めます。その場合、Penpot側は未確認・未更新であることを記録します。

## 4. 動作確認とデザイン書き出しを行う

3201番で変更を確認したら、別のシェルターミナルから次を順に実行します。コマンドが失敗した場合は原因を直してから次へ進みます。

```powershell
npm.cmd test
npm.cmd run test:e2e
npm.cmd run capture
node scripts/export-designs.mjs
git diff --check
git diff --stat
```

APIの `server/` を変更した場合は、検証前に `docker compose -f compose.dev.yaml restart ui` を実行します。E2E・キャプチャ・SVG書き出しの既定の接続先は3201番です。`APP_URL` を設定している場合は接続先を確認してください。`artifacts/` に確認画像、`design/screens/` に編集可能なSVGが出力されます。必要なSVGをPenpotの明示した対象へ取り込み、既存デザインの重複や取り違えがないことを確認します。

Orcaで3201番を開き、登録の個人・法人切り替え、入力エラー、確認・完了、詳細・編集・削除確認、空状態を確認します。自動テストに加えて、PCと390px幅の画像、ラベル、Tabキー操作を確認してください。`npm run capture` のモバイル画像は一覧画面なので、変更した登録画面のモバイル表示も別途確認します。

完了時は、変更したファイル、修正前後の内容、実行したテストと結果、画像の保存先、Penpotの更新状況をまとめます。既存動画が実演する範囲はPenpot編集までです。この手順のOrca操作を録画・実証した動画ではありません。

## 5. 追加修正・取り消し・終了

見た目が意図と違う場合は「登録画面のボタンの左右余白だけを小さくしてください」のように追加指示します。取り消す場合は「今回変更した見出しとボタン色だけを元に戻し、他の作業変更は保持してください」と依頼し、`git diff` で確認します。コードを戻してもPenpotは戻らないため、Penpot側も対象を指定して取り消します。

作業終了時は `docker compose -f compose.dev.yaml stop` で申請者管理を停止します。Penpotも停止する場合は `docker compose stop` を実行します。データは保持されます。

| 困ったとき | 確認すること |
|---|---|
| 3201番が開けない | `docker compose -f compose.dev.yaml ps` で起動状態とポート競合を確認 |
| 一覧や保存がエラーになる | `docker compose -f compose.dev.yaml logs ui` で同じコンテナ内のAPIを確認 |
| コードを変えても表示が古い | 作業フォルダーとマウント元・タブのURLを確認。API変更ならuiを再起動 |
| Penpotだけ変わっている | 変更対象と値をCodexへ渡し、コード反映と検証を依頼 |
| Orcaのブラウザ操作で参照エラー | 対象タブを確認し、`orca snapshot --json` で最新の要素参照を取得 |
