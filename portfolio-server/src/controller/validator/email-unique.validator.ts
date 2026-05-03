import { AppContract, DatabaseContract } from '@app/contract'
import { Inject } from '@nestjs/common'
import {
	ValidationOptions,
	ValidatorConstraint,
	ValidatorConstraintInterface,
	registerDecorator,
} from 'class-validator'

@ValidatorConstraint({ async: true })
export class IsEmailUniqueConstraint implements ValidatorConstraintInterface {
	constructor(@Inject(AppContract.DATABASE) private readonly database: DatabaseContract) {}

	async validate(value: any): Promise<boolean> {
		if (!value || typeof value !== 'string') return false
		const existing = await this.database.auth.findFirst({ where: { email: value, deleted: false } })
		return !existing
	}

	defaultMessage(): string {
		return 'Email is already in use.'
	}
}

export function IsEmailUnique(validationOptions?: ValidationOptions) {
	return (object: any, propertyName: string) => {
		registerDecorator({
			target: object.constructor,
			propertyName,
			options: validationOptions,
			constraints: [],
			validator: IsEmailUniqueConstraint,
		})
	}
}
