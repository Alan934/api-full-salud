import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ShortBaseDto } from '../../../common/dtos';
import { SerializerShortPractitionerRoleDto } from '..';

export class SerializerPractitionerDtoShort extends ShortBaseDto {
    @Expose()
    @ApiProperty({ example: 'Practitioner' })
    resourceType?: string = 'Practitioner';

    @Expose()
    @ApiProperty({ example: '123456-M-BA' })
    license: string;

    @Expose()
    @ApiProperty({ example: false })
    homeService: boolean;

    @Expose()
    @ApiProperty({ example: 30 })
    durationAppointment?: number;

    @Expose()
    @ApiProperty({ example: false })
    acceptedSocialWorks: boolean;

    @Expose()
    @ApiProperty({ example: '39382009' })
    dni: string;

    @Expose()
    @Type(() => SerializerShortPractitionerRoleDto)
    practitionerRole: SerializerShortPractitionerRoleDto[];
}
