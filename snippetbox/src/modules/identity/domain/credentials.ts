import { Validator, notBlank } from "@/shared/kernel/validation";
import { isValidEmail } from "./email";

export interface LoginInput {
  email: string;
  password: string;
}

export const validateLogin = (input: LoginInput): Validator => {
  const validator = new Validator();
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
  return validator;
};
