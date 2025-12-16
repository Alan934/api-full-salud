import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";


export class MailDniDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        example: 'Juan Pérez'
    })
    name: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        example: 'juanperez@gmail.com'
    })
    email: string;
}