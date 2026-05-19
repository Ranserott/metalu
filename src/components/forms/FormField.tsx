import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormEvent } from "react";

type FormFieldProps = {
  label: string;
  type?: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function FormField({ label, type = "text", error, className, ...props }: FormFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={props.id}>{label}</Label>
      <Input type={type} {...props} />
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}