export interface FormState {
  errors: Record<string, string>;
  formError?: string;
  values: Record<string, string>;
}

export const initialFormState: FormState = { errors: {}, values: {} };
