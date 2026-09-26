// Stable, fictional data for exercising the incident dashboard.
const businessTypes = ['夜間バッチ','オンライン受付','データ連携','請求処理','認証基盤','帳票出力'];
const occurrenceTypes = ['監視通知','利用者申告','定期確認','自動リトライ','外部サービス通知'];
const patterns = ['タイムアウト','接続エラー','処理遅延','データ不整合','容量警告'];
const nodes = ['batch-01','batch-02','portal-01','portal-02','api-01','api-02','db-01','relay-01','auth-01','report-01'];
const assignees = ['佐藤','鈴木','高橋','田中','伊藤','渡辺','山本','中村'];
const descriptions = {
  'タイムアウト':['応答待ち時間が上限を超過','外部接続の応答が遅延','処理が規定時間内に完了しない'],
  '接続エラー':['接続の確立に失敗','一時的な通信断を検知','接続プールの再試行が上限に到達'],
  '処理遅延':['キューの滞留により処理が遅延','定期処理の所要時間が増加','後続ジョブの開始が遅延'],
  'データ不整合':['連携件数の差異を検知','必須項目の欠落を検知','更新日時の不一致を検知'],
  '容量警告':['一時領域の使用率が上昇','キューの残件数がしきい値を超過','ログ領域の空き容量が低下']
};
const pad = n => String(n).padStart(2,'0');
const iso = d => d.toISOString();

export function demoIncidents(count = 1000) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const n = i + 1;
    const pattern = patterns[(n * 7 + Math.floor(n / 13)) % patterns.length];
    const occurred = new Date(Date.UTC(2025, 9, 1, 0, 0) + ((n * 7919) % 365) * 86400000 + (n * 137) % 86400000);
    const status = n % 20 < 11 ? '完了' : n % 20 < 15 ? '対応中' : n % 20 < 18 ? '未着手' : '保留';
    const received = new Date(occurred.getTime() + (5 + n % 45) * 60000);
    const firstResponse = new Date(received.getTime() + (3 + n % 115) * 60000);
    const message = `${descriptions[pattern][n % 3]}（架空データ）`;
    rows.push({
      node: nodes[(n * 3) % nodes.length], occurred_at: iso(occurred), output_at: iso(new Date(occurred.getTime() + 60000)),
      received_at: iso(received), first_response_at: iso(firstResponse), message,
      file_name: `${businessTypes[(n * 5) % businessTypes.length].replace(/[・]/g, '-')}.log`,
      pattern, log_line_count: 1 + n % 18, grep_result: `${pad(100 + n % 900)} WARN ${pattern}: synthetic event ${n}`,
      occurrence_type: occurrenceTypes[(n * 3 + Math.floor(n / 11)) % occurrenceTypes.length],
      business_type: businessTypes[(n * 5) % businessTypes.length],
      cause: ['一時的な負荷上昇','接続先の応答遅延','入力データの形式差異','処理キューの集中','定期メンテナンスの影響'][n % 5],
      response_action: status === '完了' ? '再試行と処理結果を確認し、正常終了を確認' : 'ログと対象サービスの状態を確認中',
      assignee: assignees[(n * 5) % assignees.length], status,
      completed_on: status === '完了' ? occurred.toISOString().slice(0, 10) : null,
      operation_minutes: 8 + (n * 17) % 180, novelty: n % 10 < 7 ? '既出・再発' : '新規', defect: n % 8 === 0 ? '有' : '無',
      request_key: `${String(n).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`
    });
  }
  return rows;
}
