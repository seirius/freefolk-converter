import { Injectable } from "@nestjs/common";
import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";
import { WriteStream, ReadStream, createWriteStream, promises, createReadStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import MemoryStream from "memory-stream";
import Axios from "axios";

@Injectable()
export class ConverterService {

    public convert({
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

    public async convertMp4ToMp3({
        file, 
        image: {
            image,
            url
        }, metadata, filename, writeTo
    }: IConvertMp4ToMp3Args): Promise<void> {
        const tempPathFilename = join(tmpdir(), filename + ".mp3");
        const writeStream = new MemoryStream();
        await this.convert({
            file: file,
            format: "mp3",
            metadata,
            writeTo: writeStream as any
        });

        const tempPathImage = join(tmpdir(), filename + "image");

        await this.writeImage({image, url, path: tempPathImage});

        await this.addImageToMp3({
            audio: this.bufferToStream(writeStream.get()),
            imagePath: tempPathImage,
            savePath: tempPathFilename
        });
        await this.pipeTo({
            tempFilename: tempPathFilename,
            writeTo
        });
        await this.removeTempFiles(tempPathImage, tempPathFilename);
    }

    public addImageToMp3({audio, imagePath, savePath}: IAddImageToMp3): Promise<void> {
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

    private writeImage({image, url, path}: {
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

    private removeTempFiles(...args: string[]): Promise<any> {
        return Promise.all(args.map((path) => promises.unlink(path)));
    }

    private pipeTo({tempFilename, writeTo}: {
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

    public bufferToStream(buffer: Buffer): Readable {
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