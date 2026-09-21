# Penpotではじめる画面修正

初心者向けの実操作動画です。日本語キャプションは映像に焼き込み済みで、字幕表示の設定は不要です。音声はありません。

## ファイル

- `penpot-beginner-ja.mp4`: 視聴・配布用。H.264 / MP4。
- `penpot-beginner-ja.srt`: 字幕を後で編集するときに使う字幕ファイル。
- `poster.jpg`: 動画の表紙。
- `timeline.json`: 録画時の説明内容・時刻。

## 学べること

1. キャンバス・レイヤー・右側パネルの役割。
2. 文字レイヤーを選び、Enterで編集、Ctrl+Aで全選択、Escで編集を終了。
3. ボタンの背景を選び、FILLの色コードを変更。
4. Ctrl+Zで元に戻す、Ctrl+Shift+Zでやり直す。
5. 自動保存を待ち、再読込して変更結果を確認。
6. デザインの変更内容をCodexに伝え、アプリの実装・動作確認へ進める。

練習対象は、申請者登録画面を簡略化したPenpotネイティブの文字・図形です。見出しを「申請者登録」から「申請者情報の登録」へ、ボタン色を `#285E99` から `#176B56` へ変更します。

動画内の修正はPenpotの標準UIで行っています。説明の字幕・章タイトル・黄色のカーソル強調は録画用の補助表示で、Penpot本来のUIではありません。動画の後半に示すCodexへの依頼文は次工程の説明であり、動画内でアプリのコード変更は実行していません。

## 同じページで練習する

このプロジェクトで `node scripts/start-browser.mjs` を起動すると、ローカル専用プロファイルのPenpotを開けます。対象URLは `data/penpot-tutorial-url.txt` に保存されています。認証情報は `data/penpot-local.json`。いずれも外部へ共有しないでください。

動画と同じ内容を繰り返す場合は、文字と色を元へ戻してから操作してください。元の申請者管理アプリの機能は、この動画作成では変更していません。

## 再録画

`scripts/record-tutorial.mjs` は、練習用の見出しとボタンのみを初期状態に戻してから録画します。保存済みの専用ページと `data/tutorial-shapes.json` が必要です。

```powershell
node scripts/record-tutorial.mjs
python scripts/finish-tutorial.py
```

後処理にはPillowとimageio-ffmpegが必要です。この環境では後者をプロジェクト内の `.tools/` に配置しています。`video/raw/` は録画素材のため、通常の配布にはMP4だけを使用してください。
