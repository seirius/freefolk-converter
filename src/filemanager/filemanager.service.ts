import { Injectable } from "@nestjs/common";
import Axios from "axios";
import { resolve } from "url";
import { FileManagerConfig } from "./../config/FileManagerConfig";
import FormData from "form-data";
import { ReadStream } from "fs";

@Injectable()
export class FileManagerService {

    public async upload({
        file, id, tags, filename,
    }: IUploadArgs): Promise<void> {
        const formData = new FormData();
        formData.append("file", file, filename);
        formData.append("id", id);
        formData.append("tags", tags.join(","));
        await Axios.post(resolve(FileManagerConfig.HOST, "upload"), formData, {
            headers: formData.getHeaders()
        });
    }

}

export interface IUploadArgs {
    file: ReadStream;
    id: string;
    tags: string[];
    filename: string;
}