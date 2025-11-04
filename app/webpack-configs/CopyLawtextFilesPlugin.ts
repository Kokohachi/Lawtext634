import webpack from "webpack";
import path from "path";
import fs from "fs";
import { ensureDirSync } from "fs-extra";

/**
 * Webpack plugin that copies all .law.txt files from sample_regulations/
 * to the build output directory's data/lawdata/ folder.
 * This ensures that law files are included in the deployment without manual intervention.
 */
export default class CopyLawtextFilesPlugin {
    public apply(compiler: webpack.Compiler): void {
        compiler.hooks.afterEmit.tapPromise("CopyLawtextFilesPlugin", async () => {
            try {
                const targetDir = path.join(compiler.outputPath, "data", "lawdata");
                ensureDirSync(targetDir);
                
                const rootDir = path.dirname(compiler.options.context || process.cwd());
                const sourceDir = path.resolve(rootDir, "sample_regulations");
                
                // Check if source directory exists
                if (!fs.existsSync(sourceDir)) {
                    console.warn(`Warning: Source directory ${sourceDir} does not exist. Skipping law file copy.`);
                    return;
                }
                
                // Copy all .law.txt files from sample_regulations to dist/data/lawdata
                const files = fs.readdirSync(sourceDir);
                let copiedCount = 0;
                
                for (const file of files) {
                    if (file.endsWith(".law.txt")) {
                        const sourcePath = path.join(sourceDir, file);
                        const targetPath = path.join(targetDir, file);
                        
                        try {
                            fs.copyFileSync(sourcePath, targetPath);
                            console.log(`Copied ${file} to ${targetDir}`);
                            copiedCount++;
                        } catch (error) {
                            console.error(`Error copying ${file}: ${error}`);
                        }
                    }
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
