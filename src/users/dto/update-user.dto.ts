import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    value === 'string' ? value.trim().toLowerCase() : value,
  )
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @Transform(({ value }: { value: unknown }) =>
    value === 'string' ? value.trim() : value,
  )
  username?: string;
}
