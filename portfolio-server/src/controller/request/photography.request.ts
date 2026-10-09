import { IsBoolean, IsInt, IsNotEmpty, IsString, Matches, MaxLength, Min } from 'class-validator'
export class PhotographRequest {
  @IsString() @IsNotEmpty() @MaxLength(200) title: string
  @IsString() @IsNotEmpty() @MaxLength(500) altText: string
  @IsString() @MaxLength(3000) caption: string = ''
  @IsString() @MaxLength(200) location: string = ''
  @IsString() @IsNotEmpty() @MaxLength(100) category: string = 'Personal'
  @IsString() @MaxLength(1000) @Matches(/^(\/uploads\/[a-zA-Z0-9._-]+|https?:\/\/[^\s]+)$/) imageUrl: string
  @IsBoolean() published: boolean = false
  @IsInt() @Min(0) sortOrder: number = 0
}
