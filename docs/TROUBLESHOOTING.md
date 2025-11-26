# バージョン管理パネルが表示されない場合のトラブルシューティング

## 問題: バージョン管理パネルと比較タブが表示されない

バージョン管理パネルが表示されない場合、以下の手順で確認してください。

## 確認事項

### 1. アプリケーションをビルドしましたか？

バージョン管理機能を使用するには、アプリケーションをビルドする必要があります。

```bash
cd app
npm run build
```

または本番環境用：

```bash
cd app
npm run build:prod
```

### 2. 開発サーバーを起動していますか？

ローカルで開発する場合：

```bash
cd app
npm run serve
```

その後、ブラウザで `http://localhost:8081` を開いてください。

### 3. versions.json ファイルが正しくコピーされていますか？

ビルド後、以下のファイルが存在することを確認してください：

- `app/dist-dev/data/versions.json` (開発ビルド)
- `app/dist-prod/data/versions.json` (本番ビルド)

確認方法：

```bash
ls -la app/dist-dev/data/versions.json
ls -la app/dist-prod/data/versions.json
```

### 4. 正しい規約を開いていますか？

現在、以下の規約に複数のバージョンが設定されています：

- **校友会規約** - 令和六年版と令和七年版

他の規約類は現在1つのバージョンしかないため、バージョン管理パネルは表示されません。

### 5. ブラウザのコンソールでエラーを確認

ブラウザの開発者ツール（F12キー）を開き、コンソールタブで以下を確認してください：

1. `[VersionControl]` で始まるログメッセージを探す
2. エラーメッセージ（赤色）がないか確認
3. `versions.json` の読み込みエラーがないか確認

期待されるログ：

```
[VersionControl] Law title: 校友会規約
[VersionControl] Base name: 校友会規約
[VersionControl] Loaded versions: {baseName: "校友会規約", versions: Array(2)}
[VersionControl] Show control: true
```

### 6. ネットワークタブで versions.json の読み込みを確認

ブラウザの開発者ツールで「ネットワーク」タブを開き、`versions.json` がロードされているか確認してください。

- ステータスコード: 200 OK であるべき
- ステータスコード: 404 の場合、ビルドプロセスに問題がある可能性があります

## よくある問題と解決方法

### 問題1: versions.json が 404 エラー

**原因**: ビルドプロセスで versions.json がコピーされていない

**解決方法**:
1. `sample_regulations/versions.json` が存在することを確認
2. アプリケーションを再ビルド: `npm run build`
3. ビルドログで "Copied versions.json" メッセージを確認

### 問題2: バージョン管理パネルが表示されない（校友会規約で）

**原因**: versions.json の baseName と法令タイトルが一致していない

**解決方法**:
1. ブラウザコンソールで `[VersionControl] Base name:` のログを確認
2. versions.json のキーと一致しているか確認
3. 一致していない場合、extractBaseName 関数を確認

### 問題3: 他の規約でバージョン管理パネルが表示されない

**原因**: その規約は現在1つのバージョンしかありません

**説明**: バージョン管理パネルは、複数のバージョンが存在する規約でのみ表示されます。現在、複数バージョンがあるのは「校友会規約」のみです。

**解決方法**: 他の規約にもバージョンを追加する場合は、`docs/VERSION_CONTROL.md` の「新しいバージョンの追加方法」を参照してください。

## デバッグモードの有効化

コンソールログが表示されるように、開発ビルドを使用してください：

```bash
npm run build  # 本番ビルドではなく開発ビルド
npm run serve
```

## それでも解決しない場合

以下の情報を含めて Issue を作成してください：

1. 実行したコマンド
2. ブラウザのコンソールログ（スクリーンショット）
3. ネットワークタブのスクリーンショット
4. 使用しているブラウザとバージョン
5. OS（Windows/Mac/Linux）

## クイックスタート（最初から）

問題を完全に解決するため、以下の手順を最初から実行してください：

```bash
# 1. リポジトリのルートディレクトリで
cd /path/to/Lawtext634

# 2. Core をビルド
cd core
npm install --legacy-peer-deps
cd ..

# 3. App をビルド
cd app
npm install --legacy-peer-deps
npm run build

# 4. 開発サーバーを起動
npm run serve

# 5. ブラウザで開く
# http://localhost:8081 にアクセス

# 6. サイドバーから「校友会規約」を選択
```

正常に動作している場合、規約本文の上に3つのタブ（現行版、改正履歴、比較）が表示されます。
