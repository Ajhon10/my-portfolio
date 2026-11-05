export const MAX_PROJECT_IMAGE_BYTES = 8 * 1024 * 1024
export const MAX_PROJECT_VIDEO_BYTES = 32 * 1024 * 1024
export const MAX_PROJECT_MEDIA = 50
export const PROJECT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const PROJECT_VIDEO_TYPES = ['video/mp4', 'video/webm']
export function projectMediaType(url: string): 'image' | 'video' {
	return /\.(?:mp4|webm)(?:$|[?#])/i.test(url) ? 'video' : 'image'
}
