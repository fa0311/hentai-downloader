// import yazl from "yazl";

// export const createCbz = async (
// 	files: {
// 		name: string;
// 	}[],
// ) => {
// 	const zip = new yazl.ZipFile();

// 	for (let i = 0; i < fileMap.length; i++) {
// 		const file = fileMap[i];
// 		zip.addFile(file.original, file.sorted, { compress: false });
// 	}

// 	zip.addBuffer(Buffer.from(comigInfoXml, "utf8"), "ComicInfo.xml", {
// 		compress: true,
// 	});
// 	zip.end();
// 	return zip.outputStream;
// };
