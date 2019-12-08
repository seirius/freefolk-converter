import ffmpeg from "fluent-ffmpeg";
import { Readable, PassThrough } from "stream";
import { createReadStream, promises, WriteStream, ReadStream } from "fs";
import Axios from "axios";
import { join } from "path";
import { tmpdir } from "os";
import { WritableStream } from "memory-streams";

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
        const auxWrite = new PassThrough();
        console.log(0);
        await Converter.convert({
            file: file,
            format: "mp3",
            metadata,
            writeTo: auxWrite as any
        });
        console.log(0.5);
        if (!image && !url) {
            auxWrite.pipe(writeTo);
            return;
        }
        let imageStream: any;
        if (image) {
            imageStream = image;
        } else {
            imageStream = new PassThrough() as any;
            (await Axios({
                url: url,
                method: "GET",
                responseType: "stream"
            })).data.pipe(imageStream);
        }
        console.log(1);
        
        const tempPathFilename = join(tmpdir(), filename + ".mp3");
        const tempPathImage = join(tmpdir(), filename + "image");
        
        await promises.writeFile(tempPathImage, imageStream);
        console.log(2);
        
        const auxRead = new PassThrough();
        auxWrite.pipe(auxRead);
        console.log(3);
        await Converter.addImageToMp3({
            audio: auxRead,
            imagePath: tempPathImage,
            savePath: tempPathFilename
        });
        console.log(4);

        await Converter.pipeTempMp3AndRemove({
            tempFilename: tempPathFilename,
            writeTo
        });
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
            .on("finish", resolve)
            .on("error", reject);
        });
    }

    private static pipeTempMp3AndRemove({tempFilename, writeTo}: {
        tempFilename: string;
        writeTo: WriteStream;
    }): Promise<void> {
        return new Promise((resolve, reject) => {
            createReadStream(tempFilename)
            .pipe(writeTo)
            .on("finish", async () => {
                await promises.unlink(tempFilename);
                resolve(); 
            }).on("error", reject);
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
        image: Buffer;
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