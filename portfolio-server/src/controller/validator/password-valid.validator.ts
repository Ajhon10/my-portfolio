import {
	ValidationArguments,
	ValidationOptions,
	ValidatorConstraint,
	ValidatorConstraintInterface,
	registerDecorator,
} from 'class-validator'

@ValidatorConstraint({ async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
	validate(value: any): boolean {
		if (!value || typeof value !== 'string') return false
		const hasLower = /[a-z]/.test(value)
		const hasUpper = /[A-Z]/.test(value)
		const hasDigit = /[0-9]/.test(value)
		return value.length >= 8 && hasLower && hasUpper && hasDigit
	}

	defaultMessage(_args: ValidationArguments): string {
		return 'Password must be at least 8 characters and include upper, lower, and number.'
	}
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
	return (object: any, propertyName: string) => {
		registerDecorator({
			target: object.constructor,
			propertyName,
			options: validationOptions,
			constraints: [],
			validator: IsStrongPasswordConstraint,
		})
	}
}
