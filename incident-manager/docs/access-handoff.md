# Access本番改修への引継ぎ

## 確定した前提

- 本番には既存のAccess・フォームが存在し、本番環境のChatGPTで改修する。開発側は実物を持たない。
- 開発はWindows DockerのPostgreSQLとNodeフォームで模擬し、ホストへ開発ランタイムを追加しない。
- 本番の正本は共有Access。既存フォームとWebから利用し、Windowsログオン中だけ連携が動けばよい。
- 5名、同時2名、10メール/日、過去3,000件。優先は転記削減。
- Outlook classic、会社の送受信サーバー。Googleは使用しない。
- 外部クラウド送信禁止を初期値とし、許可設定を分離する。内部LLMは現在なし。
- 重複・再発は人が判断。日時が異なる同一事象も登録。
- 一次回答時間は受付から初回回答までの分数。Excelは入力対象項目と同じ列。

## 仮モデルのAccess対応

開発版は読みやすさのためincidentsテーブルへ項目をまとめている。本番の既存テーブルに置き換える際は、既存項目を重複追加せず、既存主キーに結び付けた拡張テーブルを使用する。テーブル・項目名は仮名。

| 開発項目 | 意味 | 本番での配置候補 |
|---|---|---|
| id | 項番 | 既存主キーに対応。表示項番が別なら区別する |
| record_type | FAQ／インシデント | 既存区分、なければ拡張表 |
| node / output_at / message / file_name | ノード、出力日時、メッセージ、ファイル名 | 既存ログ入力先 |
| pattern / log_line_count / grep_result | パターン、ログ該当行数、Grep結果 | 既存ログ入力先 |
| occurred_at / occurrence_type / business_type | 発生日時、発生種別、業務種別 | 既存インシデント表 |
| cause / response_action | 原因、回答兼対処 | 既存インシデント表。FAQ原因は空 |
| assignee / status / completed_on | 担当者、状態、完了日付 | 既存管理項目 |
| operation_minutes | 操作に費やした分数 | 既存管理項目 |
| received_at / first_response_at | 受付・初回回答日時 | 既存になければ拡張表 |
| first_response_minutes（計算値） | 初回回答までの経過分数 | クエリ計算または既存時間欄との整合処理 |
| novelty / defect | 新規／既出、瑕疵 | 既存管理項目 |
| related_id | 関連項番（初期版は1件） | 関連表へ拡張可能 |
| source_message_id / source_text / request_key | 原文・取込識別情報 | メール取込表 |
| version / created_at / updated_at / deleted_at | 競合・履歴用 | 拡張表または既存表の追加列 |
| incident_history | 更新履歴 | 追加表。JSONBはAccessにないため長いテキスト等へ対応 |
| report_drafts | 報告文下書き・元記録版数 | 追加表 |
| app_settings / settings_history | 送信・ログ許可設定と変更履歴 | 追加表 |

PostgreSQLのbigint、自動採番、timestamptz、jsonb、CHECK、ON CONFLICTをそのままAccessへ流用しない。日時は開発DBでUTC保持・画面は日本時間。Accessの日付時刻型ではタイムゾーンの規約を明示して変換する。文字数・NULL/空文字・主キー型・既存コンボボックスの値を本番で照合する。

## 本番改修の手順

1. DBをバックアップし、コピーで検証。拡張子、Office版数・bit数、テーブル、クエリ、フォームのレコードソース、VBAの保存処理を調査。
2. 上表と実物の対応表を確定。既存表を削除・再作成せず追加DDLを作る。
3. フォームと共有データが分離済みか確認。既存フォームの操作を維持する。
4. ログオン中に動くAccess連携方式を小さく実証。ACEのサーバー側利用制約を確認し、ローカル中継だけでサポート上の制約が解消したと扱わない。
5. AccessとWebが同じ記録を同時に更新する試験。Webの版数確認だけではAccess側更新を捕捉できないので、既存フォーム側の保存処理・ロック方式も合わせて設計。
6. Outlook classicからの対象メール取得を追加。メール本文・日時・添付ログの実例に合わせて抽出。受信日時と発生日時・出力日時は分ける。
7. バックアップ・復元・切戻し、5名の権限、データ保持期間、Excel保存場所を定義して並行運用。

## AIの後続実装

現在はLLM未接続で、AI出力を模擬生成しない。報告文は定型テンプレート。将来は「無効／内部／外部」の接続先と「外部送信許可」「ログ入力許可」を実際の送信直前に検査する。原文由来のメッセージ・サマリ・検索用埋め込みもログ制限の対象とする。

AI提案は確定原因を上書きせず、根拠、不足情報、別原因、調査事項、利用モデル、元データ版数、採用履歴を追加表へ保存する。ログに含まれる指示文を実行命令として扱わない。レポート生成は実際のメール送信や初回回答日時の登録と分離する。

## 検証の境界

開発版の成功はAccessのロック、SQL互換性、VBA互換性、Outlook連携、ライセンス・サポート条件の保証ではない。Accessの1ファイル容量上限に合わせ、長大な原文ログはファイル管理＋参照に切り替えるかを本番で決める。

参考：
- https://support.microsoft.com/en-gb/access/download-and-install-microsoft-365-access-runtime
- https://support.microsoft.com/en-us/access/deploy-an-access-application
- https://support.microsoft.com/en-us/access/access-specifications
