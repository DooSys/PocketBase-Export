import JSZip from "jszip";

export async function toZip(filename: string, content: Buffer | string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(filename, content);

  return zip.generateAsync({
    compression: "DEFLATE",
    compressionOptions: {
      level: 6
    },
    type: "nodebuffer"
  });
}
