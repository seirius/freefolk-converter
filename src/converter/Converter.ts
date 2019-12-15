import ffmpeg from "fluent-ffmpeg";
import { Readable, PassThrough } from "stream";
import { createReadStream, promises, WriteStream, ReadStream, createWriteStream } from "fs";
import Axios from "axios";
import { join } from "path";
import { tmpdir } from "os";
import MemoryStream from "memory-stream";

export class Converter {

    public static convert({
        file, format, metadata, writeTo
    }: IConvertArgs): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const ff = ffmpeg().input(file);
            if (metadata) {
                Object.entries(metadata)
                .forEach(([key, value]) => ff.outputOptions("-metadata", `${key}=${value}`));
            }
            ff.toFormat(format)
            .pipe(writeTo)
            .on("error", reject)
            .on("finish", resolve);
        });
    }

    public static async convertMp4ToMp3({
        file, 
        image: {
            image,
            url
        }, metadata, filename, writeTo
    }: IConvertMp4ToMp3Args): Promise<void> {
        const tempPathFilename = join(tmpdir(), filename + ".mp3");
        const writeStream = new MemoryStream();
        await Converter.convert({
            file: file,
            format: "mp3",
            metadata,
            writeTo: writeStream as any
        });

        const tempPathImage = join(tmpdir(), filename + "image");

        await Converter.writeImage({image, url, path: tempPathImage});

        await Converter.addImageToMp3({
            audio: Converter.bufferToStream(writeStream.get()),
            imagePath: tempPathImage,
            savePath: tempPathFilename
        });
        await Converter.pipeTo({
            tempFilename: tempPathFilename,
            writeTo
        });
        await Converter.removeTempFiles(tempPathImage, tempPathFilename);
    }

    public static addImageToMp3({audio, imagePath, savePath}: IAddImageToMp3): Promise<void> {
        return new Promise((resolve, reject) => {
            ffmpeg(audio)
            .addInput(imagePath)
            .outputOptions([
                "-map", "0:0", "-map", "1:0",
                "-c", "copy", "-id3v2_version", "3"
            ])
            .save(savePath)
            .on("end", resolve)
            .on("error", reject);
        });
    }

    private static writeImage({image, url, path}: {
        image: ReadStream, 
        url: string, 
        path: string
    }): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const writeStreamImage = createWriteStream(path);
            if (image) {
                image.pipe(writeStreamImage);
                resolve();
            } else {
                (await Axios({
                    url: url,
                    method: "GET",
                    responseType: "stream"
                })).data.pipe(writeStreamImage);
                writeStreamImage
                .on("finish", resolve)
                .on("error", reject);
            }
        });
    }

    private static removeTempFiles(...args: string[]): Promise<any> {
        return Promise.all(args.map((path) => promises.unlink(path)));
    }

    private static pipeTo({tempFilename, writeTo}: {
        tempFilename: string;
        writeTo: WriteStream;
    }): Promise<void> {
        return new Promise((resolve, reject) => {
            createReadStream(tempFilename)
            .pipe(writeTo)
            .on("finish", resolve)
            .on("error", reject);
        });
    }

    public static bufferToStream(buffer: Buffer): Readable {
        const stream = new Readable();
        stream._read = () => {};
        stream.push(buffer);
        stream.push(null);
        return stream;
    }

}

export interface IConvertArgs {
    file: Readable;
    format: string;
    metadata?: Record<string, any>;
    writeTo: WriteStream;
}

export interface IConvertMp4ToMp3Args {
    file: ReadStream;
    image: {
        image: ReadStream;
        url: string;
    };
    metadata?: Record<string, any>;
    filename: string;
    writeTo: WriteStream;
}

export interface IAddImageToMp3 {
    audio: any;
    imagePath: string;
    savePath: string;
}