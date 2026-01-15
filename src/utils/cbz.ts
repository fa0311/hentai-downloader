import path from "node:path";
import yazl from "yazl";

export const createCbz = async (
	files: {
		name: string;
	}[],
	downloadDir: string,
	comigInfoXml: string,
) => {
	const fileMap = files
		.map((file, index) => {
			const ext = path.extname(file.name).toLowerCase() || ".jpg";

			if (ext === ".mp4" || ext === ".mp3") {
				return null;
			}

			const filenameInCbz = `${String(index + 1).padStart(String(files.length).length, "0")}${ext}`;
			return {
				original: path.join(downloadDir, file.name),
				sorted: filenameInCbz,
				ext: ext,
			};
		})
		.filter((v): v is { original: string; sorted: string; ext: string } => v !== null)
		.sort((a, b) => (a.sorted < b.sorted ? -1 : 1));

	const zip = new yazl.ZipFile();

	for (let i = 0; i < fileMap.length; i++) {
		const file = fileMap[i];
		zip.addFile(file.original, file.sorted, { compress: false });
	}

	zip.addBuffer(Buffer.from(comigInfoXml, "utf8"), "ComicInfo.xml", {
		compress: true,
	});
	zip.end();
	return zip.outputStream;
};
