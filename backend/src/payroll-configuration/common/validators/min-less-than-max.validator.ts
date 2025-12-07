import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'minLessThanMax', async: false })
export class MinLessThanMax implements ValidatorConstraintInterface {
  validate(value: number, args: ValidationArguments) {
    const relatedPropertyName = args.constraints[0] as string;
    const relatedValue = (args.object as any)[relatedPropertyName];
    if (value === undefined || relatedValue === undefined) return true;
    return value < relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    const relatedPropertyName = args.constraints[0] as string;
    return `${args.property} must be less than ${relatedPropertyName}`;
  }
}
