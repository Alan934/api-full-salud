import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelatedPerson } from '../../domain/entities/related-person.entity';
import { RelatedPersonService } from './related-person.service';
import { RelatedPersonController } from './related-person.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([RelatedPerson]), forwardRef(() => AuthModule)],
  controllers: [RelatedPersonController],
  providers: [RelatedPersonService]
})
export class RelatedPersonModule {}
