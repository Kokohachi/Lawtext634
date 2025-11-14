import webpack from "webpack";
import path from "path";
import fs from "fs/promises";
import { ensureDirSync } from "fs-extra";
import { existsSync } from "fs";

/**
 * Webpack plugin that copies all .law.txt files from a source directory
 * to the build output directory's data/lawdata/ folder.
 * This ensures that law files are included in the deployment without manual intervention.
 */
export default class CopyLawtextFilesPlugin {
    private sourceDir: string;

    /**
     * @param sourceDir - Path to the directory containing .law.txt files (relative to project root)
     */
    constructor(sourceDir: string = "sample_regulations") {
        this.sourceDir = sourceDir;
    }

    public apply(compiler: webpack.Compiler): void {
        compiler.hooks.afterEmit.tapPromise("CopyLawtextFilesPlugin", async () => {
            try {
                const targetDir = path.join(compiler.outputPath, "data", "lawdata");
                const dataDir = path.join(compiler.outputPath, "data");
                ensureDirSync(targetDir);
                
                const rootDir = path.dirname(compiler.options.context || process.cwd());
                const sourceDir = path.resolve(rootDir, this.sourceDir);
                
                // Check if source directory exists
                if (!existsSync(sourceDir)) {
                    console.warn(`Warning: Source directory ${sourceDir} does not exist. Skipping law file copy.`);
                    return;
                }
                
                // Copy all .law.txt files from source to target
                const files = await fs.readdir(sourceDir);
                let copiedCount = 0;
                
                const copyPromises = files
                    .filter(file => file.endsWith(".law.txt"))
                    .map(async (file) => {
                        const sourcePath = path.join(sourceDir, file);
                        const targetPath = path.join(targetDir, file);
                        
                        try {
                            await fs.copyFile(sourcePath, targetPath);
                            console.log(`Copied ${file} to ${targetDir}`);
                            copiedCount++;
                        } catch (error) {
                            console.error(`Error copying ${file}: ${error}`);
                        }
                    });
                
                await Promise.all(copyPromises);
                
                // Also copy versions.json if it exists
                const versionsJsonPath = path.join(sourceDir, "versions.json");
                if (existsSync(versionsJsonPath)) {
                    const targetVersionsPath = path.join(dataDir, "versions.json");
                    await fs.copyFile(versionsJsonPath, targetVersionsPath);
                    console.log(`Copied versions.json to ${dataDir}`);
                }
                
                if (copiedCount === 0) {
                    console.warn(`Warning: No .law.txt files found in ${sourceDir}`);
                } else {
                    console.log(`Successfully copied ${copiedCount} law file(s)`);
                }
            } catch (error) {
                console.error(`Error in CopyLawtextFilesPlugin: ${error}`);
                // Don't fail the build, just log the error
            }
        });
    }
}
