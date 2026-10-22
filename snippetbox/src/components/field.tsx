interface FieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  error?: string;
  defaultValue?: string;
}

export function Field({ label, name, type = "text", error, defaultValue }: FieldProps) {
  return (
    <div>
      <label htmlFor={name}>{label}:</label>
      {error && <label className="error">{error}</label>}
      <input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="error">{message}</div>;
}
