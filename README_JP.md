# Lawtext634

武蔵高等学校中学校校友会の規約類管理システム

## 概要

Lawtext634は、武蔵高等学校中学校校友会で制定された規約類（規約・細則・規程・規則）をLawtext形式で管理・閲覧するためのシステムです。オリジナルの[Lawtext](https://github.com/yamachig/lawtext)をベースに、ローカル規約管理用に適応されています。

## 特徴

- **ローカル専用**: e-Gov法令APIへの依存を完全に削除し、ローカルファイルのみで動作
- **Lawtext形式対応**: 読みやすく編集しやすいLawtext形式で規約を管理
- **検索・閲覧機能**: 保存された規約類を検索・閲覧可能
- **Vercelデプロイ対応**: Vercelへの簡単なデプロイが可能

## セットアップ

### 前提条件

- Node.js 18以上
- npm

### ローカル開発

1. リポジトリをクローン:
```bash
git clone https://github.com/Kokohachi/Lawtext634.git
cd Lawtext634
```

2. 依存関係をインストール:
```bash
cd core
npm install --legacy-peer-deps
cd ../app
npm install --legacy-peer-deps
```

3. アプリをビルド:
```bash
npm run build
```

4. 開発サーバーを起動:
```bash
npm run serve
```

### Vercelへのデプロイ

1. Vercel CLIをインストール（未インストールの場合）:
```bash
npm install -g vercel
```

2. プロジェクトのルートディレクトリでデプロイ:
```bash
vercel
```

## 規約データの配置

規約データは以下のディレクトリに配置されています:

### sample_regulations/

サンプル規約がLawtext形式で保存されています:

- 校友会規約.law.txt
- 代表委員会細則.law.txt
- 選挙管理委員会細則.law.txt
- 図書委員会細則.law.txt
- 美化委員会細則.law.txt
- 会計細則.law.txt
- 選挙細則.law.txt
- 生徒総会細則.law.txt
- 代表委員会事務局規程.law.txt
- 代表委員会事務局印刷機管理規程.law.txt
- その他の規程・細則

これらのファイルは `規約類PDF.pdf` から変換されたものです。

### app/dist-prod/data/lawdata/

アプリケーションで使用する規約データを配置してください:

```
app/dist-prod/
  └── data/
      └── lawdata/
          ├── 規約_20240101.law.txt
          ├── 細則_20240101.law.txt
          ├── 規程_20240101.law.txt
          └── 規則_20240101.law.txt
```

### Lawtext形式の例

```
武蔵高等学校中学校校友会規約
（令和六年規約第一号）

      第一章　総則

  （名称）
第一条　本会は、武蔵高等学校中学校校友会と称する。

  （目的）
第二条　本会は、会員相互の親睦を図り、もって母校の発展に寄与することを目的とする。
```

## 使用方法

1. ブラウザでアプリケーションにアクセス
2. 規約名または番号を検索バーに入力して検索
3. または、「規約ファイルを開く」ボタンからローカルのLawtextファイルを読み込み
4. 規約を閲覧・ダウンロード（Word、XML、Lawtext形式）

## 技術スタック

- React 19
- TypeScript
- Webpack 5
- Bootstrap 5
- Lawtext Core Library

## ライセンス

MIT License

このプロジェクトは[Lawtext](https://github.com/yamachig/lawtext) (© 2017-2025 yamachi) をベースにしています。

## クレジット

- オリジナルLawtextプロジェクト: [yamachig/lawtext](https://github.com/yamachig/lawtext)
- 適応: Kokohachi
- 対象組織: 武蔵高等学校中学校校友会
