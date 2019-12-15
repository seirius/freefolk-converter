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
import { PassThrough } from "stream";

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
     *          - in: formaData
     *            name: metadata
     *            type: string
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
        const {format, id, from, metadata} = req.body;
        let {tags} = req.body;
        if (!tags) {
            tags = [];
        } else {
            tags = tags.split(",");
        }

        let parsedMetadata = {};
        if (typeof metadata === "string") {
            parsedMetadata = JSON.parse(metadata);
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

        res.status(OK).json({ok: true});
        try {
            const file = req.files.file as UploadedFile;
            const writeStream = new PassThrough();
            Converter.convert({
                file: Converter.bufferToStream(file.data),
                format,
                metadata: parsedMetadata,
                writeTo: writeStream as any
            }).catch((error) => Logger.Err(error, true));
            const readStream = new PassThrough();
            writeStream.pipe(readStream);
            await FileManager.upload({
                file: readStream as any,
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
     *            name: format
     *            type: string
     *            required: true
     *          - in: formData
     *            name: from
     *            type: string
     *            required: true
     *          - in: formData
     *            name: metadata
     *            type: string
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
        const {format, from, metadata} = req.body;

        let parsedMetadata = {};
        if (typeof metadata === "string") {
            parsedMetadata = JSON.parse(metadata);
        }
        
        if (!req.files || !Object.keys(req.files).length) {
            throw new HttpError("No file was sent", BAD_REQUEST);
        }
        if (!format || !from) {
            throw new HttpError("Format/From not valid", BAD_REQUEST);
        }

        const file = req.files.file as UploadedFile;
        const filename = `${basename(file.name, `.${from}`)}.${format}`;
        res.setHeader("Content-disposition", "attachment; filename=" + filename);
        res.setHeader("x-suggested-filename", filename);
        res.setHeader("content-type", lookup(filename) || "application/octet-stream");

        await Converter.convert({
            file: Converter.bufferToStream(file.data),
            format,
            metadata: parsedMetadata,
            writeTo: res as any
        });

        res.end(OK);
    }

    /**
     * @swagger
     * /convert-mp4-mp3-and-download:
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
     *            name: image
     *            type: file
     *            description: Cover as file
     *          - in: formData
     *            name: imageUrl
     *            type: string
     *          - in: formData
     *            name: metadata
     *            type: string
     *      responses:
     *          200:
     *              description: ok
     *              content:
     *                  video/mp3:
     *                      schema:
     *                          type: string
     *                          format: binary
     */
    @Post("convert-mp4-mp3-and-download")
    @Catch
    public async convertMp4Mp3AndDownload(req: Request, res: Response): Promise<void> {
        const {metadata, imageUrl} = req.body;

        let parsedMetadata = {};
        if (typeof metadata === "string") {
            parsedMetadata = JSON.parse(metadata);
        }
        
        if (!req.files || !Object.keys(req.files).length) {
            throw new HttpError("No file was sent", BAD_REQUEST);
        }

        const {file, image}: {file: UploadedFile, image: UploadedFile} = req.files as any;
        const rawFilename = basename(file.name, ".mp4");
        const fileStream = Converter.bufferToStream(file.data);
        const imageStream = Converter.bufferToStream(image.data);
        const filename = `${rawFilename}.mp3`;
        res.setHeader("Content-disposition", "attachment; filename=" + filename);
        res.setHeader("x-suggested-filename", filename);
        res.setHeader("content-type", lookup(filename) || "application/octet-stream");
        
        await Converter.convertMp4ToMp3({
            file: fileStream as any,
            filename: rawFilename,
            image: {
                image: imageStream as any,
                url: imageUrl
            },
            metadata: parsedMetadata,
            writeTo: res as any
        });

        res.end(OK);
    }

    /**
     * @swagger
     * /convert-mp3-mp4:
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
     *            name: image
     *            type: file
     *            description: Cover as file
     *          - in: formData
     *            name: imageUrl
     *            type: string
     *          - in: formData
     *            name: id
     *            type: string
     *            required: true
     *          - in: formData
     *            name: tags
     *            type: string
     *          - in: formaData
     *            name: metadata
     *            type: string
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
    @Post("convert-mp3-mp4")
    @Catch
    public async convertMp4ToMp3(req: Request, res: Response): Promise<void> {
        const {id, metadata, imageUrl} = req.body;
        let parsedMetadata = {};
        if (typeof metadata === "string") {
            parsedMetadata = JSON.parse(metadata);
        }

        let {tags} = req.body;
        if (!tags) {
            tags = [];
        } else {
            tags = tags.split(",");
        }
        
        if (!req.files || !Object.keys(req.files).length) {
            throw new HttpError("No file was sent", BAD_REQUEST);
        }

        const {file, image}: {file: UploadedFile, image: UploadedFile} = req.files as any;
        const rawFilename = basename(file.name, ".mp4");
        const fileStream = Converter.bufferToStream(file.data);
        const imageStream = image ? Converter.bufferToStream(image.data) : undefined;
        const filename = `${rawFilename}.mp3`;
        
        res.status(OK).json({ok: true});
        try {
            const writeStream = new PassThrough();
            Converter.convertMp4ToMp3({
                file: fileStream as any,
                filename: rawFilename,
                image: {
                    image: imageStream as any,
                    url: imageUrl
                },
                metadata: parsedMetadata,
                writeTo: writeStream as any
            }).catch((error) => Logger.Err(error, true));
            const readStream = new PassThrough();
            writeStream.pipe(readStream);
            await FileManager.upload({
                file: readStream as any,
                filename,
                id: `${id}_mp3`, tags
            });
        } catch (error) {
            Logger.Err(error, true);
        }
    }

}