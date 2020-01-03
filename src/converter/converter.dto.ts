import { ApiProperty } from "@nestjs/swagger";

export class ConvertDto {
    @ApiProperty()
    format: string;

    @ApiProperty()
    id: string;

    @ApiProperty()
    from: string;

    @ApiProperty({ required: false })
    metadata?: string;

    @ApiProperty({ required: false })
    tags?: string;

    @ApiProperty({
        type: "string",
        format: "binary"
    })
    file: any;
}

export class ConvertResponseDto {
    @ApiProperty()
    ok: boolean;
}

export class ConvertAndDownloadDto {
    @ApiProperty()
    format: string;

    @ApiProperty()
    from: string;

    @ApiProperty({ required: false })
    metadata?: string;

    @ApiProperty({
        type: "string",
        format: "binary"
    })
    file: any;
}

export class ConvertMp4Mp3AndDownloadDto {
    @ApiProperty({
        type: "string",
        format: "binary"
    })
    file: any;

    @ApiProperty({
        type: "string",
        format: "binary",
        required: false
    })
    image?: any;

    @ApiProperty({ required: false })
    imageUrl?: string;

    @ApiProperty({ required: false })
    metadata?: string;
}

export class ConvertMp4Mp3Dto {
    @ApiProperty({
        type: "string",
        format: "binary"
    })
    file: any;

    @ApiProperty({
        type: "string",
        format: "binary",
        required: false
    })
    image?: any;

    @ApiProperty()
    id: string;

    @ApiProperty({ required: false })
    imageUrl?: string;

    @ApiProperty({ required: false })
    metadata?: string;

    @ApiProperty({ required: false })
    tags?: string;
}

export class ConvertMp4Mp3ResponseDto {
    @ApiProperty()
    ok: boolean;
}