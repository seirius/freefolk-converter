import ffmpeg from "fluent-ffmpeg";
import { Readable, PassThrough } from "stream";
import { WriteStream } from "fs";

export class Converter {

    public static convert({
        file, format
    }: IConvertArgs): IConvertResponse {
        const write = new PassThrough();
        const promise = new Promise<void>((resolve, reject) => {
            ffmpeg({
                source: file
            })
            .toFormat(format)
            // .outputOptions("-metadata", `artist=seirius`)
            .writeToStream(write)
            .on("finish", resolve)
            .on("error", reject);
        });
        return {
            writeStream: write as any,
            done: promise
        }
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
}

export interface IConvertResponse {
    writeStream: WriteStream;
    done: Promise<void>;
}