export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <label className="error">{message}</label>;
}

export function FormErrors({ messages }: { messages: string[] }) {
  return (
    <>
      {messages.map((message) => (
        <div className="error" key={message}>
          {message}
        </div>
      ))}
    </>
  );
}
