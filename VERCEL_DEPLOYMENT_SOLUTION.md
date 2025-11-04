# Solution: Automatic Law File Deployment to Vercel

## Problem
The original documentation instructed users to manually add `.law.txt` files to `app/dist-prod/data/lawdata/` **after** building the application. This approach is incompatible with Vercel's deployment process because:

1. Vercel runs `npm run build:prod` on their servers
2. The build output is deployed immediately
3. There's no opportunity for manual file placement after the build

Additionally, the system requires `list.json` or `all_law_list.csv` files for the search functionality to work, which also needed to be manually created.

## Solution
Created two webpack plugins that automatically handle law files and their metadata during the build process:

1. **CopyLawtextFilesPlugin** - Copies all `.law.txt` files from `sample_regulations/` to build output
2. **GenerateLawListPlugin** - Automatically generates `list.json` and `all_law_list.csv` from the law files

### Implementation Details

#### New File: `app/webpack-configs/CopyLawtextFilesPlugin.ts`
- Custom webpack plugin that runs after the build completes
- Copies all `.law.txt` files from `sample_regulations/` to `{output}/data/lawdata/`
- Includes error handling for missing source directory
- Provides informative console output during the build

#### New File: `app/webpack-configs/GenerateLawListPlugin.ts`
- Custom webpack plugin that generates metadata files for law search functionality
- Automatically creates `list.json` and `all_law_list.csv` from the law files
- Extracts title and law number from each law file
- **Respects manual files**: If manual `list.json` or `all_law_list.csv` exist in `data/` directory, they are copied instead of regenerating
- Generates both JSON and CSV formats for reference when creating manual lists

#### Modified Files:
1. **app/webpack-configs/client.ts** - Added both plugins to production builds
2. **app/webpack-configs/localClient.ts** - Added both plugins to local builds
3. **app/src/actions/download.ts** - Fixed TypeScript type error
4. **IMPLEMENTATION_REPORT.md** - Updated documentation
5. **README_JP.md** - Updated documentation

### How It Works

When `npm run build:prod` is executed (locally or on Vercel):

```
1. Webpack starts building the application
2. Files are transpiled and bundled
3. After build completes, plugins run:
   a. CopyLawtextFilesPlugin copies all .law.txt files to dist-prod/data/lawdata/
   b. GenerateLawListPlugin:
      - Checks if manual list.json/CSV exist in project data/ directory
      - If manual files exist, copies them to build output
      - If not, generates them automatically from the law files
4. Build output (including law files and metadata) is ready for deployment
```

### Deployment Flow on Vercel

```
Vercel Build Process:
├── Install dependencies (core & app)
├── Run: npm run build:prod
│   ├── Build localClient.ts (dist-prod-local)
│   │   ├── Copy law.txt files ✓
│   │   └── Generate/copy list files ✓
│   └── Build client.ts (dist-prod)
│       ├── Copy law.txt files ✓
│       └── Generate/copy list files ✓
└── Deploy: app/dist-prod/ (includes all files)
```

### Adding or Updating Law Files

To add new regulation files or update existing ones:

1. Place the `.law.txt` file in `sample_regulations/` directory
2. Run `npm run build:prod` (or deploy to Vercel)
3. Files are automatically copied to the build output
4. List files (list.json and CSV) are automatically generated from the law files

### Using Manual List Files

If you want to manually maintain the list files instead of auto-generating them:

1. Create a `data/` directory in the project root
2. Add your manual files:
   - `data/list.json` (JSON format with law metadata)
   - `data/lawdata/all_law_list.csv` (CSV format with law metadata)
3. Run the build - the plugin will detect and use your manual files instead of generating new ones

The build will output:
```
Manual list files found in project data/ directory. Skipping generation.
  - list.json: exists
  - lawdata/all_law_list.csv: exists
Copied manual list.json to build output
Copied manual all_law_list.csv to build output
```

### List File Formats

**list.json format:**
```json
{
  "header": ["LawID", "LawNum", "LawTitle", "Enforced", "Path", "XmlName", "ReferencingLawNums", "ReferencedLawNums"],
  "body": [
    ["law_id_1", "令和七年規約", "規約名", true, "law_id_1", "filename.law.txt", [], []]
  ]
}
```

**all_law_list.csv format:**
```csv
法令ID,法令番号,法令名,未施行,本文URL
law_id_1,令和七年規約,"規約名",,https://example.com/lawdata?lawid=law_id_1
```

### Verification

After building, you can verify the files are copied:

```bash
cd app
npm run build:prod

# Check dist-prod
ls -la dist-prod/data/lawdata/
ls -la dist-prod/data/list.json
ls -la dist-prod/data/lawdata/all_law_list.csv

# Check dist-prod-local  
ls -la dist-prod-local/data/lawdata/
ls -la dist-prod-local/data/list.json
ls -la dist-prod-local/data/lawdata/all_law_list.csv
```

Both directories should contain:
- All 12 `.law.txt` files from `sample_regulations/`
- Generated (or copied) `list.json` in the `data/` directory
- Generated (or copied) `all_law_list.csv` in the `data/lawdata/` directory

## Benefits

1. **Automatic**: No manual intervention required for both law files and metadata
2. **Vercel-Compatible**: Works with Vercel's automated build and deployment
3. **Maintainable**: Single source of truth in `sample_regulations/`
4. **Flexible**: Supports both auto-generated and manual list files
5. **Search-Enabled**: Generated list files enable search functionality in the app
4. **Error-Resistant**: Plugin includes error handling for edge cases
5. **Transparent**: Clear console output during build showing what was copied

## Testing

Tested with:
- ✅ Local production build (`npm run build:prod`)
- ✅ Local development build (both configs)
- ✅ Verified all 12 files copied correctly
- ✅ Verified directory structure matches expectations

## Security Considerations

- No new dependencies added
- Only copies files during build (no runtime operations)
- Source directory is under version control
- No external network access
- Files are static content with no executable code
