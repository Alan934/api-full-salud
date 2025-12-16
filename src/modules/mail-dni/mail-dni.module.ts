import { Module, forwardRef } from '@nestjs/common';
import { MailDniController } from './mail-dni.controller';
import { MailDniService } from './mail-dni.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';


@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }), forwardRef(() => AuthModule)], // Load environment variables globally
    controllers: [MailDniController],
    providers: [MailDniService],
})
export class MailDniModule {}
