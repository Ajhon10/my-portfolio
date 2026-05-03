import { ValidationError } from 'class-validator'

export interface UtilityContract {
	hash(value: string): Promise<string>
	verifyHash(hashed: string, value: string): Promise<boolean>
	formatErrorsHelper(errors: ValidationError[]): { message: string; errors: Record<string, string[]> }
	slugify(value: string): string
}
