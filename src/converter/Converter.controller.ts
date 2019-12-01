import { Controller, Post } from "@overnightjs/core";
import { Request, Response } from "express";
import { Catch } from "../error/ErrorDeco";
import { OK, BAD_REQUEST } from "http-status-codes";
import { Converter } from "./Converter";
import { HttpError } from "../error/HttpError";
import { UploadedFile } from "express-fileupload";
import { Logger } from "@overnightjs/logger";
import { FileManager } from "../filemanager/FileManager";
import { basename } from "path";
import { lookup } from 'mime-types';

@Controller("")
export class ConverterController {

    /**
     * @swagger
     * /convert:
     *  post:
     *      tags:
     *          - convert
     *      consumes:
     *          - multipart/form-data
     *      parameters:
     *          - in: formData
     *            name: file
     *            type: file
     *            description: File to upload
     *            required: true
     *          - in: formData
     *            name: id
     *            type: string
     *            required: true
     *          - in: formData
     *            name: tags
     *            type: string
     *          - in: formData
     *            name: format
     *            type: string
     *            required: true
     *          - in: formData
     *            name: from
     *            type: string
     *            required: true
     *      responses:
     *          200:
     *              description: ok
     *              schema:
     *                  type: object
     *                  properties:
     *                      ok:
     *                          type: boolean
     *                          value: true
     */
    @Post("convert")
    @Catch
    public async convert(req: Request, res: Response): Promise<void> {
        const {format, id, from} = req.body;
        let {tags} = req.body;
        if (!tags) {
            tags = [];
        } else {
            tags = tags.split(",");
        }
        
        if (!req.files || !Object.keys(req.files).length) {
            throw new HttpError("No file was sent", BAD_REQUEST);
        }
        if (!id) {
            throw new HttpError("ID not valid", BAD_REQUEST);
        }
        if (!format || !from) {
            throw new HttpError("Format/From not valid", BAD_REQUEST);
        }

        const file = req.files.file as UploadedFile;
        const {writeStream, done} = Converter.convert({
            file: Converter.bufferToStream(file.data),
            format
        });
        done.catch((error) => Logger.Err(error, true));
        res.status(OK).json({ok: true});
        try {
            await FileManager.upload({
                file: writeStream as any,
                filename: `${basename(file.name, `.${from}`)}.${format}`,
                id: `${id}:${format}`, tags
            });
        } catch (error) {
            Logger.Err(error, true);
        }
    }

    /**
     * @swagger
     * /convert-and-download:
     *  post:
     *      tags:
     *          - convert
     *      consumes:
     *          - multipart/form-data
     *      parameters:
     *          - in: formData
     *            name: file
     *            type: file
     *            description: File to upload
     *            required: true
     *          - in: formData
     *            name: id
     *            type: string
     *            required: true
     *          - in: formData
     *            name: tags
     *            type: string
     *          - in: formData
     *            name: format
     *            type: string
     *            required: true
     *          - in: formData
     *            name: from
     *            type: string
     *            required: true
     *      responses:
     *          200:
     *              description: ok
     *              content:
     *                  video/mp4:
     *                      schema:
     *                          type: string
     *                          format: binary
     *                  video/mp3:
     *                      schema:
     *                          type: string
     *                          format: binary
     */
    @Post("convert-and-download")
    @Catch
    public async convertAndDownload(req: Request, res: Response): Promise<void> {
        const {format, id, from} = req.body;
        let {tags} = req.body;
        if (!tags) {
            tags = [];
        } else {
            tags = tags.split(",");
        }
        
        if (!req.files || !Object.keys(req.files).length) {
            throw new HttpError("No file was sent", BAD_REQUEST);
        }
        if (!id) {
            throw new HttpError("ID not valid", BAD_REQUEST);
        }
        if (!format || !from) {
            throw new HttpError("Format/From not valid", BAD_REQUEST);
        }

        const file = req.files.file as UploadedFile;
        const {writeStream, done} = Converter.convert({
            file: Converter.bufferToStream(file.data),
            format
        });

        const filename = `${basename(file.name, `.${from}`)}.${format}`;
        res.setHeader("Content-disposition", "attachment; filename=" + filename);
        res.setHeader("x-suggested-filename", filename);
        res.setHeader("content-type", lookup(filename) || "application/octet-stream");
        writeStream.pipe(res);
        await done;
        res.end(OK);
    }

}