import { FileSearch } from "lucide-react";

type Props = {
  message: string;
};

export function EmptyReportState({ message }: Props) {
  return (
    <div className="border rounded-lg p-8 text-center bg-gray-50">
      <FileSearch className="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}