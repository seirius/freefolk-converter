import { Module } from "@nestjs/common";
import { ConverterService } from "./converter.service";
import { ConverterController } from "./converter.controller";
import { FileManagerModule } from "./../filemanager/filemanager.module";

@Module({
    imports: [FileManagerModule],
    providers: [ConverterService],
    controllers: [ConverterController]
})
export class ConverterModule {}