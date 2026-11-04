import { IsBoolean, IsInt, IsNotEmpty, IsString, Matches, MaxLength, Min } from 'class-validator'

export class GearRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string

  @IsString()
  @MaxLength(120)
  brand: string = ''

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  description: string

  @IsString()
  @MaxLength(1000)
  specifications: string = ''

  @IsString()
  @MaxLength(1000)
  @Matches(/^(|\/uploads\/[a-zA-Z0-9._-]+|https?:\/\/[^\s]+)$/)
  imageUrl: string = ''

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  altText: string

  @IsString()
  @MaxLength(1000)
  @Matches(/^(|https?:\/\/[^\s]+)$/)
  productUrl: string = ''

  @IsBoolean()
  featured: boolean = false

  @IsBoolean()
  published: boolean = false

  @IsInt()
  @Min(0)
  sortOrder: number = 0
}
