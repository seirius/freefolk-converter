import { UploadedFile } from "express-fileupload";
import ffmpeg from "fluent-ffmpeg";
import { Readable, PassThrough } from "stream";
import { WriteStream } from "fs";

export class Converter {

    public static async convert({
        file, format
    }: IConvertArgs): Promise<WriteStream> {
        const write = new PassThrough();
        ffmpeg({
            source: file
        })
        .toFormat(format)
        .writeToStream(write);
        return write as any;
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