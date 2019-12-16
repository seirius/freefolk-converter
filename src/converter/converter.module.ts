import { Module } from "@nestjs/common";
import { ConverterService } from "./converter.service";
import { ConverterController } from "./converter.controller";
import { FileManagerModule } from "./../filemanager/filemanager.module";
import { MqttModule } from "nest-mqtt-client";

@Module({
    imports: [FileManagerModule, MqttModule],
    providers: [ConverterService],
    controllers: [ConverterController]
})
export class ConverterModule {}