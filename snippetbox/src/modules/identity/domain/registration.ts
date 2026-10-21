import { Validator, minChars, notBlank } from "@/shared/kernel/validation";
import { isValidEmail } from "./email";

export const PASSWORD_MIN_LENGTH = 8;

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export const validateSignup = (input: SignupInput): Validator => {
  const validator = new Validator();
  validator.check(notBlank(input.name), "name", "This field cannot be blank");
  validator.check(notBlank(input.email), "email", "This field cannot be blank");
  validator.check(
    isValidEmail(input.email),
    "email",
    "This field must be a valid email address",
  );
  validator.check(
    notBlank(input.password),
    "password",
    "This field cannot be blank",
  );
  validator.check(
    minChars(input.password, PASSWORD_MIN_LENGTH),
    "password",
    "This field must be at least 8 characters long",
  );
  return validator;
};
