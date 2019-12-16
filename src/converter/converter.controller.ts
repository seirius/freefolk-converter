import { Controller, Post, HttpCode, Response as nResponse, HttpStatus, UploadedFile, Body, HttpException, UseInterceptors, Logger, UploadedFiles } from "@nestjs/common";
import { ApiResponse, ApiConsumes, ApiOkResponse } from "@nestjs/swagger";
import { ConvertDto, ConvertResponseDto, ConvertAndDownloadDto, ConvertMp4Mp3AndDownloadDto, ConvertMp4Mp3Dto, ConvertMp4Mp3ResponseDto } from "./converter.dto";
import { FileInterceptor, FileFieldsInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { PassThrough } from "stream";
import { ConverterService, ConvertState } from "./converter.service";
import { basename } from "path";
import { FileManagerService } from "./../filemanager/filemanager.service";
import { lookup } from "mime-types";

@Controller()
export class ConverterController {

    private readonly logger = new Logger(ConverterController.name);

    constructor(
        private readonly converterService: ConverterService,
        private readonly fileManagerService: FileManagerService
    ) {
    }

    @Post("convert")
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor("file"))
    @ApiConsumes("multipart/form-data")
    @ApiOkResponse({
        description: "File converter",
        type: ConvertResponseDto
    })
    public async convert(
        @UploadedFile() file: any,
        @Body() {format, id, from, metadata, tags}: ConvertDto,
        @nResponse() response: Response
    ): Promise<void> {
        console.log(metadata, tags);
        const formattedTags = [];
        if (tags) {
            formattedTags.push(...tags.split(","));
        }

        let parsedMetadata = {};
        if (typeof metadata === "string") {
            parsedMetadata = JSON.parse(metadata);
        }
        
        if (!file) {
            throw new HttpException("No file was sent", HttpStatus.BAD_REQUEST);
        }
        if (!id) {
            throw new HttpException("ID not valid", HttpStatus.BAD_REQUEST);
        }
        if (!format || !from) {
            throw new HttpException("Format/From not valid", HttpStatus.BAD_REQUEST);
        }

        response.json({ok: true});
        try {
            const writeStream = new PassThrough();
            this.converterService.convert({
                file: this.converterService.bufferToStream(file.buffer),
                format,
                metadata: parsedMetadata,
                writeTo: writeStream as any
            }).catch((error) => this.logger.error(error));
            const readStream = new PassThrough();
            writeStream.pipe(readStream);

            const rawFilename = basename(file.originalname, `.${from}`);
            const filename = `${rawFilename}.${format}`;
            await this.fileManagerService.upload({
                file: readStream as any,
                filename: `${basename(file.originalname, `.${from}`)}.${format}`,
                id: `${id}:${format}`,
                tags: formattedTags
            });

            this.converterService.convertEvent({
                id: "custom_convert",
                filename, rawFilename, state: ConvertState.DONE
            });
        } catch (error) {
            this.logger.error(error);
        }
    }

    @Post("convert-and-download")
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor("file"))
    @ApiConsumes("multipart/form-data")
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Convert and download",
        content: {
            "audio/mp3": {
                schema: {
                    type: "string",
                    format: "binary"
                }
            }
        }
    })
    public async convertAndDownload(
        @UploadedFile() file: any,
        @Body() {format, from, metadata}: ConvertAndDownloadDto,
        @nResponse() response: Response
    ): Promise<void> {
        const parsedMetadata = JSON.parse(metadata);
        
        if (!file) {
            throw new HttpException("No file was sent", HttpStatus.BAD_REQUEST);
        }
        if (!format || !from) {
            throw new HttpException("Format/From not valid", HttpStatus.BAD_REQUEST);
        }

        const rawFilename = basename(file.originalname, `.${from}`);
        const filename = `${rawFilename}.${format}`;
        response.setHeader("Content-disposition", "attachment; filename=" + filename);
        response.setHeader("x-suggested-filename", filename);
        response.setHeader("content-type", lookup(filename) || "application/octet-stream");

        await this.converterService.convert({
            file: this.converterService.bufferToStream(file.buffer),
            format,
            metadata: parsedMetadata,
            writeTo: response as any
        });

        this.converterService.convertEvent({
            id: "custom_convert",
            filename, rawFilename, state: ConvertState.DONE
        });

        response.end(HttpStatus.OK);
    }

    @Post("convert-mp4-mp3-and-download")
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileFieldsInterceptor([
        { name: "file", maxCount: 1 },
        { name: "image", maxCount: 1 },
    ]))
    @ApiConsumes("multipart/form-data")
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Convert to mp3 and download",
        content: {
            "audio/mp3": {
                schema: {
                    type: "string",
                    format: "binary"
                }
            }
        }
    })
    public async convertMp4Mp3AndDownload(
        @UploadedFiles() files: any,
        @Body() {imageUrl, metadata}: ConvertMp4Mp3AndDownloadDto,
        @nResponse() response: Response
    ): Promise<void> {
        const parsedMetadata = JSON.parse(metadata);

        const {file: [file], image: filesImage} = files;
        const image = filesImage ? filesImage[0] : undefined;
        
        if (!file) {
            throw new HttpException("No file was sent", HttpStatus.BAD_REQUEST);
        }

        const rawFilename = basename(file.originalname, ".mp4");
        const fileStream = this.converterService.bufferToStream(file.buffer);
        const imageStream = image ? this.converterService.bufferToStream(image.buffer) : undefined;
        const filename = `${rawFilename}.mp3`;
        response.setHeader("Content-disposition", "attachment; filename=" + filename);
        response.setHeader("x-suggested-filename", filename);
        response.setHeader("content-type", lookup(filename) || "application/octet-stream");
        
        await this.converterService.convertMp4ToMp3({
            file: fileStream as any,
            filename: rawFilename,
            image: {
                image: imageStream as any,
                url: imageUrl
            },
            metadata: parsedMetadata,
            writeTo: response as any
        });

        this.converterService.convertEvent({
            id: "custom_convert",
            filename, rawFilename, state: ConvertState.DONE
        });

        response.end(HttpStatus.OK);
    }

    @Post("convert-mp3-mp4")
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileFieldsInterceptor([
        { name: "file", maxCount: 1 },
        { name: "image", maxCount: 1 },
    ]))
    @ApiConsumes("multipart/form-data")
    @ApiOkResponse({
        description: "File converter",
        type: ConvertMp4Mp3ResponseDto
    })
    public async convertMp4ToMp3(
        @UploadedFiles() files: any,
        @Body() {imageUrl, id, tags, metadata}: ConvertMp4Mp3Dto,
        @nResponse() response: Response
    ): Promise<void> {
        const newId = `${id}_mp3`;
        const parsedMetadata = JSON.parse(metadata);
        const parsedTags = tags.split(",");
        
        const {file: [file], image: filesImage} = files;
        const image = filesImage ? filesImage[0] : undefined;
        
        if (!file) {
            throw new HttpException("No file was sent", HttpStatus.BAD_REQUEST);
        }

        const rawFilename = basename(file.originalname, ".mp4");
        const fileStream = this.converterService.bufferToStream(file.buffer);
        const imageStream = image ? this.converterService.bufferToStream(image.buffer) : undefined;
        const filename = `${rawFilename}.mp3`;
        
        response.status(HttpStatus.OK).json({ok: true});
        try {
            const writeStream = new PassThrough();
            this.converterService.convertMp4ToMp3({
                file: fileStream as any,
                filename: rawFilename,
                image: {
                    image: imageStream as any,
                    url: imageUrl
                },
                metadata: parsedMetadata,
                writeTo: writeStream as any
            }).catch((error) => this.logger.error(error));
            const readStream = new PassThrough();
            writeStream.pipe(readStream);
            await this.fileManagerService.upload({
                file: readStream as any,
                filename,
                id: newId,
                tags: parsedTags
            });

            this.converterService.convertEvent({
                id: newId,
                filename, rawFilename, state: ConvertState.DONE
            });
        } catch (error) {
            this.logger.error(error);
        }
    }

}