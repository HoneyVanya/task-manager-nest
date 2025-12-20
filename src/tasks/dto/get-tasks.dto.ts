import { IsOptional, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class GetTasksFilterDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit: number = 10;
}
