import fs from "fs";
import path from "path";

export class FileManager {
  static outerDirName = "tmp";
  static dirName = `${FileManager.outerDirName}/tmp_files`;

  static dir = path.join(process.cwd(), FileManager.dirName);

  static setDirName(name: string) {
    FileManager.dirName = `${FileManager.outerDirName}/${name}`;
    FileManager.dir = path.join(process.cwd(), FileManager.dirName);
  }

  static cleanupFiles(files: File[]) {
    try {
      for (const file of files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }

      if (fs.existsSync(FileManager.dir)) {
        if (fs.readdirSync(FileManager.dir).length === 0) {
          fs.rmdirSync(FileManager.dir);
        } else {
          const subdirs = fs.readdirSync(FileManager.dir);
          for (const subdir of subdirs) {
            const subdirPath = path.join(FileManager.dir, subdir);
            if (
              fs.lstatSync(subdirPath).isDirectory() &&
              fs.readdirSync(subdirPath).length === 0
            ) {
              fs.rmdirSync(subdirPath);
            }
          }

          if (fs.readdirSync(FileManager.dir).length === 0) {
            fs.rmdirSync(FileManager.dir);
          }
        }
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  static fileExists(noteName: string) {
    const filePath = path.join(FileManager.dir, noteName);
    console.log("Checking file existence:", filePath);
    return fs.existsSync(filePath);
  }

  static createFile(name: string): File {
    const tempFile = new File(name, true);

    try {
      if (!fs.existsSync(tempFile.basePath)) {
        fs.mkdirSync(tempFile.basePath, { recursive: true });
      }
    } catch (error) {
      console.error("Error creating directory:", error);
    }

    return tempFile;
  }
}

class File {
  public baseName: string;
  public extension: string;
  public basePath: string;
  public path: string;
  public isTmp: boolean;

  constructor(fileName: string, tmp: boolean = false) {
    this.isTmp = tmp;

    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);

    const fileBasePath = (() => {
      if (!this.isTmp) {
        return path.join(FileManager.dir, Date.now().toString());
      } else {
        return path.join(FileManager.dir);
      }
    })();

    const filePath = path.join(fileBasePath, fileName);
    if (!fs.existsSync(fileBasePath)) {
      fs.mkdirSync(fileBasePath, { recursive: true });
    }

    this.baseName = baseName;
    this.extension = extension;
    this.basePath = fileBasePath;
    this.path = filePath;
  }

  writeFile(data: string | NodeJS.ArrayBufferView) {
    try {
      fs.writeFileSync(this.path, data);
    } catch (error) {
      console.error("Error writing file:", error);
    }
  }

  readFile() {
    try {
      return fs.readFileSync(this.path);
    } catch (error) {
      console.error("Error reading file:", error);
      throw error;
    }
  }
}
