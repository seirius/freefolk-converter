import { Module } from '@nestjs/common';
import { DefaultModule } from './default/default.module';
import { ConverterModule } from './converter/converter.module';

@Module({
    imports: [DefaultModule, ConverterModule],
    controllers: [],
    providers: [],
})
export class AppModule { }
