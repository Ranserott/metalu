type Props = {
  message: string;
  hint?: string;
};

export function EmptyReportState({ message, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
      <p className="text-sm font-medium text-gray-700">{message}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}