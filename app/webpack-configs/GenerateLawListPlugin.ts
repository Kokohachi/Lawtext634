import webpack from "webpack";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

/**
 * Webpack plugin that generates list.json and all_law_list.csv files
 * from .law.txt files in the lawdata directory.
 * 
 * This plugin only generates files if manual files don't exist in the project root's data directory.
 * It generates both JSON and CSV formats for reference when creating manual lists.
 */
export default class GenerateLawListPlugin {
    public apply(compiler: webpack.Compiler): void {
        compiler.hooks.afterEmit.tapPromise("GenerateLawListPlugin", async () => {
            try {
                const dataDir = path.join(compiler.outputPath, "data");
                const lawdataDir = path.join(dataDir, "lawdata");
                const listJsonPath = path.join(dataDir, "list.json");
                const listCsvPath = path.join(lawdataDir, "all_law_list.csv");
                
                // Check for manual files in the project root's data directory
                // (not the build output, since that gets cleaned)
                const rootDir = path.dirname(compiler.options.context || process.cwd());
                const manualDataDir = path.join(rootDir, "data");
                const manualListJsonPath = path.join(manualDataDir, "list.json");
                const manualListCsvPath = path.join(manualDataDir, "lawdata", "all_law_list.csv");
                
                const jsonExists = existsSync(manualListJsonPath);
                const csvExists = existsSync(manualListCsvPath);
                
                if (jsonExists || csvExists) {
                    console.log("Manual list files found in project data/ directory. Skipping generation.");
                    console.log("  - list.json:", jsonExists ? "exists" : "not found");
                    console.log("  - lawdata/all_law_list.csv:", csvExists ? "exists" : "not found");
                    
                    // Copy manual files to build output if they exist
                    if (jsonExists) {
                        await fs.copyFile(manualListJsonPath, listJsonPath);
                        console.log(`Copied manual list.json to build output`);
                    }
                    if (csvExists) {
                        await fs.copyFile(manualListCsvPath, listCsvPath);
                        console.log(`Copied manual all_law_list.csv to build output`);
                    }
                    return;
                }
                
                // Check if lawdata directory exists
                if (!existsSync(lawdataDir)) {
                    console.warn(`Warning: lawdata directory ${lawdataDir} does not exist. Skipping list generation.`);
                    return;
                }
                
                // Read all .law.txt files
                const files = await fs.readdir(lawdataDir);
                const lawFiles = files.filter(file => file.endsWith(".law.txt"));
                
                if (lawFiles.length === 0) {
                    console.warn(`Warning: No .law.txt files found in ${lawdataDir}`);
                    return;
                }
                
                console.log(`Generating law list from ${lawFiles.length} .law.txt files...`);
                
                // Load versions.json to filter only current versions
                const versionsJsonPath = path.join(dataDir, "versions.json");
                let versionsData: any = null;
                if (existsSync(versionsJsonPath)) {
                    const versionsContent = await fs.readFile(versionsJsonPath, "utf-8");
                    versionsData = JSON.parse(versionsContent);
                    console.log(`Loaded versions.json with ${Object.keys(versionsData).length} regulation(s)`);
                }
                
                // Parse each law file to extract metadata
                const lawInfos = await Promise.all(
                    lawFiles.map(async (filename) => {
                        const filepath = path.join(lawdataDir, filename);
                        const content = await fs.readFile(filepath, "utf-8");
                        
                        // Parse the first few lines to extract title and law number
                        const lines = content.split("\n").filter(l => l.trim());
                        const title = lines[0]?.trim() || filename.replace(".law.txt", "");
                        
                        // Try to extract law number from second line (e.g., "（令和七年規約）")
                        let lawNum = "";
                        if (lines[1]) {
                            const match = lines[1].match(/[（(](.+?)[）)]/);
                            if (match) {
                                lawNum = match[1];
                            }
                        }
                        
                        // Generate a unique ID based on filename using base64-like encoding
                        // We need to create a valid ID that doesn't break the path parser
                        const base64UrlMap: Record<string, string> = { '+': '-', '/': '_', '=': '' };
                        const lawId = Buffer.from(filename.replace(".law.txt", ""))
                            .toString("base64")
                            .replace(/[+/=]/g, (c) => base64UrlMap[c] || c);
                        
                        return {
                            LawID: lawId,
                            LawNum: lawNum || lawId,
                            LawTitle: title,
                            Enforced: true,
                            Path: "",  // Empty path since files are directly in lawdata directory
                            XmlName: filename,
                            filename: filename,
                        };
                    })
                );
                
                // Filter to show only current versions if versions.json exists
                let filteredLawInfos = lawInfos;
                if (versionsData) {
                    filteredLawInfos = lawInfos.filter(info => {
                        // Extract base name by removing year/number info
                        const baseName = info.LawTitle.replace(/[（(]令和.+?[）)]/g, '').trim();
                        
                        // Check if this regulation has version info
                        const regulationVersions = versionsData[baseName];
                        if (regulationVersions && regulationVersions.versions) {
                            // Only include if this is the current version
                            const currentVersion = regulationVersions.versions.find((v: any) => v.status === 'current');
                            if (currentVersion) {
                                // Check if this file matches the current version
                                return info.filename === currentVersion.filename;
                            }
                        }
                        // If no version info exists, include the file (single version regulation)
                        return true;
                    });
                    console.log(`Filtered to ${filteredLawInfos.length} current version(s) from ${lawInfos.length} total files`);
                }
                
                // Sort by title for consistent ordering
                filteredLawInfos.sort((a, b) => a.LawTitle.localeCompare(b.LawTitle, "ja"));
                
                // Generate list.json
                const listJson = {
                    header: [
                        "LawID",
                        "LawNum",
                        "LawTitle",
                        "Enforced",
                        "Path",
                        "XmlName",
                        "ReferencingLawNums",
                        "ReferencedLawNums",
                    ],
                    body: filteredLawInfos.map(info => [
                        info.LawID,
                        info.LawNum,
                        info.LawTitle,
                        info.Enforced,
                        info.Path,
                        info.XmlName,
                        [], // ReferencingLawNums
                        [], // ReferencedLawNums
                    ]),
                };
                
                await fs.writeFile(listJsonPath, JSON.stringify(listJson, null, 2), "utf-8");
                console.log(`Generated ${listJsonPath}`);
                
                // Generate all_law_list.csv
                const csvHeader = "法令ID,法令番号,法令名,未施行,本文URL";
                const csvRows = filteredLawInfos.map(info => {
                    const fields = [
                        info.LawID,
                        info.LawNum,
                        `"${info.LawTitle.replace(/"/g, '""')}"`, // Escape quotes in title
                        info.Enforced ? "" : "未施行",
                        `https://example.com/lawdata?lawid=${info.Path}`,
                    ];
                    return fields.join(",");
                });
                
                const csvContent = [csvHeader, ...csvRows].join("\n");
                await fs.writeFile(listCsvPath, csvContent, "utf-8");
                console.log(`Generated ${listCsvPath}`);
                
                console.log(`Successfully generated law list with ${filteredLawInfos.length} entries`);
                
            } catch (error) {
                console.error(`Error in GenerateLawListPlugin: ${error}`);
                // Don't fail the build, just log the error
            }
        });
    }
}
