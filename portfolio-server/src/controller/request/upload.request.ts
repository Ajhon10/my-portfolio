import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'

export class UploadTokenRequest {
	@IsIn(['image', 'site-asset', 'certification', 'project-image'])
	kind: 'image' | 'site-asset' | 'certification' | 'project-image'

	@IsString() @MaxLength(255)
	filename: string

	@IsOptional() @IsUUID()
	projectId?: string
}

export class AttachBlobRequest {
	@IsString() @MaxLength(1500)
	url: string
}

export class SortImageRequest {
	@IsInt() @Min(0) @Max(10000)
	sortOrder: number
}
