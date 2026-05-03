import { UtilityContract } from '@app/contract'
import { Injectable } from '@nestjs/common'
import * as argon2 from 'argon2'
import { ValidationError } from 'class-validator'

@Injectable()
export class UtilityProvider implements UtilityContract {
	async hash(value: string): Promise<string> {
		return argon2.hash(value)
	}

	async verifyHash(hashed: string, value: string): Promise<boolean> {
		try {
			return await argon2.verify(hashed, value)
		} catch {
			return false
		}
	}

	formatErrorsHelper(errors: ValidationError[]): { message: string; errors: Record<string, string[]> } {
		const out: Record<string, string[]> = {}
		const flatten = (errs: ValidationError[]) => {
			for (const e of errs) {
				if (e.constraints) {
					out[e.property] = Object.values(e.constraints)
				}
				if (e.children?.length) flatten(e.children)
			}
		}
		flatten(errors)
		const first = Object.values(out)[0]?.[0]
		return { message: first || 'Validation failed', errors: out }
	}

	slugify(value: string): string {
		return value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.slice(0, 200)
	}
}
